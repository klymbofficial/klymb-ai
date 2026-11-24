/**
 * Reviewing a submission (H09), free of the database and of Next so it can
 * be tested. A reviewer scores every criterion of the test's pinned rubric
 * with whole points from 0 to its maximum, with an optional note each and a
 * summary. The database checks all of it again and computes the total
 * (course.record_review, 0058). A score never decides anything: shortlisting
 * is a person's decision (H10).
 */

export const REVIEW_LIMITS = { note: 1000, summary: 2000 } as const;

export interface RubricItem {
  title: string;
  skill: string;
  points: number;
  guide: string;
}

export interface ScoreInput {
  points: number;
  note: string;
}

export type ReviewForm =
  | { ok: true; scores: ScoreInput[]; summary: string; total: number; max: number }
  | { ok: false; errors: Record<number | "summary" | "form", string> };

/** Reads the review form: `points-<i>`, `note-<i>` and `summary`. Every criterion must be scored. */
export function readReviewForm(form: { get(name: string): unknown }, rubric: readonly RubricItem[]): ReviewForm {
  const errors: Record<number | "summary" | "form", string> = {} as Record<number | "summary" | "form", string>;
  const scores: ScoreInput[] = [];
  rubric.forEach((c, i) => {
    const raw = form.get(`points-${i}`);
    const text = typeof raw === "string" ? raw.trim() : "";
    const points = Number(text);
    const noteRaw = form.get(`note-${i}`);
    const note = typeof noteRaw === "string" ? noteRaw.trim() : "";
    if (!text) errors[i] = `Score ${c.title}.`;
    else if (!Number.isInteger(points) || points < 0 || points > c.points) errors[i] = `${c.title}: a whole number from 0 to ${c.points}.`;
    else if (note.length > REVIEW_LIMITS.note) errors[i] = `${c.title}: keep the note under ${REVIEW_LIMITS.note.toLocaleString("en")} characters.`;
    scores.push({ points: Number.isInteger(points) ? points : 0, note });
  });
  const summaryRaw = form.get("summary");
  const summary = typeof summaryRaw === "string" ? summaryRaw.trim() : "";
  if (summary.length > REVIEW_LIMITS.summary) errors.summary = `Keep the summary under ${REVIEW_LIMITS.summary.toLocaleString("en")} characters.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  const { total, max } = totals(scores, rubric);
  return { ok: true, scores, summary, total, max };
}

/** Total points and the most possible. */
export function totals(scores: readonly { points: number }[], rubric: readonly { points: number }[]): { total: number; max: number } {
  return {
    total: scores.reduce((n, s) => n + s.points, 0),
    max: rubric.reduce((n, c) => n + c.points, 0),
  };
}

/** Where a candidate's review stands, for the batch table and its filters. */
export type ReviewState = "none" | "to_review" | "scored";

export function reviewState(a: { submitted: boolean; reviewed: boolean }): ReviewState {
  if (!a.submitted) return "none";
  return a.reviewed ? "scored" : "to_review";
}

/** "7 / 10". */
export const scoreText = (total: number, max: number) => `${total} / ${max}`;

// ── Hiring decisions and shared results (H10) ───────────────

export const HIRING_DECISIONS = ["shortlisted", "not_shortlisted", "on_hold"] as const;
export type HiringDecision = (typeof HIRING_DECISIONS)[number];

export const DECISION_LABEL: Record<HiringDecision, string> = {
  shortlisted: "Shortlisted",
  not_shortlisted: "Not shortlisted",
  on_hold: "On hold",
};

export const DECISION_REASON_MAX = 1000;

export type DecisionForm = { ok: true; decision: HiringDecision; reason: string } | { ok: false; errors: { decision?: string; reason?: string } };

/** A decision and its reason from a form. Both required; no score or threshold is read. */
export function readDecisionForm(form: { get(name: string): unknown }): DecisionForm {
  const d = form.get("decision");
  const raw = form.get("reason");
  const reason = typeof raw === "string" ? raw.replace(/\r\n?/g, "\n").trim() : "";
  const errors: { decision?: string; reason?: string } = {};
  if (typeof d !== "string" || !(HIRING_DECISIONS as readonly string[]).includes(d)) errors.decision = "Choose Shortlisted, Not shortlisted or On hold.";
  if (!reason) errors.reason = "Say why, in a sentence or two. It stays in the history.";
  else if (reason.length > DECISION_REASON_MAX) errors.reason = `Keep the reason under ${DECISION_REASON_MAX} characters.`;
  if (errors.decision || errors.reason) return { ok: false, errors };
  return { ok: true, decision: d as HiringDecision, reason };
}

/**
 * What a candidate may see of a shared review, by the policy recorded with
 * the share: the total, or each area's title and points as well. Never the
 * notes, the summary, the scoring guides or the reviewer.
 */
export interface SharedResult {
  policy: "overall" | "by_area";
  total: number;
  max: number;
  areas: { title: string; points: number; max: number }[] | null;
  sharedAt: string;
}

export function candidateResult(
  share: { policy: "overall" | "by_area"; sharedAt: string },
  review: { total: number; max: number; scores: readonly { title: string; points: number; max: number }[] },
): SharedResult {
  return {
    policy: share.policy,
    total: review.total,
    max: review.max,
    areas: share.policy === "by_area" ? review.scores.map((s) => ({ title: s.title, points: s.points, max: s.max })) : null,
    sharedAt: share.sharedAt,
  };
}
