/**
 * Reviewing a submission (H09), free of the database and of Next so it can
 * be tested. A reviewer scores every criterion of the test's pinned rubric
 * with whole points from 0 to its maximum, with an optional note each and a
 * summary. The database checks all of it again and computes the total
 * (course.record_review, 0058). A score never decides anything: shortlisting
 * is a person's decision (H10).
 */

import type { McqPart, Question } from "@/lib/company/assessment-rules";

export const REVIEW_LIMITS = { note: 1000, summary: 2000 } as const;

export interface RubricItem {
  title: string;
  skill: string;
  points: number;
  guide: string;
  /** A test with questions (L3): the question this entry scores, 1-based, and its title. */
  questionNo?: number;
  question?: string;
  /** Multiple choice: the entry is the whole question, marked automatically. */
  mcq?: boolean;
}

export interface ScoreInput {
  points: number;
  note: string;
}

export type ReviewForm =
  | { ok: true; scores: ScoreInput[]; summary: string; total: number; max: number }
  | { ok: false; errors: Record<number | "summary" | "form", string> };

/**
 * Reads the review form: `points-<i>`, `note-<i>` and `summary`. Every
 * criterion must be scored. `autos[i]`, when set, is the automatic mark of a
 * multiple-choice entry: a different score needs a reason in its note.
 */
export function readReviewForm(form: { get(name: string): unknown }, rubric: readonly RubricItem[], autos?: readonly (number | null)[]): ReviewForm {
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
    else if (autos?.[i] != null && points !== autos[i] && !note) errors[i] = `${c.title}: say why you changed the automatic mark (${autos[i]}).`;
    scores.push({ points: Number.isInteger(points) ? points : 0, note });
  });
  const summaryRaw = form.get("summary");
  const summary = typeof summaryRaw === "string" ? summaryRaw.trim() : "";
  if (summary.length > REVIEW_LIMITS.summary) errors.summary = `Keep the summary under ${REVIEW_LIMITS.summary.toLocaleString("en")} characters.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  const { total, max } = totals(scores, rubric);
  return { ok: true, scores, summary, total, max };
}

// ── Tests with questions (L3) ──────────────────────────────

/**
 * One multiple-choice question's marks for the options picked, the same rule
 * the database applies (course.mcq_points, 0067): exactly the right options
 * score full points; with several right and partial marks on, points ×
 * (right picked − wrong picked) ÷ right count, rounded down, never below 0;
 * anything else 0.
 */
export function mcqPoints(mcq: McqPart, picked: readonly number[]): number {
  const correct = mcq.options.flatMap((o, i) => (o.correct ? [i] : []));
  if (!correct.length) return 0;
  const chosen = [...new Set(picked)];
  const right = chosen.filter((i) => correct.includes(i)).length;
  const wrong = chosen.length - right;
  if (right === correct.length && wrong === 0) return mcq.points;
  if (correct.length > 1 && mcq.partial) return Math.max(0, Math.floor((mcq.points * (right - wrong)) / correct.length));
  return 0;
}

/** What a reviewer scores in a test with questions: each multiple-choice question whole, and each rubric area of the others, in order. */
export function reviewItems(questions: readonly Question[]): RubricItem[] {
  return questions.flatMap((q, i): RubricItem[] =>
    q.mcq
      ? [{ title: q.title, skill: "", points: q.mcq.points, guide: "", questionNo: i + 1, question: q.title, mcq: true }]
      : q.rubric.map((c) => ({ ...c, questionNo: i + 1, question: q.title })),
  );
}

/** Each entry's automatic mark from the frozen answers (null for a written area). */
export function autoMarks(questions: readonly Question[], answers: readonly { questionNo: number; picked: number[] }[] | null): (number | null)[] {
  return questions.flatMap((q, i) =>
    q.mcq ? [mcqPoints(q.mcq, answers?.find((a) => a.questionNo === i + 1)?.picked ?? [])] : q.rubric.map(() => null),
  );
}

/** Scores per question: a question's entries added up, in order. Entries without a question come through unchanged. */
export function byQuestion<T extends { title: string; points: number; max: number; questionNo?: number; question?: string }>(
  scores: readonly T[],
): { title: string; points: number; max: number }[] {
  const out: { no: number | null; title: string; points: number; max: number }[] = [];
  for (const s of scores) {
    const last = out[out.length - 1];
    if (s.questionNo != null && last && last.no === s.questionNo) {
      last.points += s.points;
      last.max += s.max;
    } else {
      out.push({ no: s.questionNo ?? null, title: s.questionNo != null ? s.question ?? s.title : s.title, points: s.points, max: s.max });
    }
  }
  return out.map(({ title, points, max }) => ({ title, points, max }));
}

export interface ScoreEntry {
  title: string;
  points: number;
  max: number;
  note: string;
  questionNo?: number;
  question?: string;
  /** Multiple choice: the automatic mark the reviewer confirmed or changed. */
  auto?: number;
}

/** A review's scores as stored (jsonb, snake_case question_no). */
export function readScores(raw: unknown): ScoreEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((x) => {
    const r = (x ?? {}) as Record<string, unknown>;
    if (typeof r.title !== "string" || !Number.isInteger(r.points) || !Number.isInteger(r.max)) return [];
    return [{
      title: r.title, points: r.points as number, max: r.max as number, note: typeof r.note === "string" ? r.note : "",
      ...(Number.isInteger(r.question_no) ? { questionNo: r.question_no as number, question: typeof r.question === "string" ? r.question : r.title } : {}),
      ...(Number.isInteger(r.auto) ? { auto: r.auto as number } : {}),
    }];
  });
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
  review: { total: number; max: number; scores: readonly { title: string; points: number; max: number; questionNo?: number; question?: string }[] },
): SharedResult {
  return {
    policy: share.policy,
    total: review.total,
    max: review.max,
    // A test with questions: one line per question, never the areas' notes or the automatic marks.
    areas: share.policy === "by_area" ? byQuestion(review.scores) : null,
    sharedAt: share.sharedAt,
  };
}
