"use server";

import { revalidatePath } from "next/cache";
import { createAssignment, loadAssignPeople, loadTeams, revokeRecipient } from "@/lib/company/assign-data";
import { planAssignment, readAssignForm, sameRecipients, todayIst, type AssignPlan, type AssignScope } from "@/lib/company/assign-rules";
import { logCompany } from "@/lib/company/audit";
import { assignerFor } from "@/lib/company/auth";
import type { CompanyMember } from "@/lib/company/access";
import { db, type Db } from "@/lib/db/client";
import { normaliseEmail } from "@/lib/email";
import { SD_COURSE } from "@/lib/sd-offer";

/** What the assign form sends. */
export interface AssignFormInput {
  requirement: string;
  dueOn: string;
  targetKind: string;
  emails: string[];
  teamId: string;
}

export interface AssignPreview {
  recipients: { email: string; name: string | null }[];
  alreadyAssigned: { email: string; name: string | null }[];
  ownAccess: { email: string; name: string | null }[];
  label: string;
  requirement: "required" | "recommended";
  dueOn: string | null;
  owner: string;
  today: string;
  /** Active members and seats in the company; people with the course now, and after this. */
  members: number;
  seats: number;
  assignedNow: number;
}

export type PreviewResult = { ok: true; preview: AssignPreview } | { ok: false; message: string };
export type ConfirmResult = { ok: true; message: string } | { ok: false; message: string; preview?: AssignPreview };

const NOT_ALLOWED = { ok: false as const, message: "Only your company's admin, or a team lead for their team, can do this. Try signing in again." };
const UNAVAILABLE = { ok: false as const, message: "That didn't work just now. Try again in a minute." };

function refresh(slug: string) {
  revalidatePath(`/org/${slug}/learning`);
  revalidatePath(`/org/${slug}`);
}

/** The plan for this form, read fresh from the database, as the preview shows it. */
async function plan(sql: Db, member: CompanyMember, scope: AssignScope, input: AssignFormInput): Promise<{ ok: true; preview: AssignPreview; plan: AssignPlan; form: ReturnType<typeof readAssignForm> & { ok: true } } | { ok: false; message: string }> {
  const form = readAssignForm(input);
  if (!form.ok) return form;
  const [people, teams, seats] = await Promise.all([
    loadAssignPeople(sql, member.companyId, SD_COURSE),
    loadTeams(sql, member.companyId),
    sql.scalar<number>`select seat_count from course.companies where id = ${member.companyId}::uuid`,
  ]);
  if (!people || !teams || seats.error || seats.data === null) return UNAVAILABLE;
  const planned = planAssignment(people, teams, form.value.target, scope);
  if (!planned.ok) return planned;
  const pick = (list: { email: string; name: string | null }[]) => list.map(({ email, name }) => ({ email, name }));
  return {
    ok: true,
    form,
    plan: planned.value,
    preview: {
      recipients: pick(planned.value.recipients),
      alreadyAssigned: pick(planned.value.alreadyAssigned),
      ownAccess: pick(planned.value.ownAccess),
      label: planned.value.label,
      requirement: form.value.requirement,
      dueOn: form.value.dueOn,
      owner: member.email,
      today: todayIst(),
      members: people.length,
      seats: seats.data,
      assignedNow: people.filter((p) => p.assigned).length,
    },
  };
}

/** Step one: who this would reach, and who is left out, before anything is written. */
export async function previewAssignment(slug: string, input: AssignFormInput): Promise<PreviewResult> {
  const who = await assignerFor(slug);
  if (!who) return NOT_ALLOWED;
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const p = await plan(sql, who.member, who.scope, input);
  if (!p.ok) return p;
  if (!p.preview.recipients.length) return { ok: false, message: "Everyone you chose already has the course. Nothing to assign." };
  return { ok: true, preview: p.preview };
}

/**
 * Step two: writes the assignment, only for exactly the people the preview
 * showed. If that has changed meanwhile, nothing is written and the new
 * preview comes back. `requestKey` is made once per preview, so a retried
 * submit lands once. The audit entry records the count, never the list.
 */
export async function confirmAssignment(slug: string, input: AssignFormInput, expected: string[], requestKey: string): Promise<ConfirmResult> {
  const who = await assignerFor(slug);
  if (!who) return NOT_ALLOWED;
  if (!/^[0-9a-f-]{36}$/i.test(requestKey) || !Array.isArray(expected)) return UNAVAILABLE;
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const p = await plan(sql, who.member, who.scope, input);
  if (!p.ok) return p;
  const emails = p.plan.recipients.map((r) => r.email);
  if (!sameRecipients(emails, expected)) {
    return { ok: false, message: "Who this reaches has changed since your preview. Check the new list, then assign.", preview: p.preview };
  }

  const out = await createAssignment(sql, {
    companyId: who.member.companyId,
    course: SD_COURSE,
    requirement: p.form.value.requirement,
    dueOn: p.form.value.dueOn,
    targetKind: p.form.value.target.kind,
    teamId: p.plan.teamId,
    label: p.plan.label,
    requestKey,
    by: who.member.email,
    emails,
    scopeTeamId: who.scope.kind === "team" ? who.scope.teamId : null,
  });
  if (!out) return UNAVAILABLE;
  if (out.status === "repeat") return { ok: true, message: "Already assigned. Nothing more to do." };
  if (out.status === "changed") {
    const again = await plan(sql, who.member, who.scope, input);
    return { ok: false, message: "Someone's course changed while you were assigning. Nothing was saved. Check the new list, then assign.", preview: again.ok ? again.preview : undefined };
  }
  await logCompany(who.member, "company.assignment_create", {
    course: SD_COURSE,
    requirement: p.form.value.requirement,
    due_on: p.form.value.dueOn,
    target: p.form.value.target.kind,
    people: out.added,
  });
  refresh(slug);
  const n = out.added;
  return { ok: true, message: `System Design assigned to ${n} ${n === 1 ? "person" : "people"}. They open it by signing in to the course with Google, using their work email.` };
}

/** Takes the course back from one person. What they did is kept. A lead can only do this for their own team. */
export async function removeAssignment(slug: string, rawEmail: string): Promise<ConfirmResult> {
  const who = await assignerFor(slug);
  if (!who) return NOT_ALLOWED;
  const email = normaliseEmail(rawEmail);
  if (!email) return { ok: false, message: "That person isn't in your company." };
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const changed = await revokeRecipient(sql, who.member.companyId, email, SD_COURSE, who.member.email, who.scope.kind === "team" ? who.scope.teamId : null);
  if (changed === null) return UNAVAILABLE;
  if (!changed) return { ok: false, message: `${email} doesn't have the course assigned${who.scope.kind === "team" ? " on your team" : ""}.` };
  await logCompany(who.member, "company.course_unassign", { email, course: SD_COURSE });
  refresh(slug);
  return { ok: true, message: `Removed from ${email}. They can no longer open the course; what they did is kept.` };
}
