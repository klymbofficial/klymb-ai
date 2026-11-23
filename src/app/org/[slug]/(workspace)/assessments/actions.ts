"use server";

import { revalidatePath } from "next/cache";
import { allowCompany } from "@/lib/company/access";
import { setReview } from "@/lib/company/assessment-data";
import { canReview, readReview } from "@/lib/company/assessment-rules";
import { logCompany } from "@/lib/company/audit";
import { getWorkspaceMember } from "@/lib/company/auth";
import { companyCatalog } from "@/lib/company/catalog-data";
import { db } from "@/lib/db/client";

export type ReviewResult = { ok: true; message: string } | { ok: false; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNAVAILABLE = { ok: false as const, message: "That didn't work just now. Try again in a minute." };
const NOT_ALLOWED = { ok: false as const, message: "Only a reviewer in your company can approve or decline a test. Try signing in again." };

/**
 * A company reviewer approves or declines the newest version of a test their
 * company has in its catalog. The company comes from the signed-in member,
 * never from the form. The audit entry records the decision, not the note.
 */
export async function reviewAssessment(slug: string, item: string, versionId: string, form: { decision: string; note: string }): Promise<ReviewResult> {
  const member = typeof slug === "string" ? await getWorkspaceMember(slug) : null;
  if (!allowCompany(member, slug) || !canReview(member)) return NOT_ALLOWED;
  if (typeof item !== "string" || typeof versionId !== "string" || !UUID.test(versionId)) return { ok: false, message: "That test is no longer available." };
  const review = readReview(form ?? { decision: null, note: null });
  if (!review.ok) return review;

  const sql = db();
  if (!sql) return UNAVAILABLE;
  const catalog = await companyCatalog(sql, member.companyId);
  if (!catalog) return UNAVAILABLE;
  if (!catalog.some((e) => e.item.slug === item && e.item.kind === "assessment")) return { ok: false, message: "That test is no longer in your catalog." };

  const saved = await setReview(sql, { companyId: member.companyId, slug: item, versionId, decision: review.value.decision, note: review.value.note, by: member.email });
  if (saved === null) return UNAVAILABLE;
  if (!saved) return { ok: false, message: "Klymb has published a newer version since you opened this. Reload to review that one." };
  await logCompany(member, "company.assessment_review", { item, version_id: versionId, decision: review.value.decision });
  // Literal pages: there's no layout under assessments/ for a "layout" revalidation to hit.
  revalidatePath(`/org/${member.companySlug}/assessments`);
  revalidatePath(`/org/${member.companySlug}/assessments/${item}`);
  revalidatePath(`/org/${member.companySlug}/catalog/${item}`);
  return {
    ok: true,
    message: review.value.decision === "approved" ? "Approved. Recruiters can pick this version for a hiring batch." : "Declined. Klymb sees your note. Recruiters can't pick this version.",
  };
}
