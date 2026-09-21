import { getTrack, tracks } from "@/data/tracks";
import type { DailyChallenge, Track } from "@/types/program";

export function resolveTrack(slug?: string): Track {
  return (slug && getTrack(slug)) || tracks[0];
}

export type DayEntry =
  | { kind: "challenge"; day: number; week: number; challenge: DailyChallenge }
  | { kind: "assessment"; day: number; week: number; title: string; task: string }
  | { kind: "interview"; day: number };

/** Flattens a track into its 30 days. */
export function thirtyDays(track: Track): DayEntry[] {
  const days: DayEntry[] = [];
  for (const w of track.weeks) {
    for (const c of w.challenges) days.push({ kind: "challenge", day: c.day, week: w.week, challenge: c });
    days.push({ kind: "assessment", day: w.assessment.afterDay, week: w.week, title: w.assessment.title, task: w.assessment.task });
  }
  days.push({ kind: "interview", day: 29 }, { kind: "interview", day: 30 });
  return days;
}

/**
 * The calendar date a cohort day falls on.
 *
 * Day 1 is the cohort's start date and each day that follows is the next
 * calendar day, so the 30 days run start → start + 29. Dates are handled in
 * UTC and only ever formatted, never compared against "now".
 */
export function cohortDayDate(cohortStart: string, day: number): string {
  const date = new Date(`${cohortStart}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + (day - 1));
  return date.toISOString().slice(0, 10);
}
