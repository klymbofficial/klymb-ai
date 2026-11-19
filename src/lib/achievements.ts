/**
 * Klymb's achievements, one look for every course. The medals were first drawn
 * for the System Design course app; their families (colour and shape), the track
 * milestones and the wording of each badge live here so the course app, the
 * track pages and the dashboard all draw the same thing from the same rules.
 *
 * Pure and browser-safe. Earning rules are not here: System Design's stay in
 * `badges()` in lib/course-app, the tracks' in `trackMilestones` below.
 */

export type MedalFamily = "learn" | "test" | "habit" | "craft";

/** The icon names a medal can carry: the course app's icon set. */
export type MedalIcon = "play" | "target" | "flame" | "zap" | "note" | "trending" | "db" | "award" | "check";

/** Each family's colours and medal shape, as the course app has always drawn them. */
export const MEDAL_FAMILIES: Record<MedalFamily, { label: string; base: string; light: string; deep: string; radius: string; clip?: string }> = {
  learn: { label: "Learning", base: "#b08a3e", light: "#f3e9d2", deep: "#6e5420", radius: "50%" },
  test: { label: "Assessment", base: "#4f6a8a", light: "#dfe6ee", deep: "#2e4258", radius: "0px", clip: "polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)" },
  habit: { label: "Habit", base: "#b3121b", light: "#fbdcdd", deep: "#5a0307", radius: "0px", clip: "polygon(50% 0, 100% 14%, 100% 56%, 50% 100%, 0 56%, 0 14%)" },
  craft: { label: "Craft", base: "#6f8a6a", light: "#e3ebdf", deep: "#3f5639", radius: "0px", clip: "polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%)" },
};

/** System Design's badges, by name: their family, and what to do to earn one still locked. */
export const SD_BADGES: Record<string, { family: MedalFamily; hint: string }> = {
  "First lesson": { family: "learn", hint: "Finish your first lesson." },
  "First pass": { family: "test", hint: "Pass a lesson check." },
  "7-day streak": { family: "habit", hint: "Pass a lesson on seven days in a row." },
  "Started right": { family: "craft", hint: "Finish every lesson in module 1." },
  "Note taker": { family: "craft", hint: "Save three notes while you learn." },
  "Perfect score": { family: "test", hint: "Score 100% on a lesson check." },
  Builder: { family: "craft", hint: "Submit an architecture practice answer." },
  "Course complete": { family: "learn", hint: "Finish every lesson in the course." },
};

export interface Milestone {
  days: number;
  name: string;
  description: string;
  family: MedalFamily;
  icon: MedalIcon;
  hint: string;
}

/** A track's or challenge's four badges, scaled to its length: halfway and the finish follow 30 or 60 days. */
export function trackMilestones(total: number): Milestone[] {
  const half = Math.ceil(total / 2);
  return [
    { days: 1, name: "First step", description: "Submitted my first day of coursework.", family: "learn", icon: "zap", hint: "Submit Day 1." },
    { days: 7, name: "Seven days of progress", description: "Submitted seven days of coursework.", family: "habit", icon: "flame", hint: "Submit seven days." },
    { days: half, name: "Halfway there", description: `Submitted ${half} days of coursework.`, family: "craft", icon: "trending", hint: `Submit ${half} days.` },
    { days: total, name: `${total}-day finisher`, description: `Submitted all ${total} days of coursework.`, family: "learn", icon: "award", hint: `Submit all ${total} days.` },
  ];
}

/** One badge as the dashboard shows it: from which course, and when it was earned when that is known. */
export interface CourseBadge {
  /** Unique across courses, e.g. "system-design:First pass". */
  key: string;
  name: string;
  description: string;
  family: MedalFamily;
  icon: MedalIcon;
  /** The course it belongs to, and where that course lives. */
  course: string;
  courseHref: string;
  earned: boolean;
  /** ISO time it was earned, when the server can tell. Badges earned only in one browser have none. */
  earnedAt: string | null;
  /** What to do to earn it, for a locked badge. */
  hint: string;
  /** How far towards it, for a locked badge with a count: done of needed. */
  toward: { done: number; of: number } | null;
}

/**
 * The badge to celebrate: the most recently earned one with a date, the last
 * dated in course order breaking a tie. A badge earned only in this browser
 * (no date) is chosen only when no dated badge is earned.
 */
export function latestBadge(list: CourseBadge[]): CourseBadge | null {
  const earned = list.filter((b) => b.earned);
  if (!earned.length) return null;
  const dated = earned.filter((b) => b.earnedAt);
  if (!dated.length) return earned[earned.length - 1];
  return dated.reduce((a, b) => (b.earnedAt! >= a.earnedAt! ? b : a));
}

/** For someone with nothing earned yet: the first locked badge of the course they are on. */
export function firstMilestone(list: CourseBadge[], course: string | null): CourseBadge | null {
  const locked = list.filter((b) => !b.earned);
  return locked.find((b) => b.course === course) ?? locked[0] ?? null;
}
