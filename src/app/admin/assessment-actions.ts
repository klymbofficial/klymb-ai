"use server";

import { revalidatePath } from "next/cache";
import { codeItem, type CatalogAssessment } from "@/data/business-catalog";
import { getAdmin } from "@/lib/admin/auth";
import { logAdmin } from "@/lib/admin/audit";
import { loadDraft, loadVersions, publishDraft, saveDraft } from "@/lib/company/assessment-data";
import { publishGaps, readContent, sameContent } from "@/lib/company/assessment-rules";
import { db } from "@/lib/db/client";

export type DraftResult = { ok: true; message: string; revision: number } | { ok: false; message: string };
export type PublishResult = { ok: true; message: string; version: number } | { ok: false; message: string };

const UNAVAILABLE = { ok: false as const, message: "Unavailable right now. Try again in a minute." };
const NOT_ALLOWED = { ok: false as const, message: "Not authorised." };
const CHANGED = { ok: false as const, message: "Someone else changed this draft since you opened it. Reload to see their version; your edits here are not saved." };

const assessment = (slug: unknown): CatalogAssessment | null => {
  const item = typeof slug === "string" ? codeItem(slug) : undefined;
  return item?.kind === "assessment" ? item : null;
};

function refresh(slug: string) {
  revalidatePath(`/admin/catalog/assessments/${slug}`);
  revalidatePath("/admin/catalog");
}

/**
 * Any Klymb admin. Saves the draft if nobody else has saved since
 * `expected` (0 when there was no draft). An unfinished draft saves fine;
 * only publishing needs it complete. Logged with the revision, not the text.
 */
export async function saveAssessmentDraft(slug: string, form: Record<string, unknown>, expected: number): Promise<DraftResult> {
  const admin = await getAdmin();
  if (!admin) return NOT_ALLOWED;
  const code = assessment(slug);
  if (!code) return { ok: false, message: "That assessment no longer exists." };
  if (!Number.isInteger(expected) || expected < 0) return CHANGED;
  const content = readContent(form ?? {});
  if (!content.ok) return content;

  const sql = db();
  if (!sql) return UNAVAILABLE;
  const saved = await saveDraft(sql, code, content.value, expected, admin.email);
  if (!saved) return UNAVAILABLE;
  if (saved.status === "changed") return CHANGED;
  await logAdmin(admin, "catalog.assessment_save", slug, { revision: saved.revision });
  refresh(slug);
  const gaps = publishGaps(content.value);
  return { ok: true, revision: saved.revision, message: gaps.length ? `Draft saved. To publish, add ${gaps.join(", ")}.` : "Draft saved. Ready to publish." };
}

/**
 * Any Klymb admin. Publishes the saved draft, exactly as it was at
 * `revision`, as the next version. Refused when it is unfinished, or the
 * same as the newest version. Companies approve the new version before
 * their recruiters can pick it; until then their earlier approval stands.
 */
export async function publishAssessment(slug: string, revision: number): Promise<PublishResult> {
  const admin = await getAdmin();
  if (!admin) return NOT_ALLOWED;
  const code = assessment(slug);
  if (!code) return { ok: false, message: "That assessment no longer exists." };
  if (!Number.isInteger(revision) || revision < 1) return { ok: false, message: "Save the draft first." };

  const sql = db();
  if (!sql) return UNAVAILABLE;
  const [draft, versions] = await Promise.all([loadDraft(sql, slug), loadVersions(sql, slug)]);
  if (draft === null || versions === null) return UNAVAILABLE;
  if (!draft) return { ok: false, message: "Save the draft first." };
  if (draft.revision !== revision) return CHANGED;
  const gaps = publishGaps(draft);
  if (gaps.length) return { ok: false, message: `Not ready to publish. Add ${gaps.join(", ")}.` };
  const latest = versions[0];
  if (latest && sameContent(draft, latest)) return { ok: false, message: `Nothing has changed since version ${latest.version}.` };

  const out = await publishDraft(sql, slug, code.title, revision, admin.email);
  if (!out) return UNAVAILABLE;
  if (out.status === "changed") return { ok: false, message: "The draft or its versions changed while you were publishing. Nothing was published. Reload and check." };
  await logAdmin(admin, "catalog.assessment_publish", slug, { version: out.version, revision });
  refresh(slug);
  // Every workspace: the layout at /org/[slug] holds them all.
  revalidatePath("/org/[slug]", "layout");
  return {
    ok: true,
    version: out.version,
    message: `Published as version ${out.version}. Each company's reviewer approves it before their recruiters can pick it${latest ? `; until then they keep the version they approved` : ""}.`,
  };
}
