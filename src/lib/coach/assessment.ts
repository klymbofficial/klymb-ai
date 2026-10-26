/**
 * What a voice session leaves behind.
 *
 * Grading is kept off the conversational path on purpose. The coach calls
 * `record_skill_evidence` as it talks and gets an acknowledgement straight
 * back, so the next question is asked while the row is being written — not
 * after a report has been composed. Anything that reads like a report is
 * assembled later, from these rows.
 *
 * What arrives is a model's judgement, relayed by the learner's own browser,
 * and neither of those is trustworthy: a hand-written POST can claim "strong"
 * on everything. That is why none of it unlocks anything and nothing here is
 * a mark. These rows are evidence a reviewer reads next to the deliverables,
 * in the same spirit as src/lib/learner/evidence.ts — the check proves the
 * shape of the claim, never its merit.
 */

/** One session is five minutes. Long enough to diagnose a topic, short enough to sit through. */
export const ASSESSMENT_SECONDS = 5 * 60;

/** The only levels the coach may record: free text would be unreadable in aggregate. */
export const SKILL_LEVELS = ["not-yet", "shaky", "solid", "strong"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

/** Ceilings on everything the model can write, as src/lib/validation.ts does for forms. */
export const COACH_LIMITS = { skill: 80, evidence: 2000, nextStep: 400, summary: 2000 } as const;

export interface SkillEvidence {
  topic: string;
  skill: string;
  level: SkillLevel;
  /** What the learner actually said that justifies the level — a quote or a close paraphrase. */
  evidence: string;
  nextStep: string | null;
}

export interface SessionSummary {
  /** The coach's closing read: what was strongest, and the one thing to work on. */
  summary: string;
  /** Milliseconds from the learner finishing to the first word of the reply, as measured in the browser. */
  firstReplyMs: number | null;
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; reason: string };

const text = (value: unknown, cap: number) => (typeof value === "string" ? value.trim().slice(0, cap) : "");

/**
 * `topics` is the allowlist the caller resolved from the learner's own track,
 * so a session cannot file evidence against a topic it was never about.
 */
export function parseSkillEvidence(input: unknown, topics: readonly string[]): Parsed<SkillEvidence> {
  const body = (input ?? {}) as Record<string, unknown>;

  const topic = text(body.topic, 80);
  if (!topic) return { ok: false, reason: "Which topic this is about is missing." };
  if (!topics.includes(topic)) return { ok: false, reason: "That topic is not on this track." };

  const skill = text(body.skill, COACH_LIMITS.skill);
  if (!skill) return { ok: false, reason: "Which skill was assessed is missing." };

  const level = SKILL_LEVELS.find((candidate) => candidate === body.level);
  if (!level) return { ok: false, reason: "That is not one of the levels." };

  const evidence = text(body.evidence, COACH_LIMITS.evidence);
  if (!evidence) return { ok: false, reason: "A level without the answer behind it is not evidence." };

  const nextStep = text(body.nextStep, COACH_LIMITS.nextStep);
  return { ok: true, value: { topic, skill, level, evidence, nextStep: nextStep || null } };
}

export function parseSessionSummary(input: unknown): Parsed<SessionSummary> {
  const body = (input ?? {}) as Record<string, unknown>;

  const summary = text(body.summary, COACH_LIMITS.summary);
  if (!summary) return { ok: false, reason: "The closing summary is missing." };

  // Measured in the browser between two events, so a number that could only
  // come from a broken clock is dropped rather than stored and averaged.
  const raw = Number(body.firstReplyMs);
  const firstReplyMs = Number.isFinite(raw) && raw > 0 && raw < 60_000 ? Math.round(raw) : null;

  return { ok: true, value: { summary, firstReplyMs } };
}
