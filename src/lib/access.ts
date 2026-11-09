import "server-only";
import { dayLockFor } from "@/lib/day-lock";
import { db } from "@/lib/db/client";

/**
 * Day 1 is free on every paid track; Days 2 to 30 need a paid seat. Free
 * tracks open everything. Fails open on a database error, so an outage never
 * locks a paying learner out.
 */
export async function hasPaid(email: string, track: string) {
  const sql = db();
  if (!sql) return true;
  // For this track only: paying for a cheaper track never unlocks a dearer one.
  const { data, error } = await sql.rows<{ id: string }>`
    select id from course.payments
     where email = ${email} and track = ${track} and status = 'paid'
     limit 1
  `;
  if (error) return true;
  return !!data?.length;
}

/** Postgres: the table isn't there. */
const UNDEFINED_TABLE = "42P01";

/**
 * Whether this email may open a course sold by enrolment. Fails open like
 * hasPaid, for the same reason: an outage never locks out someone who paid.
 * A missing table is not an outage: the migration hasn't run here, so nobody
 * holds a seat, and opening the course to everyone would give it away.
 *
 * A company can also open it for a member (see hasCompanyAssignment), which
 * is asked only when there is no enrolment, so what paid learners get is
 * exactly what it was.
 */
export async function hasCourseAccess(email: string, course: string) {
  const sql = db();
  if (!sql) return true;
  const { data, error } = await sql.rows<{ id: string }>`
    select id from course.enrollments
     where email = ${email} and course = ${course} and status = 'active'
     limit 1
  `;
  if (error) return error.code !== UNDEFINED_TABLE;
  if (data?.length) return true;
  return hasCompanyAssignment(sql, email, course);
}

/**
 * Whether a company has opened this course for this email: an active member
 * of a company (removed_at is null), holding a non-revoked assignment in that
 * same company. `email` is the Google-verified address of the session; the
 * match is exact and the lookup never trusts a company id from the browser.
 *
 * Unlike the payer check above it fails closed: an error here must never
 * open a company's course. A missing table (migration 0030 not run yet)
 * simply means nobody has been assigned.
 */
export async function hasCompanyAssignment(sql: NonNullable<ReturnType<typeof db>>, email: string, course: string) {
  const { data, error } = await sql.rows<{ email: string }>`
    select a.email
      from course.company_course_assignments a
      join course.company_members m on m.company_id = a.company_id and m.email = a.email
     where a.email = ${email} and a.course = ${course}
       and a.revoked_at is null and m.removed_at is null
     limit 1
  `;
  if (error) {
    if (error.code !== UNDEFINED_TABLE) console.error("company assignment read failed:", error.code, error.message);
    return false;
  }
  return !!data?.length;
}

/** Lessons this email has passed, with the best score. Empty on any error: the course still opens, from what the browser holds. */
export async function lessonPasses(email: string, course: string) {
  const sql = db();
  if (!sql) return {};
  const { data } = await sql.rows<{ lesson: string; best_score: number }>`
    select lesson, best_score from course.lesson_checks
     where email = ${email} and course = ${course} and passed_at is not null
  `;
  return Object.fromEntries((data ?? []).map((r) => [r.lesson, r.best_score]));
}

export type { DayLock } from "@/lib/day-lock";

/** The day lock for a learner, with their payment looked up only when it matters. */
export async function dayLock({ email, track, price, day, submittedDays }: { email: string; track: string; price: number; day: number; submittedDays: number[] }) {
  const needsPayment = price > 0 && day > 1 && !submittedDays.includes(day);
  return dayLockFor({ day, price, paid: needsPayment ? await hasPaid(email, track) : true, submittedDays });
}
