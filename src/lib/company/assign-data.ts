import "server-only";
import type { Db } from "@/lib/db/client";
import type { AssignPerson, Requirement, TargetKind } from "@/lib/company/assign-rules";

/**
 * Company assignments (course.company_assignments and
 * company_assignment_recipients, 0050). The company always comes from the
 * signed-in admin or lead, never from a form; a lead's statements are also
 * limited to their own team inside the SQL.
 */

const fail = (what: string, error: { code?: string; message: string }) => {
  console.error(`company assignment ${what} failed:`, error.code, error.message);
  return null;
};

/** The company's active members, with whether each already has the course. Null on a database error. */
export async function loadAssignPeople(sql: Db, companyId: string, course: string): Promise<AssignPerson[] | null> {
  const { data, error } = await sql.rows<{ email: string; name: string | null; team_id: string | null; assigned: boolean; own_access: boolean }>`
    select m.email, m.name, m.team_id,
           exists (select 1 from course.company_assignment_recipients r
                    where r.company_id = m.company_id and r.email = m.email and r.course = ${course} and r.revoked_at is null) as assigned,
           exists (select 1 from course.enrollments e
                    where e.email = m.email and e.course = ${course} and e.status = 'active') as own_access
      from course.company_members m
     where m.company_id = ${companyId}::uuid and m.removed_at is null
     order by lower(coalesce(m.name, m.email))
  `;
  if (error) return fail("people read", error);
  return (data ?? []).map((r) => ({ email: r.email, name: r.name, teamId: r.team_id, assigned: r.assigned, ownAccess: r.own_access }));
}

export async function loadTeams(sql: Db, companyId: string): Promise<{ id: string; name: string }[] | null> {
  const { data, error } = await sql.rows<{ id: string; name: string }>`
    select id, name from course.teams where company_id = ${companyId}::uuid order by lower(name)
  `;
  if (error) return fail("teams read", error);
  return data ?? [];
}

export interface NewAssignment {
  companyId: string;
  course: string;
  requirement: Requirement;
  dueOn: string | null;
  targetKind: TargetKind;
  teamId: string | null;
  label: string;
  /** From the form, once per submit: a retry with the same key finds the first one. */
  requestKey: string;
  by: string;
  /** Exactly the people the preview showed. */
  emails: string[];
  /** A lead's own team: nobody outside it can be reached. Null for an admin. */
  scopeTeamId: string | null;
}

export type CreateOutcome = { status: "created"; id: string; added: number } | { status: "repeat" } | { status: "changed" };

/**
 * Creates an assignment and its recipients in one statement, all or
 * nothing. Every previewed person must still be an active member (in the
 * lead's team, for a lead) without the course; otherwise nothing is written
 * and the caller shows the preview again. A submit retried with the same
 * request key finds the first one. Two people assigning the same person at
 * once can't both succeed: the database allows one live assignment per
 * person and course. Null on a database error.
 */
export async function createAssignment(sql: Db, a: NewAssignment): Promise<CreateOutcome | null> {
  const { data, error } = await sql.row<{ prior_id: string | null; id: string | null; added: number }>`
    with prior as (
      select id from course.company_assignments where company_id = ${a.companyId}::uuid and request_key = ${a.requestKey}::uuid
    ), cand as (
      select m.email from course.company_members m
       where m.company_id = ${a.companyId}::uuid and m.removed_at is null
         and m.email = any(${a.emails}::text[])
         and (${a.scopeTeamId}::uuid is null or m.team_id = ${a.scopeTeamId}::uuid)
         and not exists (select 1 from course.company_assignment_recipients r
                          where r.company_id = m.company_id and r.email = m.email and r.course = ${a.course} and r.revoked_at is null)
         and not exists (select 1 from course.enrollments e
                          where e.email = m.email and e.course = ${a.course} and e.status = 'active')
    ), go as (
      select (select count(*) from cand) = cardinality(${a.emails}::text[]) and not exists (select 1 from prior) as ok
    ), made as (
      insert into course.company_assignments (company_id, course, requirement, due_on, target_kind, target_team_id, target_label, request_key, created_by)
      select ${a.companyId}::uuid, ${a.course}, ${a.requirement}, ${a.dueOn}::date, ${a.targetKind}, ${a.teamId}::uuid, ${a.label}, ${a.requestKey}::uuid, ${a.by}
        from go where go.ok
      on conflict (company_id, request_key) do nothing
      returning id
    ), added as (
      insert into course.company_assignment_recipients (assignment_id, company_id, email, course)
      select made.id, ${a.companyId}::uuid, cand.email, ${a.course} from made, cand
      returning email
    )
    select (select id from prior) as prior_id, (select id from made) as id, (select count(*)::int from added) as added
  `;
  if (error) return error.code === "23505" ? { status: "changed" } : fail("create", error);
  if (data?.prior_id) return { status: "repeat" };
  if (data?.id) return { status: "created", id: data.id, added: data.added };
  return { status: "changed" };
}

/** Takes one person's live assignment back; the row stays, stamped. Rows changed, or null on a database error. */
export async function revokeRecipient(sql: Db, companyId: string, email: string, course: string, by: string, scopeTeamId: string | null): Promise<number | null> {
  const { data, error } = await sql.run`
    update course.company_assignment_recipients r
       set revoked_at = now(), revoked_by = ${by}
     where r.company_id = ${companyId}::uuid and r.email = ${email} and r.course = ${course} and r.revoked_at is null
       and (${scopeTeamId}::uuid is null or exists (
             select 1 from course.company_members m
              where m.company_id = r.company_id and m.email = r.email and m.team_id = ${scopeTeamId}::uuid))
  `;
  if (error) return fail("revoke", error);
  return data ?? 0;
}

export interface AssignmentSummary {
  id: string;
  course: string;
  requirement: Requirement;
  dueOn: string | null;
  label: string;
  createdBy: string;
  createdAt: string;
  /** The people it reached (on the lead's team, for a lead), fixed when it was confirmed. */
  recipients: { email: string; live: boolean }[];
}

/** The latest assignments, newest first. A lead sees those that reached their team, and only their team's people in each. Null on a database error. */
export async function listAssignments(sql: Db, companyId: string, scopeTeamId: string | null): Promise<AssignmentSummary[] | null> {
  const { data, error } = await sql.rows<{
    id: string; course: string; requirement: Requirement; due_on: string | null; target_label: string; created_by: string; created_at: string;
    emails: string[]; live: boolean[];
  }>`
    select a.id, a.course, a.requirement, a.due_on::text as due_on, a.target_label, a.created_by, a.created_at::text as created_at,
           array_agg(r.email order by r.email) as emails,
           array_agg(r.revoked_at is null order by r.email) as live
      from course.company_assignments a
      join course.company_assignment_recipients r on r.assignment_id = a.id
      left join course.company_members m on m.company_id = r.company_id and m.email = r.email
     where a.company_id = ${companyId}::uuid
       and (${scopeTeamId}::uuid is null or m.team_id = ${scopeTeamId}::uuid)
     group by a.id
     order by a.created_at desc
     limit 50
  `;
  if (error) return fail("list", error);
  return (data ?? []).map((r) => ({
    id: r.id,
    course: r.course,
    requirement: r.requirement,
    dueOn: r.due_on,
    label: r.target_label,
    createdBy: r.created_by,
    createdAt: r.created_at,
    recipients: r.emails.map((email, i) => ({ email, live: r.live[i] })),
  }));
}
