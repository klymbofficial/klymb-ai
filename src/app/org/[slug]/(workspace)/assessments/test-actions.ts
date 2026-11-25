"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DraftResult, PublishResult } from "@/app/admin/assessment-actions";
import { allowCompany } from "@/lib/company/access";
import { loadDraft, loadVersions } from "@/lib/company/assessment-data";
import { LIMITS, canWriteTests, candidateQuestions, publishGaps, readContent, readTestName, sameContent, type CandidateTask } from "@/lib/company/assessment-rules";
import { AUTO_LIMITS, autoContent, pickQuestions, readSkills, summarise, type Mix } from "@/lib/company/auto-test";
import { isAssessmentAudience, type AssessmentAudience } from "@/lib/company/batch-rules";
import { klymbLibrary, ownLibrary } from "@/lib/company/library-data";
import { activeRoles } from "@/lib/company/roles-data";
import { logCompany } from "@/lib/company/audit";
import { getWorkspaceMember } from "@/lib/company/auth";
import { createTest, createTestKeyed, ownTest, publishOwnDraft, saveOwnDraft } from "@/lib/company/company-test-data";
import { db } from "@/lib/db/client";

/**
 * A company's own tests (U04a): an admin, company head or recruiter creates
 * one, edits its draft and publishes numbered versions. Publishing is the
 * company's approval, so recruiters can invite people at once. The company
 * always comes from the signed-in member; a test of any other company reads
 * as gone. Audit entries record revisions and versions, never the text.
 */

export type CreateResult = { ok: false; message: string } | null;

const UNAVAILABLE = { ok: false as const, message: "That didn't work just now. Try again in a minute." };
const NOT_ALLOWED = { ok: false as const, message: "Only an admin or a recruiter in your company can write tests. Try signing in again." };
const GONE = { ok: false as const, message: "That test is no longer available." };
const CHANGED = { ok: false as const, message: "Someone else saved this draft since you opened it. Reload to see their version; your edits here are not saved." };
const SLUG = /^t-[a-z0-9]{10}$/;
const readAudience = (v: unknown): AssessmentAudience | null => isAssessmentAudience(v) ? v : null;

async function writer(slug: unknown) {
  const member = typeof slug === "string" ? await getWorkspaceMember(slug) : null;
  return allowCompany(member, slug as string) && canWriteTests(member) ? member : null;
}

function refresh(company: string, item?: string) {
  revalidatePath(`/org/${company}/assessments`);
  if (item) {
    revalidatePath(`/org/${company}/assessments/${item}`);
    revalidatePath(`/org/${company}/assessments/${item}/edit`);
  }
}

/** Creates the test with its name and role, then opens its editor. */
export async function createOwnTest(_prev: CreateResult, form: FormData): Promise<CreateResult> {
  const member = await writer(form.get("slug"));
  if (!member) return NOT_ALLOWED;
  const name = readTestName(form.get("title"));
  if (!name.ok) return name;
  const roleRaw = form.get("role");
  const role = typeof roleRaw === "string" ? roleRaw.replace(/\s+/g, " ").trim() : "";
  if (role.length > LIMITS.role) return { ok: false, message: `Keep the role under ${LIMITS.role} characters.` };
  const audience = readAudience(form.get("audience"));
  if (!audience) return { ok: false, message: "Choose whether this assessment is for external candidates or internal employees." };

  const sql = db();
  if (!sql) return UNAVAILABLE;
  const item = await createTest(sql, { companyId: member.companyId, title: name.value, role, audience, by: member.email });
  if (!item) return UNAVAILABLE;
  await logCompany(member, "company.test_create", { item, audience });
  refresh(member.companySlug);
  redirect(`/org/${member.companySlug}/assessments/${item}/edit`);
}

export type AutoResult =
  | {
      ok: true; item: string; title: string; role: string; audience: AssessmentAudience; revision: number; existed: boolean;
      count: number; points: number; minutes: number; mix: Mix; planned: Mix; adapted: boolean;
      /** What candidates will see: never the right options. */
      task: CandidateTask;
    }
  | { ok: false; message: string };

const KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Automatic creation (P0.4): picks multiple-choice questions for the role's
 * chosen skills from the Klymb Library and this company's own, once, on the
 * server, and saves them into a new draft ready to publish. The editor
 * doesn't open. The press's key makes a retry return the same test instead
 * of a second one; a shortage is reported, never padded.
 */
export async function createAutoTest(input: { slug: string; title: string; role: string; skills: string[]; count: number; audience: AssessmentAudience; createKey: string }): Promise<AutoResult> {
  const member = await writer(input?.slug);
  if (!member) return NOT_ALLOWED;
  const name = readTestName(input.title);
  if (!name.ok) return name;
  const audience = readAudience(input.audience);
  if (!audience) return { ok: false, message: "Choose whether this assessment is for external candidates or internal employees." };
  if (typeof input.createKey !== "string" || !KEY.test(input.createKey)) return { ok: false, message: "Reload the page and try again." };
  const count = Number(input.count);
  if (!Number.isInteger(count) || count < AUTO_LIMITS.min || count > AUTO_LIMITS.max) return { ok: false, message: `Ask for ${AUTO_LIMITS.min} to ${AUTO_LIMITS.max} questions.` };
  const skills = readSkills(input.skills);

  const sql = db();
  if (!sql) return UNAVAILABLE;
  const [roles, klymb, mine] = await Promise.all([activeRoles(sql), klymbLibrary(sql), ownLibrary(sql, member.companyId)]);
  if (!roles || !klymb || !mine) return UNAVAILABLE;
  const role = roles.find((r) => r.slug === input.role);
  if (!role) return { ok: false, message: "Choose a job role from the list." };

  const picked = pickQuestions([...klymb, ...mine], skills, count);
  if (!picked.ok) return { ok: false, message: picked.message };
  const sum = summarise(picked.questions);
  const content = autoContent(role.label, picked.questions, sum.minutes);

  const made = await createTestKeyed(sql, { companyId: member.companyId, title: name.value, role: role.label, audience, by: member.email, createKey: input.createKey });
  if (!made) return UNAVAILABLE;
  let revision = 1;
  let saved = content;
  if (made.existed) {
    // A retry: keep what the first press saved, unless it never got its questions.
    const draft = await loadDraft(sql, made.slug);
    if (draft === null) return UNAVAILABLE;
    if (draft && draft.questions?.length) { revision = draft.revision; saved = draft; }
  }
  if (revision === 1) {
    const out = await saveOwnDraft(sql, { companyId: member.companyId, slug: made.slug, title: name.value, content, expected: 1, by: member.email });
    if (!out || out.status !== "saved") return UNAVAILABLE;
    revision = out.revision;
    if (!made.existed) await logCompany(member, "company.test_create", { item: made.slug, automatic: true, questions: content.questions!.length, role: role.slug, audience });
  }
  refresh(member.companySlug, made.slug);
  const qs = saved.questions ?? [];
  const mix: Mix = made.existed && saved !== content ? { easy: 0, medium: 0, hard: 0 } : picked.mix;
  return {
    ok: true, item: made.slug, title: name.value, role: role.label, audience: made.audience, revision, existed: made.existed,
    count: qs.length, points: qs.reduce((n, q) => n + (q.mcq?.points ?? 0), 0), minutes: saved.minutes ?? sum.minutes,
    mix, planned: picked.planned, adapted: picked.adapted && !made.existed,
    task: {
      title: name.value, role: saved.role, minutes: saved.minutes ?? sum.minutes, submission: saved.submission,
      toolsAllowed: saved.toolsAllowed, toolsNotAllowed: saved.toolsNotAllowed, instructions: saved.instructions,
      taskTitle: "", taskBrief: "", areas: [], results: saved.results, questions: candidateQuestions(qs),
    },
  };
}

/** Saves the draft and the name, if nobody else saved since `expected`. An unfinished draft saves fine. */
export async function saveOwnTest(company: string, item: string, form: Record<string, unknown>, expected: number): Promise<DraftResult> {
  const member = await writer(company);
  if (!member) return NOT_ALLOWED;
  if (typeof item !== "string" || !SLUG.test(item)) return GONE;
  if (!Number.isInteger(expected) || expected < 1) return CHANGED;
  const name = readTestName(form?.title);
  if (!name.ok) return name;
  const content = readContent(form ?? {});
  if (!content.ok) return content;

  const sql = db();
  if (!sql) return UNAVAILABLE;
  const own = await ownTest(sql, member.companyId, item);
  if (own === null) return UNAVAILABLE;
  if (!own) return GONE;
  const saved = await saveOwnDraft(sql, { companyId: member.companyId, slug: item, title: name.value, content: content.value, expected, by: member.email });
  if (!saved) return UNAVAILABLE;
  if (saved.status === "changed") return CHANGED;
  await logCompany(member, "company.test_save", { item, revision: saved.revision });
  refresh(member.companySlug, item);
  const gaps = publishGaps(content.value);
  return { ok: true, revision: saved.revision, message: gaps.length ? `Draft saved. To publish, add ${gaps.join(", ")}.` : "Draft saved. Ready to publish." };
}

/** Publishes the saved draft, exactly as it was at `revision`, as the next version, approved for this company. */
export async function publishOwnTest(company: string, item: string, revision: number): Promise<PublishResult> {
  const member = await writer(company);
  if (!member) return NOT_ALLOWED;
  if (typeof item !== "string" || !SLUG.test(item)) return GONE;
  if (!Number.isInteger(revision) || revision < 1) return { ok: false, message: "Save the draft first." };

  const sql = db();
  if (!sql) return UNAVAILABLE;
  const own = await ownTest(sql, member.companyId, item);
  if (own === null) return UNAVAILABLE;
  if (!own) return GONE;
  const [draft, versions] = await Promise.all([loadDraft(sql, item), loadVersions(sql, item)]);
  if (draft === null || versions === null) return UNAVAILABLE;
  if (!draft) return { ok: false, message: "Save the draft first." };
  if (draft.revision !== revision) return CHANGED;
  const gaps = publishGaps(draft);
  if (gaps.length) return { ok: false, message: `Not ready to publish. Add ${gaps.join(", ")}.` };
  const latest = versions[0];
  if (latest && sameContent(draft, latest) && latest.title === own.title) return { ok: false, message: `Nothing has changed since version ${latest.version}.` };

  const out = await publishOwnDraft(sql, { companyId: member.companyId, slug: item, revision, by: member.email });
  if (!out) return UNAVAILABLE;
  if (out.status === "changed") return { ok: false, message: "The draft changed while you were publishing. Nothing was published. Reload and check." };
  await logCompany(member, "company.test_publish", { item, version: out.version, revision });
  refresh(member.companySlug, item);
  return {
    ok: true,
    version: out.version,
    message: `Published as version ${out.version}. Recruiters can invite people to it now${latest ? "; rounds already sent keep the version they started on" : ""}.`,
  };
}
