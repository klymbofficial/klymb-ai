"use server";

import { revalidatePath } from "next/cache";
import { allowCompany } from "@/lib/company/access";
import { getWorkspaceMember } from "@/lib/company/auth";
import { canScore } from "@/lib/company/batch-rules";
import { loadReviewView, recordReview } from "@/lib/company/review-data";
import { readReviewForm } from "@/lib/company/review-rules";
import { db } from "@/lib/db/client";

export type ReviewResult =
  | { ok: true; message: string; revision: number }
  | { ok: false; message: string; errors?: Record<string, string>; conflict?: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const UNAVAILABLE: ReviewResult = { ok: false, message: "That didn't save just now. Try again in a minute; nothing you entered is lost." };

/**
 * A reviewer completes (or revises) a review. The company and the reviewer
 * come from the login, never the form; the rubric comes from the attempt's
 * pinned version; the database checks the reviewer, the scores and the
 * revision again, and computes the total.
 */
export async function completeReview(_prev: ReviewResult | null, form: FormData): Promise<ReviewResult> {
  const slug = form.get("slug");
  const batchId = form.get("batchId");
  const candidateId = form.get("candidateId");
  const base = Number(form.get("baseRevision"));
  if (typeof slug !== "string" || !isId(batchId) || !isId(candidateId) || !Number.isInteger(base) || base < 0) return { ok: false, message: "Reload the page and try again." };
  const member = await getWorkspaceMember(slug);
  if (!allowCompany(member, slug) || !canScore(member)) return { ok: false, message: "Only a reviewer in your company can score. Try signing in again." };
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const view = await loadReviewView(sql, member.companyId, batchId, candidateId);
  if (view === null) return UNAVAILABLE;
  if (!view || !view.attempt || !view.submission) return { ok: false, message: "There's no submission to review here. Reload the page." };

  const read = readReviewForm(form, view.rubric);
  if (!read.ok) {
    const errors = Object.fromEntries(Object.entries(read.errors).map(([k, v]) => [String(k), v]));
    return { ok: false, message: "Check the highlighted scores.", errors };
  }
  const out = await recordReview(sql, { companyId: member.companyId, attemptId: view.attempt.id, reviewer: member.email, baseRevision: base, scores: read.scores, summary: read.summary });
  if (!out) return UNAVAILABLE;
  if (out.status === "conflict") return { ok: false, conflict: true, message: "Someone completed a newer review of this submission while you were scoring. Reload to see it; your scores here aren't saved." };
  if (out.status === "refused") return { ok: false, message: "Only a reviewer in your company can score. Try signing in again." };
  if (out.status === "not_submitted") return { ok: false, message: "This test isn't submitted yet." };
  if (out.status !== "recorded") return { ok: false, message: "Those scores don't match this test's rubric. Reload the page and score again." };
  revalidatePath(`/org/${slug}/hiring/${batchId}`);
  revalidatePath(`/org/${slug}/hiring/${batchId}/candidates/${candidateId}`);
  return { ok: true, revision: out.revision, message: `Review ${out.revision === 1 ? "completed" : `revised (version ${out.revision})`}: ${out.total} / ${out.max}.` };
}
