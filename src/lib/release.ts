import { getTrack } from "@/data/tracks";
import { dayIn, IST } from "@/lib/timezone";

/**
 * A track can take enrolments before its course is out (`opensOn` in
 * data/tracks). It comes out for everyone at once, at midnight India time.
 * Pure, so the server and the browser read it the same way.
 */

/** The date the course opens, while that is still ahead. Null once it is open, or if it never waited. */
export function opensLater(slug: string, now = Date.now()): string | null {
  const on = getTrack(slug)?.opensOn;
  return on && dayIn(now, IST) < on ? on : null;
}

/** A learner's Day 1: the day they enrol, but never before the course opens. */
export function startDateFor(slug: string, today: string): string {
  const on = getTrack(slug)?.opensOn;
  return on && today < on ? on : today;
}

/** "5 December". */
export const releaseDay = (date: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
