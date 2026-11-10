import type { MemberProgress } from "@/lib/company/progress-data";

/**
 * Counts and one status word for the people in a company learning view.
 *
 * Pure: it takes the rows `loadProgress` already returned (so the role's scope
 * is already applied: HR the company, a head their team, an employee
 * themselves) and the number of lessons built today. It reads no database,
 * adds no field and derives no verdict.
 *
 * What the words mean:
 *
 *   - "Recorded activity" is anything Klymb recorded under the person's work
 *     email: a lesson attempt (passed or not) or a final-assessment try. It
 *     can predate the company's assignment, because the records are keyed by
 *     email only. It is not a measure of what the company program caused.
 *   - "Final attempted" is `finalAttempts > 0`. It says nothing about the
 *     score, and no pass or fail is derived from it.
 *   - A person with company-assigned access and a person with their own paid
 *     access are kept apart (`assigned`, `ownAccess`); `withAccess` is either.
 *
 * Everything below describes people who can open the course (`hasAccess`).
 * Someone with no access is counted once, under `noAccess`, even if records
 * exist under their email, matching the table, which shows no lesson count
 * for them.
 */

/** The group for people HR has not put on a team. */
export const NO_TEAM_LABEL = "No team assigned";

/** Where one person stands. Exactly one applies to each person. */
export type ProgressState =
  /** Cannot open the course: not assigned, and no course of their own. */
  | "no-access"
  /** Can open it; nothing recorded under their email. */
  | "no-activity"
  /** Can open it; something recorded, but no lesson passed. */
  | "activity-no-lessons"
  /** Some lessons passed, not all of the lessons built today. */
  | "in-progress"
  /** Every lesson built today passed. A final may or may not have been tried. */
  | "all-lessons-passed";

export interface ProgressCounts {
  /** Everyone in the rows given. */
  people: number;
  /** HR assigned the course and has not taken it back. May overlap `ownAccess`. */
  assigned: number;
  /** An active enrolment of their own (they paid). May overlap `assigned`. */
  ownAccess: number;
  /** Can open the course: assigned, own access, or both. */
  withAccess: number;
  /** Cannot open the course. `withAccess + noAccess === people`. */
  noAccess: number;
  /** With access, and nothing recorded under their email. */
  accessNoActivity: number;
  /** With access, something recorded, and no lesson passed. */
  activityNoLessons: number;
  /** With access, at least one lesson passed, and not all. */
  inProgress: number;
  /** With access, and every lesson built today passed. */
  allLessonsPassed: number;
  /**
   * With access, and at least one final-assessment try recorded. Independent of
   * the four states above: a try can exist while a newly released lesson is
   * still unpassed.
   */
  finalAttempted: number;
  // withAccess === accessNoActivity + activityNoLessons + inProgress + allLessonsPassed
}

export interface TeamProgressSummary {
  /** The team's name, or null for people without a team. */
  team: string | null;
  /** What to show: the team's name, or `NO_TEAM_LABEL`. */
  label: string;
  counts: ProgressCounts;
}

export interface ProgressSummary {
  total: ProgressCounts;
  /** Teams A to Z, then people without a team. Only teams with someone in these rows. */
  byTeam: TeamProgressSummary[];
}

type Person = Pick<MemberProgress, "hasAccess" | "assigned" | "ownAccess" | "lessonsPassed" | "finalAttempts" | "lastActive">;

/**
 * True when anything is recorded under this person's email: a lesson attempt
 * or a final try. `lastActive` is the newest of both (lesson `updated_at`,
 * final `taken_at`), so a person who only failed lesson checks still has it.
 */
export function hasRecordedActivity(p: Pick<MemberProgress, "lessonsPassed" | "finalAttempts" | "lastActive">): boolean {
  return p.lastActive !== null || p.lessonsPassed > 0 || p.finalAttempts > 0;
}

/** Whether `lessonsPassed` covers every lesson built today. Never true when none are built. */
function passedAll(lessonsPassed: number, totalLessons: number): boolean {
  return Number.isFinite(totalLessons) && totalLessons > 0 && lessonsPassed >= totalLessons;
}

export function progressState(p: Person, totalLessons: number): ProgressState {
  if (!p.hasAccess) return "no-access";
  if (!hasRecordedActivity(p)) return "no-activity";
  if (p.lessonsPassed <= 0) return "activity-no-lessons";
  return passedAll(p.lessonsPassed, totalLessons) ? "all-lessons-passed" : "in-progress";
}

/**
 * One plain phrase for where someone is, from what Klymb recorded. It says
 * "recorded" rather than "started" because a person on a different Google
 * account than their work email shows no activity here.
 */
export function statusLabel(p: Person, totalLessons: number): string {
  switch (progressState(p, totalLessons)) {
    case "no-access":
      return "Not assigned";
    case "no-activity":
      return p.assigned ? "Assigned, no activity recorded" : "No activity recorded";
    case "activity-no-lessons":
      return "Activity recorded, no lessons passed";
    case "in-progress":
      return "In progress";
    case "all-lessons-passed":
      return p.finalAttempts > 0 ? "Final attempted" : "All lessons passed";
  }
}

export function emptyCounts(): ProgressCounts {
  return {
    people: 0,
    assigned: 0,
    ownAccess: 0,
    withAccess: 0,
    noAccess: 0,
    accessNoActivity: 0,
    activityNoLessons: 0,
    inProgress: 0,
    allLessonsPassed: 0,
    finalAttempted: 0,
  };
}

function countPeople(rows: readonly Person[], totalLessons: number): ProgressCounts {
  const c = emptyCounts();
  for (const p of rows) {
    c.people += 1;
    if (p.assigned) c.assigned += 1;
    if (p.ownAccess) c.ownAccess += 1;
    switch (progressState(p, totalLessons)) {
      case "no-access":
        c.noAccess += 1;
        continue;
      case "no-activity":
        c.accessNoActivity += 1;
        break;
      case "activity-no-lessons":
        c.activityNoLessons += 1;
        break;
      case "in-progress":
        c.inProgress += 1;
        break;
      case "all-lessons-passed":
        c.allLessonsPassed += 1;
        break;
    }
    c.withAccess += 1;
    if (p.finalAttempts > 0) c.finalAttempted += 1;
  }
  return c;
}

/** A blank team name is the same as no team. */
const teamOf = (name: string | null): string | null => (name && name.trim() ? name : null);

/**
 * The counts for these people, and the same counts for each team.
 *
 * `assigned` and `ownAccess` count the people who hold each kind of access,
 * so one person can be in both; `withAccess` counts them once. Nothing here is
 * a percentage, an average or a risk label.
 */
export function summariseProgress(rows: readonly MemberProgress[], totalLessons: number): ProgressSummary {
  const groups = new Map<string | null, MemberProgress[]>();
  for (const p of rows) {
    const key = teamOf(p.teamName);
    const list = groups.get(key);
    if (list) list.push(p);
    else groups.set(key, [p]);
  }

  const named = [...groups.entries()]
    .filter((e): e is [string, MemberProgress[]] => e[0] !== null)
    .sort(([a], [b]) => a.localeCompare(b, "en", { sensitivity: "base" }) || (a < b ? -1 : a > b ? 1 : 0));

  const byTeam: TeamProgressSummary[] = named.map(([team, list]) => ({ team, label: team, counts: countPeople(list, totalLessons) }));
  const unteamed = groups.get(null);
  if (unteamed) byTeam.push({ team: null, label: NO_TEAM_LABEL, counts: countPeople(unteamed, totalLessons) });

  return { total: countPeople(rows, totalLessons), byTeam };
}
