import "server-only";
import { db } from "@/lib/db/client";
import type { Progress } from "@/components/course/course-progress";

/** Postgres: no such table. Code can go live before its migration. */
const UNDEFINED_TABLE = "42P01";

/** This person's progress on one course, as the course components expect it. Empty on any error. */
export async function readCourseProgress(email: string, course: string): Promise<Progress> {
  const sql = db();
  if (!sql) return { done: [], quiz: {} };
  const { data, error } = await sql.rows<{ module: string; done: boolean; quiz_score: number | null; quiz_total: number | null }>`
    select module, done_at is not null as done, quiz_score, quiz_total from course.course_progress
     where email = ${email} and course = ${course}
  `;
  if (error && error.code !== UNDEFINED_TABLE) console.error("course progress read failed:", error.code);
  const rows = data ?? [];
  return {
    done: rows.filter((r) => r.done).map((r) => r.module),
    quiz: Object.fromEntries(rows.filter((r) => r.quiz_score != null && r.quiz_total).map((r) => [r.module, { score: r.quiz_score!, total: r.quiz_total! }])),
  };
}

/**
 * Saves one change: a module marked done or not, or a quiz score, of which
 * only the best is kept. Returns false when it could not be saved.
 */
export async function writeCourseProgress(email: string, course: string, module: string, patch: { done?: boolean; quiz?: { score: number; total: number } }) {
  const sql = db();
  if (!sql) return false;
  const done = patch.done === undefined ? null : patch.done;
  const score = patch.quiz?.score ?? null;
  const total = patch.quiz?.total ?? null;
  const { error } = await sql.run`
    insert into course.course_progress (email, course, module, done_at, quiz_score, quiz_total)
    values (${email}, ${course}, ${module}, case when ${done}::boolean then now() end, ${score}, ${total})
    on conflict (email, course, module) do update set
      done_at = case
        when ${done}::boolean is null then course.course_progress.done_at
        when ${done}::boolean then coalesce(course.course_progress.done_at, now())
        else null
      end,
      quiz_score = case when ${score}::smallint is not null and (course.course_progress.quiz_score is null or ${score}::smallint > course.course_progress.quiz_score) then ${score}::smallint else course.course_progress.quiz_score end,
      quiz_total = case when ${score}::smallint is not null and (course.course_progress.quiz_score is null or ${score}::smallint > course.course_progress.quiz_score) then ${total}::smallint else course.course_progress.quiz_total end,
      updated_at = now()
  `;
  if (error) {
    if (error.code !== UNDEFINED_TABLE) console.error("course progress save failed:", error.code);
    return false;
  }
  return true;
}

/** How far through each course this person is, for the dashboard. Courses they haven't opened are left out. */
export async function courseProgressSummary(email: string): Promise<Record<string, { done: string[] }>> {
  const sql = db();
  if (!sql) return {};
  const { data, error } = await sql.rows<{ course: string; module: string; done: boolean }>`
    select course, module, done_at is not null as done from course.course_progress where email = ${email}
  `;
  if (error && error.code !== UNDEFINED_TABLE) console.error("course progress summary failed:", error.code);
  const out: Record<string, { done: string[] }> = {};
  for (const r of data ?? []) (out[r.course] ??= { done: [] }).done.push(...(r.done ? [r.module] : []));
  return out;
}
