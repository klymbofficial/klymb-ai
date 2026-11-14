import { dayLockFor } from "@/lib/day-lock";
import { MAX_NEW_DAYS_PER_DAY, newDaysOn } from "@/lib/learner/integrity";

/**
 * What a learner should do today, from their own submissions. Pure, so the
 * dashboard and its tests agree with the rules the submit action enforces.
 *
 *  - complete: every day is submitted; there is no "next" day
 *  - open:     the first day not yet submitted can be started now
 *              (`started` is false only for a learner with no submissions)
 *  - pay:      that day needs the full course unlocked first
 *  - paced:    the daily limit on new days is used up; it opens tomorrow
 */
export type TodayAction =
  | { kind: "complete"; total: number }
  | { kind: "open"; day: number; started: boolean }
  | { kind: "pay"; day: number }
  | { kind: "paced"; day: number };

export function todayAction({
  days, submissions, price, paid, today,
}: {
  days: { day: number }[];
  submissions: { day: number; submitted_at: string }[];
  price: number;
  paid: boolean;
  /** Today's date in IST, YYYY-MM-DD. */
  today: string;
}): TodayAction {
  const done = new Set(submissions.map((s) => s.day));
  const next = days.find((d) => !done.has(d.day));
  if (!next) return { kind: "complete", total: days.length };

  const lock = dayLockFor({ day: next.day, price, paid, submittedDays: done });
  if (lock === "pay") return { kind: "pay", day: next.day };
  if (newDaysOn(today, next.day, submissions) >= MAX_NEW_DAYS_PER_DAY) return { kind: "paced", day: next.day };
  return { kind: "open", day: next.day, started: done.size > 0 };
}
