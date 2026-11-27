import "server-only";
import { db, type Db } from "@/lib/db/client";
import { SD_COURSE } from "@/lib/sd-offer";
import type { SdProgress } from "@/lib/sd-pace";
import { IST, timeZoneOf } from "@/lib/timezone";

/** Postgres: no such table. */
const UNDEFINED_TABLE = "42P01";

/**
 * What the server holds on one learner, read fresh: the lessons they passed
 * and when, their final attempts, and whether a fee is there to give back.
 * Null when it couldn't be read, so a caller can't mistake that for no progress.
 */
export async function sdProgress(email: string, sql: Db | null = db()): Promise<SdProgress | null> {
  if (!sql) return null;
  const [passes, finals, seat, zone, claim] = await Promise.all([
    sql.rows<{ lesson: string; passed_at: string }>`
      select lesson, passed_at from course.lesson_checks
       where email = ${email} and course = ${SD_COURSE} and passed_at is not null
    `,
    sql.rows<{ attempt: number; score: number; taken_at: string }>`
      select attempt, score, taken_at from course.final_attempts
       where email = ${email} and course = ${SD_COURSE}
       order by attempt
    `,
    sql.row<{ refundable: boolean }>`
      select (e.source = 'payment' and p.status = 'paid') as refundable
        from course.enrollments e
        left join course.payments p on p.id = e.payment_id
       where e.email = ${email} and e.course = ${SD_COURSE} and e.status = 'active'
    `,
    // On its own, so a database without 0048 still reads progress, on India time.
    sql.row<{ timezone: string }>`select timezone from course.enrollments where email = ${email} and course = ${SD_COURSE}`,
    // On its own too, so a database without 0049 still reads progress.
    sql.row<{ refund_claimed_at: string | null }>`
      select p.refund_claimed_at from course.enrollments e join course.payments p on p.id = e.payment_id
       where e.email = ${email} and e.course = ${SD_COURSE}
    `,
  ]);
  // Code can go live before its migration. Only the final needs this table, so lesson checks mustn't stop without it.
  const noFinals = finals.error?.code === UNDEFINED_TABLE;
  const failed = passes.error ?? (noFinals ? null : finals.error) ?? seat.error;
  if (failed) {
    console.error("progress read failed:", failed.code, failed.message);
    return null;
  }
  return {
    passes: (passes.data ?? []).map((p) => ({ lesson: p.lesson, at: new Date(p.passed_at).toISOString() })),
    finals: (finals.data ?? []).map((f) => ({ attempt: f.attempt, score: f.score, at: new Date(f.taken_at).toISOString() })),
    refundable: !!seat.data?.refundable,
    timeZone: timeZoneOf(zone.data?.timezone) ?? IST,
    refundClaimedAt: claim.data?.refund_claimed_at ? new Date(claim.data.refund_claimed_at).toISOString() : null,
  };
}

/**
 * Puts a seat on the learner's own time zone, from the device they open the
 * course on, until their first lesson check passes. From then on it's fixed,
 * so moving a clock can't stretch a day. Quiet on failure: a seat it can't
 * update stays on its zone (India time by default).
 */
export async function settleSdTimeZone(email: string, timeZone: string | null, sql: Db | null = db()) {
  const zone = timeZoneOf(timeZone);
  if (!sql || !zone) return;
  const { error } = await sql.run`
    update course.enrollments set timezone = ${zone}, updated_at = now()
     where email = ${email} and course = ${SD_COURSE} and timezone <> ${zone}
       and not exists (
         select 1 from course.lesson_checks c
          where c.email = ${email} and c.course = ${SD_COURSE} and c.passed_at is not null
       )
  `;
  if (error && error.code !== "42703") console.error("time zone update failed:", error.code, error.message);
}
