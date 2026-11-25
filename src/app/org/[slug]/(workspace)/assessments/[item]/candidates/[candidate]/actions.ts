"use server";

import { revalidatePath } from "next/cache";
import { allowCompany } from "@/lib/company/access";
import { getWorkspaceMember } from "@/lib/company/auth";
import { canDecide, canScore } from "@/lib/company/batch-rules";
import { recordDecision, shareResult } from "@/lib/company/decision-data";
import { loadReviewView, recordReview } from "@/lib/company/review-data";
import { DECISION_LABEL, autoMarks, readDecisionForm, readReviewForm, reviewItems } from "@/lib/company/review-rules";
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

  // A test with questions is scored per question, multiple choice starting from its automatic mark (L3).
  const items = view.questions ? reviewItems(view.questions) : view.rubric;
  const autos = view.questions ? autoMarks(view.questions, view.submission.answers) : undefined;
  const read = readReviewForm(form, items, autos);
  if (!read.ok) {
    const errors = Object.fromEntries(Object.entries(read.errors).map(([k, v]) => [String(k), v]));
    return { ok: false, message: "Check the highlighted scores.", errors };
  }
  const out = await recordReview(sql, { companyId: member.companyId, attemptId: view.attempt.id, reviewer: member.email, baseRevision: base, scores: read.scores, summary: read.summary });
  if (!out) return UNAVAILABLE;
  if (out.status === "conflict") return { ok: false, conflict: true, message: "Someone completed a newer review of this submission while you were scoring. Reload to see it; your scores here aren't saved." };
  if (out.status === "refused") return { ok: false, message: "Only a reviewer in your company can score. Try signing in again." };
  if (out.status === "not_submitted") return { ok: false, message: "This test isn't submitted yet." };
  if (out.status !== "recorded") return { ok: false, message: view.questions ? "Those scores don't match this test's questions, or a changed automatic mark has no reason. Reload the page and score again." : "Those scores don't match this test's rubric. Reload the page and score again." };
  revalidatePath("/org/[slug]/(workspace)", "layout");
  return { ok: true, revision: out.revision, message: `Review ${out.revision === 1 ? "completed" : `revised (version ${out.revision})`}: ${out.total} / ${out.max}.` };
}

export type DecisionResult = { ok: true; message: string } | { ok: false; message: string; errors?: { decision?: string; reason?: string } };

/** Reads the form's ids and checks the person may decide here. */
async function decider(form: FormData) {
  const slug = form.get("slug");
  const batchId = form.get("batchId");
  const candidateId = form.get("candidateId");
  if (typeof slug !== "string" || !isId(batchId) || !isId(candidateId)) return { error: "Reload the page and try again." } as const;
  const member = await getWorkspaceMember(slug);
  if (!allowCompany(member, slug) || !canDecide(member)) return { error: "Only a recruiter or company head can decide here. Try signing in again." } as const;
  const sql = db();
  if (!sql) return { error: UNAVAILABLE.message } as const;
  const view = await loadReviewView(sql, member.companyId, batchId, candidateId);
  if (view === null) return { error: UNAVAILABLE.message } as const;
  if (!view || !view.attempt || !view.submission) return { error: "Decisions open once the test is submitted. Reload the page." } as const;
  return { sql, member, attemptId: view.attempt.id } as const;
}

/**
 * A recruiter or company head records a hiring decision with a reason.
 * It never reads a score; a decision before any review is allowed (the page
 * warns) and the database notes which review, if any, existed.
 */
export async function decideCandidate(_prev: DecisionResult | null, form: FormData): Promise<DecisionResult> {
  const read = readDecisionForm(form);
  if (!read.ok) return { ok: false, message: "Choose a decision and give a reason.", errors: read.errors };
  const base = Number(form.get("baseRevision"));
  if (!Number.isInteger(base) || base < 0) return { ok: false, message: "Reload the page and try again." };
  const who = await decider(form);
  if ("error" in who) return { ok: false, message: who.error! };
  const out = await recordDecision(who.sql, { companyId: who.member.companyId, attemptId: who.attemptId, actor: who.member.email, baseRevision: base, decision: read.decision, reason: read.reason });
  if (!out) return { ok: false, message: UNAVAILABLE.message };
  if (out.status === "conflict") return { ok: false, message: "Someone recorded a newer decision while you were choosing. Reload to see it; yours isn't saved." };
  if (out.status === "refused") return { ok: false, message: "Only a recruiter or company head can decide here. Try signing in again." };
  if (out.status === "not_submitted") return { ok: false, message: "This test isn't submitted yet." };
  if (out.status === "internal") return { ok: false, message: "This is an internal round: colleagues are scored and reviewed, not shortlisted." };
  if (out.status !== "recorded") return { ok: false, message: "Choose a decision and give a reason." };
  revalidatePath("/org/[slug]/(workspace)", "layout");
  return { ok: true, message: `Recorded: ${DECISION_LABEL[read.decision]}.` };
}

/** Shares the newest review with the candidate, as the version's results policy allows. Pressing it again on the same review changes nothing. */
export async function shareCandidateResult(_prev: DecisionResult | null, form: FormData): Promise<DecisionResult> {
  const who = await decider(form);
  if ("error" in who) return { ok: false, message: who.error! };
  const out = await shareResult(who.sql, { companyId: who.member.companyId, attemptId: who.attemptId, actor: who.member.email });
  if (!out) return { ok: false, message: UNAVAILABLE.message };
  if (out.status === "not_reviewed") return { ok: false, message: "There's no completed review to share yet." };
  if (out.status === "not_allowed") return { ok: false, message: "This test's settings don't show candidates a result." };
  if (out.status !== "shared" && out.status !== "already") return { ok: false, message: "Only a recruiter or company head can share results. Try signing in again." };
  revalidatePath("/org/[slug]/(workspace)", "layout");
  return {
    ok: true,
    message: out.status === "already"
      ? `Review version ${out.reviewRevision} was already shared; nothing changed.`
      : `Shared review version ${out.reviewRevision}. The candidate sees it on their test link now.`,
  };
}
