/**
 * Follow-ups for people who registered for a paid track but haven't paid:
 * 1 hour, 1 day and 3 days after registering, then never again. Pure, so it
 * is unit-tested; the cron route claims and sends.
 */
export const FOLLOWUP_AFTER_HOURS = [1, 24, 72] as const;
export const FOLLOWUP_DONE = FOLLOWUP_AFTER_HOURS.length;

/** The follow-up (1, 2 or 3) now due for a registration at `stage`, or null. */
export function dueFollowup(stage: number, registeredAt: Date, now: Date): 1 | 2 | 3 | null {
  if (stage >= FOLLOWUP_DONE) return null;
  const hours = (now.getTime() - registeredAt.getTime()) / 3_600_000;
  if (hours < FOLLOWUP_AFTER_HOURS[stage]) return null;
  // A late run sends only the latest due step, never a burst of all three.
  let next = stage;
  while (next + 1 < FOLLOWUP_DONE && hours >= FOLLOWUP_AFTER_HOURS[next + 1]) next++;
  return (next + 1) as 1 | 2 | 3;
}
