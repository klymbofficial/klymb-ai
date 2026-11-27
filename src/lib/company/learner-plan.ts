/**
 * How a company-assigned learner moves through a course (user, 26 Nov):
 * self-paced, with lessons opening one after another as each check is passed,
 * not one per day; the final opens once every lesson is passed; and a
 * suggested pace that gets them to the company's due date. Pure, so the server
 * (which enforces it) and the pages (which draw it) can't disagree.
 */

export type LessonState = "passed" | "open" | "locked" | "soon";

const DAY = 86400000;
/** The calendar day in India, as yyyy-mm-dd: due dates are India days. */
export const todayIst = (now: Date) => new Date(now.getTime() + 5.5 * 3600000).toISOString().slice(0, 10);
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);

/**
 * Each lesson's state, in course order. Passed stays passed (even if passed
 * out of order elsewhere). The first lesson not passed is open once it's
 * released, or coming soon; every lesson after it is locked until then.
 */
export function lessonStates(order: readonly string[], passed: ReadonlySet<string>, releases: Readonly<Record<string, string>>, today: string): Map<string, LessonState> {
  const out = new Map<string, LessonState>();
  let reached = false;
  for (const id of order) {
    if (passed.has(id)) { out.set(id, "passed"); continue; }
    if (reached) { out.set(id, "locked"); continue; }
    reached = true;
    out.set(id, releases[id] && releases[id] <= today ? "open" : "soon");
  }
  return out;
}

/** May the check for this lesson be taken now: it's passed (a retake) or it's the open one. */
export const canTakeLesson = (states: ReadonlyMap<string, LessonState>, id: string) => {
  const s = states.get(id);
  return s === "passed" || s === "open";
};

/** The final opens once every lesson is passed. */
export const finalOpen = (order: readonly string[], passed: ReadonlySet<string>) => order.length > 0 && order.every((id) => passed.has(id));

export interface PacePlan {
  /** Lessons still to pass. */
  left: number;
  tone: "ok" | "warn" | "done";
  /** One line on where they stand against the due date. */
  line: string;
  /** How many lessons they are behind an even pace to the due date. */
  behind: number;
}

/** Lessons a week when there's no due date to aim for. */
export const DEFAULT_PER_WEEK = 3;

const shortDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const lessonsWord = (n: number) => `${n} ${n === 1 ? "lesson" : "lessons"}`;

/**
 * A suggested pace (user, 26 Nov): "about 3 lessons a week to finish by
 * 15 Dec", orange when they're two or more lessons behind an even pace from
 * the day it was assigned, or when the due date has passed.
 */
export function pacePlan(p: { total: number; passed: number; dueOn: string | null; assignedAt: string | null; now: Date }): PacePlan {
  const left = Math.max(0, p.total - p.passed);
  if (!left) return { left, tone: "done", behind: 0, line: "Every lesson is passed. The final assessment is next." };
  const today = todayIst(p.now);
  if (!p.dueOn) {
    const weeks = Math.ceil(left / DEFAULT_PER_WEEK);
    return { left, tone: "ok", behind: 0, line: `No due date. At about ${DEFAULT_PER_WEEK} lessons a week you'd finish in ${weeks} ${weeks === 1 ? "week" : "weeks"}.` };
  }
  const daysLeft = daysBetween(today, p.dueOn);
  if (daysLeft < 0) return { left, tone: "warn", behind: left, line: `It was due on ${shortDate(p.dueOn)}. ${lessonsWord(left)} to go: finish when you can.` };

  let behind = 0;
  if (p.assignedAt) {
    const start = todayIst(new Date(p.assignedAt));
    const span = daysBetween(start, p.dueOn);
    if (span > 0) behind = Math.max(0, Math.floor((p.total * Math.min(span, daysBetween(start, today))) / span) - p.passed);
  }
  const pace = daysLeft < 7
    ? `about ${Math.ceil(left / (daysLeft + 1))} a day`
    : `about ${Math.ceil(left / Math.floor(daysLeft / 7))} a week`;
  const by = daysLeft === 0 ? "today" : `by ${shortDate(p.dueOn)}`;
  if (behind >= 2) return { left, tone: "warn", behind, line: `You're ${behind} lessons behind. ${lessonsWord(left)} left: ${pace} gets you there ${by}.` };
  return { left, tone: "ok", behind, line: `${lessonsWord(left)} left: ${pace} to finish ${by}.` };
}

/** "1 h 20 min", "45 min". */
export function durationText(minutes: number) {
  const m = Math.max(1, Math.round(minutes));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`;
}
