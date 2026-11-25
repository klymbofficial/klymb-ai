import type { Requirement } from "@/lib/company/assign-rules";
import "server-only";
import { BUILT_LESSONS } from "@/data/system-design/course-app";
import { scopeFor, type CompanyMember } from "@/lib/company/access";
import type { Db } from "@/lib/db/client";
import { SD_COURSE } from "@/lib/sd-offer";

/**
 * The only learning data Klymb holds against a company's people: System
 * Design, which is recorded per email (lesson_checks, final_attempts), and
 * whether the company has assigned it (course.company_assignment_recipients,
 * 0050, with the assignment's requirement and due date). A row is what the
 * person has done under their own work email, and nothing else.
 *
 * Company-assigned only. A company member may also be a Klymb learner with
 * courses of their own. Someone else's lessons, scores and last activity are
 * shown only when this company assigned the course; personal access shows as
 * `ownAccess` and nothing more, and isn't counted as access the company gave.
 * A member always sees all of their own.
 *
 * Scoped like every company query (scopeFor): an admin or company head reads
 * the whole company, a team lead their team, anyone else their own row. The scope comes
 * from the signed-in member, never from the URL or a form.
 */

export interface MemberProgress {
  email: string;
  name: string | null;
  teamName: string | null;
  /**
   * Can open the course through this company: assigned and not taken back.
   * On the viewer's own row, also when they paid for it themselves.
   */
  hasAccess: boolean;
  /** The company assigned it, and has not taken it back. */
  assigned: boolean;
  /** For a live assignment: required or recommended, and when it's due (required only). */
  requirement: Requirement | null;
  dueOn: string | null;
  /** An active enrolment of their own (they paid). Its details stay theirs. */
  ownAccess: boolean;
  lessonsPassed: number;
  /** Best final-assessment score, or null when none was taken. */
  finalBest: number | null;
  finalAttempts: number;
  lastActive: string | null;
}

export type ProgressResult =
  | { status: "ok"; rows: MemberProgress[]; totalLessons: number; seatCount: number }
  | { status: "unavailable" };

interface Row {
  email: string;
  name: string | null;
  team_name: string | null;
  assigned: boolean;
  requirement: Requirement | null;
  due_on: string | null;
  own_access: boolean;
  seat_count: number;
  lessons_passed: number;
  last_lesson_at: string | null;
}

/** Postgres: no such table. */
const UNDEFINED_TABLE = "42P01";

export async function loadProgress(sql: Db, member: CompanyMember): Promise<ProgressResult> {
  const scope = scopeFor(member);
  const assigned = await sql.rows<Row>`
    select m.email, m.name, t.name as team_name,
           (a.requirement is not null) as assigned, a.requirement, a.due_on,
           (e.id is not null) as own_access,
           (select seat_count from course.companies where id = m.company_id) as seat_count,
           coalesce(l.passed, 0)::int as lessons_passed,
           l.last_at as last_lesson_at
      from course.company_members m
      left join course.teams t on t.id = m.team_id
      left join course.enrollments e
             on e.email = m.email and e.course = ${SD_COURSE} and e.status = 'active'
      left join lateral (
        select n.requirement, n.due_on::text as due_on
          from course.company_assignment_recipients r
          join course.company_assignments n on n.id = r.assignment_id
         where r.company_id = m.company_id and r.email = m.email and r.course = ${SD_COURSE} and r.revoked_at is null
         limit 1
      ) a on true
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
  // Before 0050 (a preview against an unmigrated database): 0030's table, with no requirement or due date.
  const people = assigned.error?.code === UNDEFINED_TABLE
    ? await sql.rows<Row>`
        select m.email, m.name, t.name as team_name,
               (a.email is not null) as assigned, null as requirement, null as due_on,
               (e.id is not null) as own_access,
               (select seat_count from course.companies where id = m.company_id) as seat_count,
               coalesce(l.passed, 0)::int as lessons_passed,
               l.last_at as last_lesson_at
          from course.company_members m
          left join course.teams t on t.id = m.team_id
          left join course.enrollments e
                 on e.email = m.email and e.course = ${SD_COURSE} and e.status = 'active'
          left join course.company_course_assignments a
                 on a.email = m.email and a.company_id = m.company_id and a.course = ${SD_COURSE} and a.revoked_at is null
          left join lateral (
            select count(*) filter (where passed_at is not null) as passed, max(updated_at) as last_at
              from course.lesson_checks where email = m.email and course = ${SD_COURSE}
          ) l on true
         where m.company_id = ${scope.companyId}::uuid
           and m.removed_at is null
           and (${scope.teamId}::uuid is null or m.team_id = ${scope.teamId}::uuid)
           and (${scope.email}::text is null or m.email = ${scope.email})
         order by lower(coalesce(m.name, m.email))
      `
    : assigned;
  if (people.error || !people.data) return { status: "unavailable" };

  // Whose details this viewer may see: their own, and anyone the company assigned the course to.
  const visible = (r: Row) => r.assigned || r.email === member.email;

  // The final assessment's table can arrive after the code (as in sdProgress): without it, nobody has a final yet.
  const emails = people.data.filter(visible).map((r) => r.email);
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
    seatCount: people.data[0]?.seat_count ?? 0,
    rows: people.data.map((r) => {
      const own = r.email === member.email;
      const base = { email: r.email, name: r.name, teamName: r.team_name, assigned: r.assigned, requirement: r.requirement, dueOn: r.due_on, ownAccess: r.own_access };
      if (!visible(r)) {
        return { ...base, hasAccess: false, lessonsPassed: 0, finalBest: null, finalAttempts: 0, lastActive: null };
      }
      const f = final.get(r.email);
      const last = [r.last_lesson_at, f?.last_at].filter((d): d is string => !!d).sort().pop() ?? null;
      return {
        ...base,
        hasAccess: r.assigned || (own && r.own_access),
        lessonsPassed: Math.min(r.lessons_passed, totalLessons),
        finalBest: f?.best ?? null,
        finalAttempts: f?.attempts ?? 0,
        lastActive: last,
      };
    }),
  };
}
