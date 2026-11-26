/**
 * How the Upskill pages read a course's people (user, 26 Nov): where each
 * person stands, who needs attention and why, the funnel, where people stop
 * and which lessons are hardest. Pure, so it is tested directly and the
 * server and the page agree.
 */

export type LearnerStatus = "not_assigned" | "not_started" | "in_progress" | "completed";
export type PeopleFilter = "all" | LearnerStatus | "overdue" | "inactive";

/** Days without activity before someone in progress counts as inactive. */
export const INACTIVE_DAYS = 7;
/** Days after being assigned before not having started needs attention. */
export const SLOW_START_DAYS = 3;

export interface LearnerFacts {
  assigned: boolean;
  /** Their own paid access, not through the company: details stay theirs. */
  ownAccess: boolean;
  requirement: "required" | "recommended" | null;
  /** yyyy-mm-dd, India time. */
  dueOn: string | null;
  lessonsPassed: number;
  finalBest: number | null;
  lastActive: string | null;
  /** When the company gave them the course. */
  assignedAt: string | null;
}

export const STATUS_LABEL: Record<LearnerStatus, string> = {
  not_assigned: "Not assigned",
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

export const PEOPLE_FILTERS: readonly { key: PeopleFilter; label: string }[] = [
  { key: "all", label: "Everyone assigned" },
  { key: "not_started", label: "Not started" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "overdue", label: "Overdue" },
  { key: "inactive", label: `Inactive ${INACTIVE_DAYS}+ days` },
  { key: "not_assigned", label: "Not assigned" },
];

const DAY = 86400000;
const todayIst = (now: Date) => new Date(now.getTime() + 5.5 * 3600000).toISOString().slice(0, 10);

export function learnerStatus(p: LearnerFacts, total: number): LearnerStatus {
  if (!p.assigned) return "not_assigned";
  if (total > 0 && p.lessonsPassed >= total) return "completed";
  if (p.lessonsPassed > 0 || p.finalBest !== null) return "in_progress";
  return "not_started";
}

/** Required, past its due date, and not finished. */
export function isOverdue(p: LearnerFacts, total: number, now: Date): boolean {
  return p.assigned && p.requirement === "required" && !!p.dueOn && p.dueOn < todayIst(now) && learnerStatus(p, total) !== "completed";
}

/** Started but quiet for INACTIVE_DAYS or more. */
export function isInactive(p: LearnerFacts, total: number, now: Date): boolean {
  return learnerStatus(p, total) === "in_progress" && !!p.lastActive && now.getTime() - new Date(p.lastActive).getTime() >= INACTIVE_DAYS * DAY;
}

/** The filters a person falls under, for the rail's counts. */
export function peopleTags(p: LearnerFacts, total: number, now: Date): PeopleFilter[] {
  const s = learnerStatus(p, total);
  if (s === "not_assigned") return ["not_assigned"];
  const tags: PeopleFilter[] = ["all", s];
  if (isOverdue(p, total, now)) tags.push("overdue");
  if (isInactive(p, total, now)) tags.push("inactive");
  return tags;
}

/** Why someone needs a nudge, most urgent first, in plain words; null when they don't. */
export function attentionReason(p: LearnerFacts, total: number, now: Date): { reason: string; urgency: number } | null {
  if (!p.assigned) return null;
  const days = (iso: string) => Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / DAY));
  if (isOverdue(p, total, now)) {
    const late = Math.max(1, Math.round((new Date(todayIst(now)).getTime() - new Date(p.dueOn!).getTime()) / DAY));
    return { reason: `Overdue by ${late} ${late === 1 ? "day" : "days"}`, urgency: 3 };
  }
  if (isInactive(p, total, now)) return { reason: `No activity for ${days(p.lastActive!)} days`, urgency: 2 };
  if (learnerStatus(p, total) === "not_started" && p.assignedAt && days(p.assignedAt) >= SLOW_START_DAYS) {
    return { reason: `Not started, assigned ${days(p.assignedAt)} days ago`, urgency: 1 };
  }
  return null;
}

export interface FunnelStep { label: string; count: number }

/** Assigned → started → halfway → all lessons → passed the final (PASS_MARK or more). */
export function courseFunnel(rows: readonly LearnerFacts[], total: number, passMark: number): FunnelStep[] {
  const a = rows.filter((r) => r.assigned);
  return [
    { label: "Assigned", count: a.length },
    { label: "Started", count: a.filter((r) => r.lessonsPassed > 0 || r.finalBest !== null).length },
    { label: "Halfway", count: a.filter((r) => total > 0 && r.lessonsPassed >= Math.ceil(total / 2)).length },
    { label: "All lessons done", count: a.filter((r) => total > 0 && r.lessonsPassed >= total).length },
    { label: "Passed the final", count: a.filter((r) => (r.finalBest ?? -1) >= passMark).length },
  ];
}

export interface LessonCheck { lesson: string; bestScore: number; attempts: number; passedAt: string | null }
export interface LessonStat { lesson: string; passed: number; tried: number; avgScore: number | null; avgAttempts: number | null }

/** For each lesson in order: how many assigned people passed it, tried it, their average best score and attempts. */
export function lessonStats(lessons: readonly string[], checks: ReadonlyMap<string, readonly LessonCheck[]>): LessonStat[] {
  return lessons.map((lesson) => {
    const mine = [...checks.values()].flatMap((list) => list.filter((c) => c.lesson === lesson));
    const tried = mine.length;
    return {
      lesson,
      tried,
      passed: mine.filter((c) => c.passedAt).length,
      avgScore: tried ? Math.round(mine.reduce((s, c) => s + c.bestScore, 0) / tried) : null,
      avgAttempts: tried ? Math.round((mine.reduce((s, c) => s + c.attempts, 0) / tried) * 10) / 10 : null,
    };
  });
}

/** The lessons people find hardest: tried by at least two, lowest average score, then most attempts. */
export function hardestLessons(stats: readonly LessonStat[], n = 3): LessonStat[] {
  return stats
    .filter((s) => s.tried >= 2 && s.avgScore !== null)
    .sort((a, b) => a.avgScore! - b.avgScore! || (b.avgAttempts ?? 0) - (a.avgAttempts ?? 0))
    .slice(0, n);
}

/** The lesson where the most people stop: the biggest fall in "passed" from one lesson to the next. */
export function biggestDrop(stats: readonly LessonStat[]): { from: number; to: number; lost: number } | null {
  let best: { from: number; to: number; lost: number } | null = null;
  for (let i = 1; i < stats.length; i++) {
    const lost = stats[i - 1].passed - stats[i].passed;
    if (lost > 0 && (!best || lost > best.lost)) best = { from: i - 1, to: i, lost };
  }
  return best;
}
