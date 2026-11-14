import "server-only";
import type { Db } from "@/lib/db/client";
import { SD_COURSE } from "@/lib/sd-offer";

/**
 * Company course assignments (migration 0030). Every query is scoped to a
 * company id taken from the signed-in HR person (hrFor), never from a form.
 *
 * The seat rule: an assignment needs an active member, and a company can't
 * hold more active members than seat_count (People and Klymb admin enforce
 * that), so assignments can't outnumber seats. The statements below check
 * the count again anyway, inside the insert, so a change since the page was
 * read can't push a company over.
 */

/** The one course a company can assign in the pilot. */
export const ASSIGNABLE_COURSE = SD_COURSE;

export interface AssignState {
  /** An active member of this company. */
  member: boolean;
  /** A non-revoked assignment. */
  assigned: boolean;
  /** Paid for it themselves: no assignment needed. */
  ownAccess: boolean;
  /** Non-revoked assignments held by active members. */
  used: number;
  seats: number;
}

export async function loadAssignState(sql: Db, companyId: string, email: string): Promise<AssignState | null> {
  const { data, error } = await sql.row<{ member: boolean; assigned: boolean; own_access: boolean; used: number; seats: number }>`
    select exists (select 1 from course.company_members m where m.company_id = ${companyId}::uuid and m.email = ${email} and m.removed_at is null) as member,
           exists (select 1 from course.company_course_assignments a where a.company_id = ${companyId}::uuid and a.email = ${email} and a.course = ${ASSIGNABLE_COURSE} and a.revoked_at is null) as assigned,
           exists (select 1 from course.enrollments e where e.email = ${email} and e.course = ${ASSIGNABLE_COURSE} and e.status = 'active') as own_access,
           (select count(*)::int from course.company_course_assignments a
              join course.company_members m on m.company_id = a.company_id and m.email = a.email
             where a.company_id = ${companyId}::uuid and a.course = ${ASSIGNABLE_COURSE} and a.revoked_at is null and m.removed_at is null) as used,
           (select seat_count from course.companies where id = ${companyId}::uuid) as seats
  `;
  if (error || !data || data.seats === null) return null;
  return { member: data.member, assigned: data.assigned, ownAccess: data.own_access, used: data.used, seats: data.seats };
}

/**
 * Assigns the course to one active member of the company, or brings a removed
 * assignment back. One statement: the member, the company and the seat count
 * are all checked inside it. Returns rows written, or null on a database error.
 */
export async function assignOne(sql: Db, companyId: string, email: string, by: string): Promise<number | null> {
  const { data, error } = await sql.run`
    with co as (
      select id, seat_count from course.companies where id = ${companyId}::uuid
    ), target as (
      select m.email from course.company_members m
       where m.company_id = ${companyId}::uuid and m.email = ${email} and m.removed_at is null
    ), used as (
      select count(*)::int as n from course.company_course_assignments a
        join course.company_members m on m.company_id = a.company_id and m.email = a.email
       where a.company_id = ${companyId}::uuid and a.course = ${ASSIGNABLE_COURSE} and a.revoked_at is null and m.removed_at is null
    )
    insert into course.company_course_assignments as a (email, company_id, course, assigned_by)
    select t.email, ${companyId}::uuid, ${ASSIGNABLE_COURSE}, ${by}
      from target t, co, used
     where used.n < co.seat_count
    on conflict (email, course) do update
       set revoked_at = null, revoked_by = null, assigned_by = excluded.assigned_by, assigned_at = now()
     where a.company_id = excluded.company_id and a.revoked_at is not null
  `;
  if (error) {
    console.error("course assign failed:", error.code, error.message);
    return null;
  }
  return data ?? 0;
}

/** Ends one assignment (the row stays, stamped). Returns rows changed, or null on a database error. */
export async function unassignOne(sql: Db, companyId: string, email: string, by: string): Promise<number | null> {
  const { data, error } = await sql.run`
    update course.company_course_assignments
       set revoked_at = now(), revoked_by = ${by}
     where company_id = ${companyId}::uuid and email = ${email}
       and course = ${ASSIGNABLE_COURSE} and revoked_at is null
  `;
  if (error) {
    console.error("course unassign failed:", error.code, error.message);
    return null;
  }
  return data ?? 0;
}

/**
 * Assigns everyone who has no assignment and no course of their own, all or
 * nobody. `expected` is the number the HR person confirmed: if the real
 * number is different now, nothing is assigned. It also assigns nobody if it would
 * pass the seat count. Returns rows written, or null on a database error.
 */
export async function assignEveryoneWithout(sql: Db, companyId: string, expected: number, by: string): Promise<number | null> {
  const { data, error } = await sql.run`
    with co as (
      select id, seat_count from course.companies where id = ${companyId}::uuid
    ), cand as (
      select m.email from course.company_members m
       where m.company_id = ${companyId}::uuid and m.removed_at is null
         and not exists (select 1 from course.company_course_assignments a
                          where a.email = m.email and a.course = ${ASSIGNABLE_COURSE} and a.revoked_at is null)
         and not exists (select 1 from course.enrollments e
                          where e.email = m.email and e.course = ${ASSIGNABLE_COURSE} and e.status = 'active')
    ), used as (
      select count(*)::int as n from course.company_course_assignments a
        join course.company_members m on m.company_id = a.company_id and m.email = a.email
       where a.company_id = ${companyId}::uuid and a.course = ${ASSIGNABLE_COURSE} and a.revoked_at is null and m.removed_at is null
    )
    insert into course.company_course_assignments as a (email, company_id, course, assigned_by)
    select c.email, ${companyId}::uuid, ${ASSIGNABLE_COURSE}, ${by}
      from cand c, co, used
     where (select count(*) from cand) = ${expected}::int
       and used.n + (select count(*) from cand) <= co.seat_count
    on conflict (email, course) do update
       set revoked_at = null, revoked_by = null, assigned_by = excluded.assigned_by, assigned_at = now()
     where a.company_id = excluded.company_id and a.revoked_at is not null
  `;
  if (error) {
    console.error("course assign-all failed:", error.code, error.message);
    return null;
  }
  return data ?? 0;
}
