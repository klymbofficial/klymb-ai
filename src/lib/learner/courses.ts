import "server-only";
import { redirect } from "next/navigation";
import { currentEmail } from "@/auth";
import { hasCourseAccess } from "@/lib/access";
import { LESSON_COUNT } from "@/lib/course-app";
import { db } from "@/lib/db/client";
import { getLearnerState } from "@/lib/learner/data";
import { SD_COURSE } from "@/lib/sd-offer";

/** Where a System Design buyer stands, for their card on the dashboard. */
export interface SystemDesignSeat {
  passed: number;
  total: number;
  /** They met the finishing bar: every lesson and the final. */
  finished: boolean;
}

/** Postgres: no such table. */
const UNDEFINED_TABLE = "42P01";

/**
 * This email's System Design seat, or null without one. Read here rather than
 * in the course app, so the dashboard can show it beside a track.
 */
export async function systemDesignSeat(email: string): Promise<SystemDesignSeat | null> {
  const sql = db();
  if (!sql) return null;
  const [seat, passes] = await Promise.all([
    sql.row<{ finished: boolean }>`
      select finished_at is not null as finished from course.enrollments
       where email = ${email} and course = ${SD_COURSE} and status = 'active'
    `,
    sql.row<{ passed: number }>`
      select count(*)::int as passed from course.lesson_checks
       where email = ${email} and course = ${SD_COURSE} and passed_at is not null
    `,
  ]);
  if (seat.error) {
    if (seat.error.code !== UNDEFINED_TABLE) console.error("seat read failed:", seat.error.code, seat.error.message);
    return null;
  }
  if (!seat.data) return null;
  return { passed: Math.min(passes.data?.passed ?? 0, LESSON_COUNT), total: LESSON_COUNT, finished: seat.data.finished };
}

/**
 * Anyone signed in with a course goes to their dashboard, which lists every
 * course they have. Replaces sending System Design buyers straight into that
 * one course, which left a buyer's track out of reach.
 */
export async function redirectToDashboard() {
  const email = await currentEmail();
  if (!email) return;
  if ((await getLearnerState()).state === "enrolled" || (await hasCourseAccess(email, SD_COURSE))) redirect("/learn");
}
