import "server-only";
import type { CompanyMember } from "@/lib/company/access";
import { loadProgress, type MemberProgress } from "@/lib/company/progress-data";
import type { LessonCheck } from "@/lib/company/upskill-view";
import type { Db } from "@/lib/db/client";
import { SD_COURSE } from "@/lib/sd-offer";

/**
 * Everything the Upskill course page shows (user, 26 Nov), on top of
 * loadProgress (which already scopes to the viewer and hides the details of
 * anyone the company didn't assign the course to): when each person was
 * given the course, their lesson-by-lesson record, and their last reminder.
 * Lesson records are read only for people whose details the viewer may see.
 */

export interface CoursePerson extends MemberProgress {
  assignedAt: string | null;
  lessons: LessonCheck[];
  lastReminder: { at: string; by: string; outcome: "sent" | "failed" } | null;
}

export interface CourseView {
  totalLessons: number;
  people: CoursePerson[];
}

const UNDEFINED_TABLE = "42P01";

export async function loadCourseView(sql: Db, member: CompanyMember): Promise<CourseView | null> {
  const progress = await loadProgress(sql, member);
  if (progress.status !== "ok") return null;
  const visible = progress.rows.filter((r) => r.assigned || r.email === member.email).map((r) => r.email);

  const [added, checks, reminders] = await Promise.all([
    sql.rows<{ email: string; added_at: string }>`
      select email, added_at from course.company_assignment_recipients
       where company_id = ${member.companyId}::uuid and course = ${SD_COURSE} and revoked_at is null
    `,
    visible.length
      ? sql.rows<{ email: string; lesson: string; best_score: number; attempts: number; passed_at: string | null }>`
          select email, lesson, best_score, attempts, passed_at from course.lesson_checks
           where course = ${SD_COURSE} and email = any(${visible}::text[])
        `
      : Promise.resolve({ data: [], error: null }),
    sql.rows<{ email: string; sent_at: string; sent_by: string; outcome: "sent" | "failed" }>`
      select distinct on (email) email, sent_at, sent_by, outcome from course.upskill_reminders
       where company_id = ${member.companyId}::uuid and course = ${SD_COURSE}
       order by email, sent_at desc
    `,
  ]);
  if (added.error || checks.error) return null;
  // Before 0100 there are no reminders yet.
  if (reminders.error && reminders.error.code !== UNDEFINED_TABLE) return null;

  const addedAt = new Map((added.data ?? []).map((r) => [r.email, new Date(r.added_at).toISOString()]));
  const lessons = new Map<string, LessonCheck[]>();
  for (const c of checks.data ?? []) {
    const list = lessons.get(c.email) ?? [];
    list.push({ lesson: c.lesson, bestScore: c.best_score, attempts: c.attempts, passedAt: c.passed_at ? new Date(c.passed_at).toISOString() : null });
    lessons.set(c.email, list);
  }
  const last = new Map((reminders.data ?? []).map((r) => [r.email, { at: new Date(r.sent_at).toISOString(), by: r.sent_by, outcome: r.outcome }]));

  return {
    totalLessons: progress.totalLessons,
    people: progress.rows.map((r) => ({
      ...r,
      assignedAt: r.assigned ? addedAt.get(r.email) ?? null : null,
      lessons: lessons.get(r.email) ?? [],
      lastReminder: last.get(r.email) ?? null,
    })),
  };
}

/** The last reminder to this person for this course, or null; undefined when it can't be read. */
export async function lastReminderAt(sql: Pick<Db, "row">, companyId: string, email: string): Promise<Date | null | undefined> {
  const { data, error } = await sql.row<{ sent_at: string }>`
    select sent_at from course.upskill_reminders
     where company_id = ${companyId}::uuid and course = ${SD_COURSE} and email = ${email} and outcome = 'sent'
     order by sent_at desc limit 1
  `;
  if (error) return error.code === UNDEFINED_TABLE ? null : undefined;
  return data ? new Date(data.sent_at) : null;
}

export async function recordReminder(sql: Pick<Db, "run">, r: { companyId: string; email: string; by: string; outcome: "sent" | "failed" }): Promise<boolean> {
  const { error } = await sql.run`
    insert into course.upskill_reminders (company_id, email, course, sent_by, outcome)
    values (${r.companyId}::uuid, ${r.email}, ${SD_COURSE}, ${r.by}, ${r.outcome})
  `;
  return !error;
}

/** One person's requirement and due date (0100's function). */
export async function changeLearnerAssignment(
  sql: Pick<Db, "scalar">,
  c: { companyId: string; email: string; requirement: "required" | "recommended"; dueOn: string | null; by: string; scopeTeamId: string | null; label: string },
): Promise<"updated" | "moved" | "none" | "invalid" | null> {
  const { data, error } = await sql.scalar<string>`
    select course.change_learner_assignment(${c.companyId}::uuid, ${c.email}, ${SD_COURSE}, ${c.requirement}, ${c.dueOn}::date, ${c.by}, ${c.scopeTeamId}::uuid, ${c.label})
  `;
  if (error) return null;
  return data === "updated" || data === "moved" || data === "none" || data === "invalid" ? data : null;
}
