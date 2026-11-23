import "server-only";
import { type Db } from "@/lib/db/client";
import { IST, timeZoneOf } from "@/lib/timezone";

/**
 * A new learner's time zone, saved once when their place is made. In its own
 * statement and quiet on failure, so a database without 0048 still enrols
 * them, on India time.
 */
export async function saveLearnerTimeZone(sql: Db, email: string, track: string, timeZone: string | null) {
  const zone = timeZoneOf(timeZone);
  if (!zone || zone === IST) return;
  const { error } = await sql.run`update course.learners set timezone = ${zone} where email = ${email} and track = ${track}`;
  if (error && error.code !== "42703") console.error("learner time zone failed:", error.code, error.message);
}

/** A learner's time zone, India time when it isn't kept (or can't be read). */
export async function learnerTimeZone(sql: Db | null, learnerId: string) {
  if (!sql) return IST;
  const { data } = await sql.row<{ timezone: string }>`select timezone from course.learners where id = ${learnerId}`;
  return timeZoneOf(data?.timezone) ?? IST;
}
