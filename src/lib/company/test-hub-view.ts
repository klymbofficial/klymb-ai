import type { Standing } from "@/lib/company/assessment-rules";
import type { HiringDecision } from "@/lib/company/review-rules";

/**
 * How the Assessments hub sorts tests and a test's candidates into the
 * filters a recruiter clicks, and counts its funnel. Free of the database,
 * React and Next so it can be tested; pages compute these on the server.
 */

// ── Tests ───────────────────────────────────────────────────

/** Ongoing: a version is approved and recruiters can invite. Review: the newest version waits for this company. Unpublished: Klymb hasn't published one. */
export type TestStatus = "ongoing" | "review" | "unpublished";

export const TEST_STATUS_FILTERS: readonly { key: TestStatus; label: string }[] = [
  { key: "ongoing", label: "Ongoing" },
  { key: "review", label: "Waiting for review" },
  { key: "unpublished", label: "Not published" },
];

export function testStatus(s: Standing): TestStatus {
  if (s.inUse) return "ongoing";
  if (s.latest) return "review";
  return "unpublished";
}

export type TestSort = "newest" | "oldest" | "candidates";
export type TestAge = "any" | "30" | "90" | "365";

export const TEST_AGE_LABEL: Record<TestAge, string> = { any: "Any time", "30": "Last 30 days", "90": "Last 90 days", "365": "Last year" };

/** "19 candidates have been invited and 5 have taken the test." */
export function takeUpText(invited: number, taken: number): string {
  if (invited === 0) return "No candidates have been invited yet.";
  const who = invited === 1 ? "1 candidate has been invited" : `${invited} candidates have been invited`;
  if (taken === 0) return `${who} and ${invited === 1 ? "hasn't" : "none of them have"} taken the test yet.`;
  if (invited === 1) return `${who} and has taken the test.`;
  return `${who} and ${taken} ${taken === 1 ? "has" : "have"} taken the test.`;
}

/** Tests matching a status, a creation-date window and a search (title, role or a tag, any case), in the chosen order. */
export function pickTests<T extends { status: TestStatus; title: string; role: string; publishedAt: string | null; invited: number; tags?: string[] }>(
  all: readonly T[],
  status: TestStatus,
  query: string,
  age: TestAge,
  sort: TestSort,
  now: Date,
): T[] {
  const q = query.trim().toLowerCase();
  const since = age === "any" ? null : now.getTime() - Number(age) * 86400000;
  const shown = all.filter(
    (t) =>
      t.status === status &&
      (!q || t.title.toLowerCase().includes(q) || t.role.toLowerCase().includes(q) || (t.tags ?? []).some((g) => g.toLowerCase().includes(q))) &&
      (since === null || (t.publishedAt !== null && new Date(t.publishedAt).getTime() >= since)),
  );
  const at = (t: T) => (t.publishedAt ? new Date(t.publishedAt).getTime() : 0);
  return [...shown].sort((a, b) => (sort === "candidates" ? b.invited - a.invited : sort === "oldest" ? at(a) - at(b) : at(b) - at(a)));
}

// ── A test's candidates ─────────────────────────────────────

export type HubFilter = "taken" | "review" | "reviewed" | HiringDecision | "progress" | "not_started" | "expired" | "invited" | "cancelled";

/** The rail on a test's Candidates tab, in order. A person can match several; "Invited" holds everyone still invited. */
export const HUB_FILTERS: readonly { key: HubFilter; label: string }[] = [
  { key: "taken", label: "Test taken" },
  { key: "review", label: "Review pending" },
  { key: "reviewed", label: "Reviewed" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "on_hold", label: "On hold" },
  { key: "not_shortlisted", label: "Not shortlisted" },
  { key: "progress", label: "In progress" },
  { key: "not_started", label: "Not started" },
  { key: "expired", label: "Start passed" },
  { key: "invited", label: "Invited" },
  { key: "cancelled", label: "Cancelled" },
];

export interface HubFacts {
  /** Their invitation (and batch) is still active. */
  active: boolean;
  started: boolean;
  submitted: boolean;
  reviewed: boolean;
  /** Not started, and their last start has gone by. */
  passed: boolean;
  /** The recruiter's newest decision; its own dimension, never read from the score. */
  decision?: HiringDecision | null;
}

export function hubTags(c: HubFacts): HubFilter[] {
  if (!c.active && !c.started) return ["cancelled"];
  const tags: HubFilter[] = ["invited"];
  if (c.submitted) {
    tags.push("taken", c.reviewed ? "reviewed" : "review");
    if (c.decision) tags.push(c.decision);
  }
  else if (c.started) tags.push("progress");
  else tags.push(c.passed ? "expired" : "not_started");
  return tags;
}

// ── Funnel ──────────────────────────────────────────────────

export interface FunnelStep {
  key: "invited" | "opened" | "started" | "submitted" | "reviewed" | "shortlisted";
  label: string;
  count: number;
  /** Share of the step before, or null for the first step or an empty one before it. */
  ofPrevious: number | null;
}

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : null);

/**
 * Invited → Opened the link → Started → Submitted → Reviewed → Shortlisted, counted from
 * what the server recorded (a link page view, a Start), never from email
 * opens. Cancelled invitations that never started are left out.
 */
export function funnel(rows: readonly (HubFacts & { opened: boolean })[]): { steps: FunnelStep[]; expired: number } {
  const counted = rows.filter((r) => r.active || r.started);
  const raw: [FunnelStep["key"], string, number][] = [
    ["invited", "Invited", counted.length],
    ["opened", "Opened the link", counted.filter((r) => r.opened || r.started).length],
    ["started", "Started", counted.filter((r) => r.started).length],
    ["submitted", "Submitted", counted.filter((r) => r.submitted).length],
    ["reviewed", "Reviewed", counted.filter((r) => r.reviewed).length],
    // A person's decision, never a score: shortlisted people need not have been reviewed.
    ["shortlisted", "Shortlisted", counted.filter((r) => r.submitted && r.decision === "shortlisted").length],
  ];
  const steps = raw.map(([key, label, count], i) => ({ key, label, count, ofPrevious: i === 0 ? null : pct(count, raw[i - 1][2]) }));
  return { steps, expired: counted.filter((r) => !r.started && r.passed).length };
}

export const percentOf = pct;

// ── Distributions (P0.6) ────────────────────────────────────

/** Counts per bucket: `edges` are the lower bounds, the last bucket open-ended. */
export function histogram(values: readonly number[], edges: readonly number[]): { from: number; to: number | null; count: number }[] {
  return edges.map((from, i) => {
    const to = i + 1 < edges.length ? edges[i + 1] : null;
    return { from, to, count: values.filter((v) => v >= from && (to === null || v < to)).length };
  });
}

/** Score buckets of 10 points of percent: 0–9 … 90–100. */
export const SCORE_EDGES = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90] as const;

/** Time buckets in minutes, finer at the start. */
export function timeEdges(allowed: number): number[] {
  const step = Math.max(5, Math.ceil(allowed / 6 / 5) * 5);
  return Array.from({ length: 6 }, (_, i) => i * step);
}

export interface QuestionResultRow { questionNo: number; points: number; max: number }

/** Per question: how many answered it in this version, how many got full marks, the average percent. */
export function questionResults(rows: readonly QuestionResultRow[], count: number) {
  return Array.from({ length: count }, (_, i) => {
    const mine = rows.filter((r) => r.questionNo === i + 1);
    const full = mine.filter((r) => r.max > 0 && r.points >= r.max).length;
    const avg = mine.length ? Math.round((100 * mine.reduce((n, r) => n + (r.max ? r.points / r.max : 0), 0)) / mine.length) : null;
    return { questionNo: i + 1, attempts: mine.length, full, average: avg };
  });
}
