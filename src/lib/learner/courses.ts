import "server-only";
import { redirect } from "next/navigation";
import { currentEmail } from "@/auth";
import { hasCompanyAssignment, hasCourseAccess } from "@/lib/access";
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
  /** When a company gave it (not a purchase): who, and whether it's required and by when. */
  assigned?: { company: string; requirement: "required" | "recommended"; dueOn: string | null };
}

/** Postgres: no such table. */
const UNDEFINED_TABLE = "42P01";

/**
 * This email's System Design seat, or null without one. Read here rather than
 * in the course app, so the dashboard can show it beside a track. A seat is a
 * paid enrolment, or else a company's assignment of the course to an employee
 * (which is deliberately not an enrolment: see hasCourseAccess).
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
  if (!seat.data) {
    const passed = Math.min(passes.data?.passed ?? 0, LESSON_COUNT);
    // The company's published name, and the assignment's terms; the soonest due first.
    const given = await sql.row<{ company: string; requirement: "required" | "recommended"; due_on: string | null }>`
      select coalesce(nullif(b.published->>'displayName', ''), c.name) as company, n.requirement, n.due_on::text as due_on
        from course.company_assignment_recipients r
        join course.company_members m on m.company_id = r.company_id and m.email = r.email
        join course.company_assignments n on n.id = r.assignment_id
        join course.companies c on c.id = r.company_id
        left join course.company_branding b on b.company_id = c.id
       where r.email = ${email} and r.course = ${SD_COURSE} and r.revoked_at is null and m.removed_at is null
       order by n.due_on nulls last
       limit 1
    `;
    if (given.data) {
      return { passed, total: LESSON_COUNT, finished: false, assigned: { company: given.data.company, requirement: given.data.requirement, dueOn: given.data.due_on } };
    }
    // Before 0050, or on any error reading it: the plain access check, with no details.
    if (!given.error || !(await hasCompanyAssignment(sql, email, SD_COURSE))) return null;
    return { passed, total: LESSON_COUNT, finished: false };
  }
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
