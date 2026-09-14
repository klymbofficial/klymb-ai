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
