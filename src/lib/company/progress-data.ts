import "server-only";
import { BUILT_LESSONS } from "@/data/system-design/course-app";
import { scopeFor, type CompanyMember } from "@/lib/company/access";
import type { Db } from "@/lib/db/client";
import { SD_COURSE } from "@/lib/sd-offer";

/**
 * The only learning data Klymb holds against a company's people: System
 * Design, which is recorded per email (course.enrollments, lesson_checks,
 * final_attempts). There is no company-level assignment, so nothing here says
 * "assigned" or "overdue": a row is what the person has done under their own
 * work email, and nothing else.
 *
 * Scoped like every company query (scopeFor): HR reads the whole company, a
 * head reads their team, an employee reads their own row. The scope comes
 * from the signed-in member, never from the URL or a form.
 */

export interface MemberProgress {
  email: string;
  name: string | null;
  role: "hr" | "head" | "employee";
  teamName: string | null;
  /** An active System Design enrolment under this email. */
  hasAccess: boolean;
  lessonsPassed: number;
  /** Best final-assessment score, or null when none was taken. */
  finalBest: number | null;
  finalAttempts: number;
  lastActive: string | null;
}

export type ProgressResult =
  | { status: "ok"; rows: MemberProgress[]; totalLessons: number }
  | { status: "unavailable" };

interface Row {
  email: string;
  name: string | null;
  role: MemberProgress["role"];
  team_name: string | null;
  has_access: boolean;
  lessons_passed: number;
  last_lesson_at: string | null;
}

/** Postgres: no such table. */
const UNDEFINED_TABLE = "42P01";

export async function loadProgress(sql: Db, member: CompanyMember): Promise<ProgressResult> {
  const scope = scopeFor(member);
  const people = await sql.rows<Row>`
    select m.email, m.name, m.role, t.name as team_name,
           (e.id is not null) as has_access,
           coalesce(l.passed, 0)::int as lessons_passed,
           l.last_at as last_lesson_at
      from course.company_members m
      left join course.teams t on t.id = m.team_id
      left join course.enrollments e
             on e.email = m.email and e.course = ${SD_COURSE} and e.status = 'active'
      left join lateral (
        select count(*) filter (where passed_at is not null) as passed, max(updated_at) as last_at
          from course.lesson_checks where email = m.email and course = ${SD_COURSE}
      ) l on true
     where m.company_id = ${scope.companyId}::uuid
       and m.removed_at is null
       and (${scope.teamId}::uuid is null or m.team_id = ${scope.teamId}::uuid)
       and (${scope.email}::text is null or m.email = ${scope.email})
     order by lower(coalesce(m.name, m.email))
  `;
  if (people.error || !people.data) return { status: "unavailable" };

  // The final assessment's table can arrive after the code (as in sdProgress): without it, nobody has a final yet.
  const emails = people.data.map((r) => r.email);
  const finals = emails.length
    ? await sql.rows<{ email: string; best: number; attempts: number; last_at: string }>`
        select email, max(score)::int as best, count(*)::int as attempts, max(taken_at) as last_at
          from course.final_attempts
         where course = ${SD_COURSE} and email = any(${emails}::text[])
         group by email
      `
    : { data: [], error: null };
  if (finals.error && finals.error.code !== UNDEFINED_TABLE) return { status: "unavailable" };
  const final = new Map((finals.data ?? []).map((f) => [f.email, f]));

  const totalLessons = BUILT_LESSONS.length;
  return {
    status: "ok",
    totalLessons,
    rows: people.data.map((r) => {
      const f = final.get(r.email);
      const last = [r.last_lesson_at, f?.last_at].filter((d): d is string => !!d).sort().pop() ?? null;
      return {
        email: r.email,
        name: r.name,
        role: r.role,
        teamName: r.team_name,
        hasAccess: r.has_access,
        lessonsPassed: Math.min(r.lessons_passed, totalLessons),
        finalBest: f?.best ?? null,
        finalAttempts: f?.attempts ?? 0,
        lastActive: last,
      };
    }),
  };
}
