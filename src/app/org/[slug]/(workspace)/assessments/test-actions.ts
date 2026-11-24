"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DraftResult, PublishResult } from "@/app/admin/assessment-actions";
import { allowCompany } from "@/lib/company/access";
import { loadDraft, loadVersions } from "@/lib/company/assessment-data";
import { LIMITS, canWriteTests, hasQuestions, publishGaps, readContent, readTestName, sameContent } from "@/lib/company/assessment-rules";
import { logCompany } from "@/lib/company/audit";
import { getWorkspaceMember } from "@/lib/company/auth";
import { createTest, ownTest, publishOwnDraft, saveOwnDraft } from "@/lib/company/company-test-data";
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

  const sql = db();
  if (!sql) return UNAVAILABLE;
  const item = await createTest(sql, { companyId: member.companyId, title: name.value, role, by: member.email });
  if (!item) return UNAVAILABLE;
  await logCompany(member, "company.test_create", { item });
  refresh(member.companySlug);
  redirect(`/org/${member.companySlug}/assessments/${item}/edit`);
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
  if (hasQuestions(draft)) return { ok: false, message: "Tests with several questions or sections can be saved, not yet published: the candidate's page for them comes next. Keep one question without a section to publish now." };
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
