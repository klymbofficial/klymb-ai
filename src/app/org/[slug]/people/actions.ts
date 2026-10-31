"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { hrFor } from "@/lib/company/auth";
import { sendCompanyInvite } from "@/lib/company/invite";
import { MAX_CSV_BYTES, planAdd, readPeopleCsv, removeBlocked, tidyName, type AddRole, type PlannedPerson, type RowError } from "@/lib/company/people";
import { activeHrCount, insertPeople, loadAddContext, loadPerson, removePersonRow } from "@/lib/company/people-data";
import { db } from "@/lib/db/client";
import { normaliseEmail } from "@/lib/email";

export type PeopleResult =
  | { ok: true; message: string }
  | { ok: false; message: string; errors?: RowError[] };

const NOT_ALLOWED: PeopleResult = { ok: false, message: "Only your company's HR can do this. Try signing in again." };
const UNAVAILABLE: PeopleResult = { ok: false, message: "That didn't work just now. Please try again in a minute." };

/** Plans, then adds everyone in one statement, then emails them after the response. */
async function addPlanned(slug: string, people: Parameters<typeof planAdd>[0]): Promise<PeopleResult> {
  const hr = await hrFor(slug);
  if (!hr) return NOT_ALLOWED;
  const sql = db();
  if (!sql) return UNAVAILABLE;

  const emails = people.map((p) => normaliseEmail(p.email)).filter((e): e is string => e !== null);
  const ctx = await loadAddContext(sql, hr.companyId, emails);
  if (!ctx) return UNAVAILABLE;
  const plan = planAdd(people, ctx);
  if (!plan.ok) {
    return {
      ok: false,
      message: people.length === 1 ? plan.errors[0].message : `Nobody was added. Fix ${plan.errors.length === 1 ? "this problem" : `these ${plan.errors.length} problems`} and upload the file again.`,
      errors: people.length === 1 ? undefined : plan.errors,
    };
  }

  const added = await insertPeople(sql, hr.companyId, plan.add);
  if (added === null) return UNAVAILABLE;
  if (added !== plan.add.length) {
    // The guard inside the insert said no: something changed since planning.
    return { ok: false, message: "Nobody was added: seats or people changed meanwhile. Reload the page and try again." };
  }

  invite(plan.add, hr.companyName);
  revalidatePath(`/org/${slug}/people`);
  revalidatePath(`/org/${slug}/teams`);
  const back = plan.add.filter((p) => p.returning).length;
  return {
    ok: true,
    message: added === 1
      ? `${plan.add[0].email} ${back ? "is back in" : "was added to"} your company and will get an email with how to sign in.`
      : `${added} people were added${back ? ` (${back} of them returning)` : ""}. Each will get an email with how to sign in.`,
  };
}

/** Invites go out after the response, so a big upload doesn't wait on the mailer. */
function invite(people: PlannedPerson[], companyName: string) {
  after(async () => {
    for (const p of people) await sendCompanyInvite({ email: p.email, name: p.name, companyName, role: p.role });
  });
}

/** 1.8: one person, as an employee or another HR person. */
export async function addPerson(slug: string, form: { email: string; name: string; team: string; role: string }): Promise<PeopleResult> {
  const role: AddRole = form.role === "hr" ? "hr" : "employee";
  return addPlanned(slug, [{ line: 1, email: form.email.trim(), name: tidyName(form.name), team: form.team.trim() || null, role }]);
}

/** 1.8: a CSV of email, name, team. All or nothing, with every problem listed by line. */
export async function uploadPeople(slug: string, formData: FormData): Promise<PeopleResult> {
  if (!(await hrFor(slug))) return NOT_ALLOWED;
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose a CSV file to upload." };
  if (file.size > MAX_CSV_BYTES) return { ok: false, message: `That file is too big (${Math.ceil(file.size / 1024)} KB). Keep it under ${MAX_CSV_BYTES / 1024} KB, or about 500 people.` };
  if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") return { ok: false, message: "That isn't a CSV file. Save the sheet as CSV (comma separated) and try again." };

  const { people, errors } = readPeopleCsv(await file.text());
  if (errors.length) return { ok: false, message: "Nobody was added. Fix the file and upload it again.", errors };
  return addPlanned(slug, people);
}

/**
 * 1.11: access ends at once (the access check skips removed people), the
 * seat frees up, and their row and data stay.
 */
export async function removePerson(slug: string, rawEmail: string): Promise<PeopleResult> {
  const hr = await hrFor(slug);
  if (!hr) return NOT_ALLOWED;
  const email = normaliseEmail(rawEmail);
  if (!email) return { ok: false, message: "That person isn't in your company." };
  const sql = db();
  if (!sql) return UNAVAILABLE;

  const [target, hrCount] = await Promise.all([loadPerson(sql, hr.companyId, email), activeHrCount(sql, hr.companyId)]);
  if (target === undefined || hrCount === null) return UNAVAILABLE;
  const blocked = removeBlocked({ actorEmail: hr.email, target, activeHr: hrCount });
  if (blocked) return { ok: false, message: blocked };

  const removed = await removePersonRow(sql, hr.companyId, email, hr.email);
  if (removed === null) return UNAVAILABLE;
  if (!removed) return { ok: false, message: "That couldn't be done: something changed meanwhile. Reload and try again." };

  revalidatePath(`/org/${slug}/people`);
  revalidatePath(`/org/${slug}/teams`);
  return { ok: true, message: `${email} was removed. Their access has ended and their seat is free.` };
}
