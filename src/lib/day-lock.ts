export type DayLock = "open" | "previous" | "pay";

/**
 * Why a day is locked, if it is. Days unlock in order: Day N opens once Day
 * N-1 is submitted, so nobody skips ahead. On a paid track Days 2 to 30 also
 * need a paid seat; payment is asked first. A day already submitted always
 * stays open for review.
 */
export function dayLockFor({ day, price, paid, submittedDays }: { day: number; price: number; paid: boolean; submittedDays: Iterable<number> }): DayLock {
  const done = new Set(submittedDays);
  if (day <= 1 || done.has(day)) return "open";
  if (price > 0 && !paid) return "pay";
  return done.has(day - 1) ? "open" : "previous";
}

/** The first day not yet submitted: where the learner picks up. Null once every day is in. */
export function nextDayFor(submittedDays: Iterable<number>, total: number): number | null {
  const done = new Set(submittedDays);
  for (let day = 1; day <= total; day++) if (!done.has(day)) return day;
  return null;
}

/** One wording for a day's button wherever it appears: start, carry on, or look back. */
export function dayActionLabel(day: number, submitted: boolean): string {
  if (submitted) return `Review Day ${day}`;
  return day === 1 ? "Start Day 1" : `Continue Day ${day}`;
}
