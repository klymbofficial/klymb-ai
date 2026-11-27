import "server-only";
import { createHash } from "node:crypto";
import { LESSON_RELEASES } from "@/data/system-design/course-app";
import type { CompanyMember } from "@/lib/company/access";
import { lessonStates, todayIst, type LessonState } from "@/lib/company/learner-plan";
import { SYSTEM_DESIGN, type TrackedCourse, type TrackedLesson } from "@/lib/company/upskill-course";
import type { Db } from "@/lib/db/client";
import { SD_COURSE } from "@/lib/sd-offer";
import { FINAL_MARK } from "@/lib/sd-pace";

/**
 * One employee's own record on a course their company assigned (user,
 * 26 Nov): the assignment (required or not, due, when), every lesson check,
 * every final try, and whether they also hold a refundable seat of their own
 * (which keeps the public course's one-a-day rule). Null when the company
 * didn't assign it to them; undefined when it can't be read.
 */

export interface LearnerCheck { bestScore: number; attempts: number; passedAt: string | null }
export interface LearnerFinal { attempt: number; score: number; at: string }

export interface LearnerRecord {
  course: TrackedCourse;
  name: string | null;
  requirement: "required" | "recommended";
  dueOn: string | null;
  assignedAt: string | null;
  checks: Map<string, LearnerCheck>;
  passed: Set<string>;
  states: Map<string, LessonState>;
  finals: LearnerFinal[];
  finalBest: number | null;
  /** When the final first reached the mark: the certificate's date. */
  certifiedAt: string | null;
  /** A paid seat of their own whose fee can still come back. */
  refundable: boolean;
  /** The lesson to do next, or null once every lesson is passed. */
  next: TrackedLesson | null;
}

const UNDEFINED_TABLE = "42P01";
const ORDER = SYSTEM_DESIGN.lessons.map((l) => l.id);

export async function loadLearner(sql: Db, member: CompanyMember, now = new Date()): Promise<LearnerRecord | null | undefined> {
  const [assignment, person, checks, finals, seat] = await Promise.all([
    sql.row<{ requirement: "required" | "recommended"; due_on: string | null; added_at: string }>`
      select n.requirement, n.due_on::text as due_on, r.added_at
        from course.company_assignment_recipients r
        join course.company_assignments n on n.id = r.assignment_id
       where r.company_id = ${member.companyId}::uuid and r.email = ${member.email} and r.course = ${SD_COURSE} and r.revoked_at is null
       order by r.added_at desc
       limit 1
    `,
    sql.row<{ name: string | null }>`
      select name from course.company_members where company_id = ${member.companyId}::uuid and email = ${member.email} and removed_at is null
    `,
    sql.rows<{ lesson: string; best_score: number; attempts: number; passed_at: string | null }>`
      select lesson, best_score, attempts, passed_at from course.lesson_checks where email = ${member.email} and course = ${SD_COURSE}
    `,
    sql.rows<{ attempt: number; score: number; taken_at: string }>`
      select attempt, score, taken_at from course.final_attempts where email = ${member.email} and course = ${SD_COURSE} order by attempt
    `,
    sql.row<{ refundable: boolean }>`
      select (e.source = 'payment' and p.status = 'paid') as refundable
        from course.enrollments e
        left join course.payments p on p.id = e.payment_id
       where e.email = ${member.email} and e.course = ${SD_COURSE} and e.status = 'active'
    `,
  ]);
  if (assignment.error || person.error || checks.error || seat.error) return undefined;
  if (finals.error && finals.error.code !== UNDEFINED_TABLE) return undefined;
  if (!assignment.data) return null;

  const map = new Map<string, LearnerCheck>();
  for (const c of checks.data ?? []) {
    map.set(c.lesson, { bestScore: c.best_score, attempts: c.attempts, passedAt: c.passed_at ? new Date(c.passed_at).toISOString() : null });
  }
  const passed = new Set([...map].filter(([, c]) => c.passedAt).map(([id]) => id));
  const states = lessonStates(ORDER, passed, LESSON_RELEASES, todayIst(now));
  const tries = (finals.data ?? []).map((f) => ({ attempt: f.attempt, score: f.score, at: new Date(f.taken_at).toISOString() }));
  const best = tries.length ? Math.max(...tries.map((f) => f.score)) : null;
  return {
    course: SYSTEM_DESIGN,
    name: person.data?.name ?? null,
    requirement: assignment.data.requirement,
    dueOn: assignment.data.requirement === "required" ? assignment.data.due_on : null,
    assignedAt: new Date(assignment.data.added_at).toISOString(),
    checks: map,
    passed,
    states,
    finals: tries,
    finalBest: best,
    certifiedAt: tries.find((f) => f.score >= FINAL_MARK)?.at ?? null,
    refundable: !!seat.data?.refundable,
    next: SYSTEM_DESIGN.lessons.find((l) => !passed.has(l.id)) ?? null,
  };
}

/** A stable certificate reference for this person, course and company: the same every time it's printed. */
export const certificateId = (email: string, course: string, companyId: string) =>
  createHash("sha256").update(`${email}|${course}|${companyId}`).digest("hex").slice(0, 10).toUpperCase().replace(/^(.{4})(.{4})(.{2})$/, "$1-$2-$3");
