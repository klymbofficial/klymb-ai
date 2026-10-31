import "server-only";
import type { Db } from "@/lib/db/client";
import { teamKey, type AddContext, type ExistingPerson, type PlannedPerson } from "@/lib/company/people";

/**
 * The People and Teams queries. Every one is scoped to a company id that the
 * caller took from the signed-in HR person (requireCompany / hrFor), never
 * from the form, so HR can only ever touch their own company.
 */

export interface PersonRow {
  email: string;
  name: string | null;
  role: "hr" | "head" | "employee";
  team_id: string | null;
  team_name: string | null;
  added_at: string;
  removed_at: string | null;
}

export interface TeamRow {
  id: string;
  name: string;
  members: number;
  head_email: string | null;
  head_name: string | null;
}

export interface CompanyPeople {
  name: string;
  seatCount: number;
  active: PersonRow[];
  removed: PersonRow[];
  teams: TeamRow[];
}

export async function loadCompanyPeople(sql: Db, companyId: string): Promise<CompanyPeople | null> {
  const [company, people, teams] = await Promise.all([
    sql.row<{ name: string; seat_count: number }>`
      select name, seat_count from course.companies where id = ${companyId}::uuid
    `,
    sql.rows<PersonRow>`
      select m.email, m.name, m.role, m.team_id, t.name as team_name, m.added_at, m.removed_at
        from course.company_members m
        left join course.teams t on t.id = m.team_id
       where m.company_id = ${companyId}::uuid
       order by lower(coalesce(m.name, m.email))
    `,
    sql.rows<TeamRow>`
      select t.id, t.name,
             (select count(*)::int from course.company_members m where m.team_id = t.id and m.removed_at is null) as members,
             h.email as head_email, h.name as head_name
        from course.teams t
        left join course.company_members h on h.team_id = t.id and h.role = 'head' and h.removed_at is null
       where t.company_id = ${companyId}::uuid
       order by lower(t.name)
    `,
  ]);
  if (company.error || people.error || teams.error || !company.data) return null;
  const all = people.data ?? [];
  return {
    name: company.data.name,
    seatCount: company.data.seat_count,
    active: all.filter((p) => !p.removed_at),
    removed: all.filter((p) => p.removed_at).sort((a, b) => (b.removed_at! > a.removed_at! ? 1 : -1)),
    teams: teams.data ?? [],
  };
}

/** The facts planAdd needs about these emails, read in one round of queries. */
export async function loadAddContext(sql: Db, companyId: string, emails: string[]): Promise<AddContext | null> {
  const [seats, teams, existing, learners] = await Promise.all([
    sql.row<{ seat_count: number; active: number }>`
      select c.seat_count,
             (select count(*)::int from course.company_members m where m.company_id = c.id and m.removed_at is null) as active
        from course.companies c where c.id = ${companyId}::uuid
    `,
    sql.rows<{ id: string; name: string }>`select id, name from course.teams where company_id = ${companyId}::uuid`,
    sql.rows<{ email: string; company_id: string; removed_at: string | null }>`
      select email, company_id, removed_at from course.company_members where email = any(${emails}::text[])
    `,
    sql.rows<{ email: string }>`select email from course.learners where email = any(${emails}::text[])`,
  ]);
  if (seats.error || teams.error || existing.error || learners.error || !seats.data) return null;
  return {
    seatCount: seats.data.seat_count,
    activeMembers: seats.data.active,
    teams: new Map((teams.data ?? []).map((t) => [teamKey(t.name), t.id])),
    existing: new Map<string, ExistingPerson>(
      (existing.data ?? []).map((e) => [e.email, { sameCompany: e.company_id === companyId, removed: e.removed_at !== null }]),
    ),
    learners: new Set((learners.data ?? []).map((l) => l.email)),
  };
}

/**
 * Adds everyone in one statement, or no one. The seat limit, other
 * companies, learners and teams are checked again inside the statement, so
 * a change since planning can't produce a half-import. A removed member of
 * this company comes back with their old row (and their data).
 * Returns how many were added, or null on a database error.
 */
export async function insertPeople(sql: Db, companyId: string, people: PlannedPerson[]): Promise<number | null> {
  const emails = people.map((p) => p.email);
  const names = people.map((p) => p.name);
  const teamIds = people.map((p) => p.teamId);
  const roles = people.map((p) => p.role);
  const { data, error } = await sql.rows<{ email: string }>`
    with input as (
      select * from unnest(${emails}::text[], ${names}::text[], ${teamIds}::uuid[], ${roles}::text[]) as t(email, name, team_id, role)
    ), guard as (
      select
        (select count(*) from course.company_members m where m.company_id = ${companyId}::uuid and m.removed_at is null)
          + (select count(*) from input)
          <= (select seat_count from course.companies where id = ${companyId}::uuid) as fits,
        not exists (
          select 1 from input i join course.company_members m on m.email = i.email
           where not (m.company_id = ${companyId}::uuid and m.removed_at is not null)
        ) as free,
        not exists (select 1 from input i join course.learners l on l.email = i.email) as not_learners,
        not exists (
          select 1 from input i
           where i.team_id is not null
             and not exists (select 1 from course.teams t where t.id = i.team_id and t.company_id = ${companyId}::uuid)
        ) as teams_ok
    )
    insert into course.company_members as m (email, company_id, team_id, role, name)
    select i.email, ${companyId}::uuid, i.team_id, i.role, i.name
      from input i, guard g
     where g.fits and g.free and g.not_learners and g.teams_ok
    on conflict (email) do update
       set removed_at = null, team_id = excluded.team_id, role = excluded.role,
           name = coalesce(excluded.name, m.name), added_at = now()
     where m.company_id = excluded.company_id and m.removed_at is not null
    returning m.email
  `;
  if (error) {
    console.error("company people insert failed:", error.code, error.message);
    return null;
  }
  return data?.length ?? 0;
}

/** The person HR is acting on, in this company, whether removed or not. */
export async function loadPerson(sql: Db, companyId: string, email: string) {
  const { data, error } = await sql.row<{ email: string; role: string; team_id: string | null; removed_at: string | null }>`
    select email, role, team_id, removed_at from course.company_members
     where email = ${email} and company_id = ${companyId}::uuid
  `;
  if (error) return undefined;
  return data ? { email: data.email, role: data.role, teamId: data.team_id, removed: data.removed_at !== null } : null;
}

export async function activeHrCount(sql: Db, companyId: string): Promise<number | null> {
  const { data, error } = await sql.scalar<number>`
    select count(*)::int from course.company_members
     where company_id = ${companyId}::uuid and role = 'hr' and removed_at is null
  `;
  return error ? null : (data ?? 0);
}

/**
 * Removes a person: stamps removed_at (their row and data stay) and deletes
 * any sign-in code they hold. The safety rules are checked again inside the
 * statement: never yourself, never the last HR person. Returns 1 when
 * removed, 0 when a rule stopped it, null on a database error.
 */
export async function removePersonRow(sql: Db, companyId: string, email: string, actorEmail: string): Promise<number | null> {
  const { data, error } = await sql.scalar<number>`
    with r as (
      update course.company_members m
         set removed_at = now()
       where m.email = ${email} and m.company_id = ${companyId}::uuid and m.removed_at is null
         and m.email <> ${actorEmail}
         and (m.role <> 'hr' or (
           select count(*) from course.company_members h
            where h.company_id = ${companyId}::uuid and h.role = 'hr' and h.removed_at is null
         ) > 1)
      returning m.email
    ), codes as (
      delete from course.company_signin_codes s using r where s.email = r.email returning 1
    )
    select count(*)::int from r
  `;
  if (error) {
    console.error("company person remove failed:", error.code, error.message);
    return null;
  }
  return data ?? 0;
}

/** Creates a team unless one with the same name (ignoring case) exists. 1, 0, or null on error. */
export async function insertTeam(sql: Db, companyId: string, name: string): Promise<number | null> {
  const { data, error } = await sql.run`
    insert into course.teams (company_id, name)
    select ${companyId}::uuid, ${name}
     where not exists (
       select 1 from course.teams t where t.company_id = ${companyId}::uuid and lower(t.name) = lower(${name})
     )
  `;
  if (error?.code === "23505") return 0;
  if (error) {
    console.error("company team create failed:", error.code, error.message);
    return null;
  }
  return data ?? 0;
}

/**
 * Makes `email` the head of `teamId`, moving them onto that team. The old
 * head, if any, stays on the team as an employee. Both rows change in one
 * statement; the one-head rule is checked once both have. 1, 0, or null.
 */
export async function setTeamHead(sql: Db, companyId: string, teamId: string, email: string): Promise<number | null> {
  const { data, error } = await sql.rows<{ email: string }>`
    with team as (
      select id from course.teams where id = ${teamId}::uuid and company_id = ${companyId}::uuid
    ), target as (
      -- The new head must be an active, non-HR member of this company.
      select email from course.company_members
       where email = ${email} and company_id = ${companyId}::uuid and removed_at is null and role <> 'hr'
    ), demote as (
      -- Only when the new head qualifies, so a refused change never leaves the team headless.
      update course.company_members m
         set role = 'employee'
       where m.company_id = ${companyId}::uuid and m.team_id = ${teamId}::uuid and m.role = 'head'
         and m.removed_at is null and m.email <> ${email}
         and exists (select 1 from team) and exists (select 1 from target)
      returning m.email
    )
    update course.company_members m
       set role = 'head', team_id = ${teamId}::uuid
     where m.email = ${email} and m.company_id = ${companyId}::uuid and m.removed_at is null
       and m.role <> 'hr' and exists (select 1 from team)
    returning m.email
  `;
  if (error) {
    console.error("company team head failed:", error.code, error.message);
    return null;
  }
  return data?.length ?? 0;
}

/**
 * Moves a person to a team, or to no team (null). A head who changes team
 * becomes an employee there, so their old team is left without a head
 * rather than gaining a second one. 1, 0, or null.
 */
export async function movePersonRow(sql: Db, companyId: string, email: string, teamId: string | null): Promise<number | null> {
  const { data, error } = await sql.run`
    update course.company_members m
       set team_id = ${teamId}::uuid,
           role = case when m.role = 'head' and m.team_id is distinct from ${teamId}::uuid then 'employee' else m.role end
     where m.email = ${email} and m.company_id = ${companyId}::uuid and m.removed_at is null
       and (${teamId}::uuid is null or exists (
         select 1 from course.teams t where t.id = ${teamId}::uuid and t.company_id = ${companyId}::uuid
       ))
  `;
  if (error) {
    console.error("company person move failed:", error.code, error.message);
    return null;
  }
  return data ?? 0;
}
