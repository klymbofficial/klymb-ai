import "server-only";
import type { Db } from "@/lib/db/client";
import { COMPANY_ROLES, LEGACY_ROLES, type CompanyRole, type GrantableRole } from "@/lib/company/access";
import { teamKey, type AddContext, type ExistingPerson, type PlannedPerson } from "@/lib/company/people";

/**
 * The People and Teams queries. Every one is scoped to a company id that the
 * caller took from the signed-in admin (requireCompany / adminFor), never
 * from the form, so an admin can only ever touch their own company.
 *
 * Responsibilities live in course.company_member_roles (0047), one row each.
 * Reads fall back to the old company_members.role when that table isn't
 * there yet (a preview against an unmigrated database); writes need it.
 */

/** Postgres: no such table. */
const UNDEFINED_TABLE = "42P01";

export interface PersonRow {
  email: string;
  name: string | null;
  roles: CompanyRole[];
  /** The team they lead, when they are a team lead. */
  lead_team_id: string | null;
  team_id: string | null;
  team_name: string | null;
  added_at: string;
  removed_at: string | null;
}

export interface TeamRow {
  id: string;
  name: string;
  members: number;
  lead_email: string | null;
  lead_name: string | null;
}

export interface CompanyPeople {
  name: string;
  seatCount: number;
  active: PersonRow[];
  removed: PersonRow[];
  teams: TeamRow[];
}

interface RoleRow {
  email: string;
  role: string;
  team_id: string | null;
}

/** Every responsibility in this company, by email; or, before 0047, each person's one old role. */
async function rolesByEmail(sql: Db, companyId: string, legacy: { email: string; role: string; team_id: string | null }[]) {
  const { data, error } = await sql.rows<RoleRow>`
    select email, role, team_id from course.company_member_roles where company_id = ${companyId}::uuid
  `;
  if (error && error.code !== UNDEFINED_TABLE) return null;
  const rows: RoleRow[] = error
    ? legacy.map((p) => ({ email: p.email, role: LEGACY_ROLES[p.role] ?? "employee", team_id: p.role === "head" ? p.team_id : null }))
    : (data ?? []);
  const map = new Map<string, { roles: CompanyRole[]; leadTeamId: string | null }>();
  for (const r of rows) {
    if (!(COMPANY_ROLES as readonly string[]).includes(r.role)) continue;
    const entry = map.get(r.email) ?? { roles: [], leadTeamId: null };
    entry.roles.push(r.role as CompanyRole);
    if (r.role === "team_lead") entry.leadTeamId = r.team_id;
    map.set(r.email, entry);
  }
  for (const e of map.values()) e.roles = COMPANY_ROLES.filter((r) => e.roles.includes(r));
  return map;
}

export async function loadCompanyPeople(sql: Db, companyId: string): Promise<CompanyPeople | null> {
  const [company, people, teams] = await Promise.all([
    sql.row<{ name: string; seat_count: number }>`
      select name, seat_count from course.companies where id = ${companyId}::uuid
    `,
    sql.rows<Omit<PersonRow, "roles" | "lead_team_id"> & { role: string }>`
      select m.email, m.name, m.role, m.team_id, t.name as team_name, m.added_at, m.removed_at
        from course.company_members m
        left join course.teams t on t.id = m.team_id
       where m.company_id = ${companyId}::uuid
       order by lower(coalesce(m.name, m.email))
    `,
    sql.rows<{ id: string; name: string; members: number }>`
      select t.id, t.name,
             (select count(*)::int from course.company_members m where m.team_id = t.id and m.removed_at is null) as members
        from course.teams t
       where t.company_id = ${companyId}::uuid
       order by lower(t.name)
    `,
  ]);
  if (company.error || people.error || teams.error || !company.data) return null;
  const all = people.data ?? [];
  const roles = await rolesByEmail(sql, companyId, all);
  if (!roles) return null;

  const rows: PersonRow[] = all.map(({ role: _legacy, ...p }) => {
    const r = p.removed_at ? undefined : roles.get(p.email);
    return { ...p, roles: r?.roles ?? [], lead_team_id: r?.leadTeamId ?? null };
  });
  const active = rows.filter((p) => !p.removed_at);
  return {
    name: company.data.name,
    seatCount: company.data.seat_count,
    active,
    removed: rows.filter((p) => p.removed_at).sort((a, b) => (b.removed_at! > a.removed_at! ? 1 : -1)),
    teams: (teams.data ?? []).map((t) => {
      const lead = active.find((p) => p.lead_team_id === t.id);
      return { ...t, lead_email: lead?.email ?? null, lead_name: lead?.name ?? null };
    }),
  };
}

/** The facts planAdd needs about these emails, in this company only, read in one round of queries. */
export async function loadAddContext(sql: Db, companyId: string, emails: string[]): Promise<AddContext | null> {
  const [seats, teams, existing] = await Promise.all([
    sql.row<{ seat_count: number; active: number }>`
      select c.seat_count,
             (select count(*)::int from course.company_members m where m.company_id = c.id and m.removed_at is null) as active
        from course.companies c where c.id = ${companyId}::uuid
    `,
    sql.rows<{ id: string; name: string }>`select id, name from course.teams where company_id = ${companyId}::uuid`,
    sql.rows<{ email: string; removed_at: string | null }>`
      select email, removed_at from course.company_members
       where company_id = ${companyId}::uuid and email = any(${emails}::text[])
    `,
  ]);
  if (seats.error || teams.error || existing.error || !seats.data) return null;
  return {
    seatCount: seats.data.seat_count,
    activeMembers: seats.data.active,
    teams: new Map((teams.data ?? []).map((t) => [teamKey(t.name), t.id])),
    existing: new Map<string, ExistingPerson>((existing.data ?? []).map((e) => [e.email, { removed: e.removed_at !== null }])),
  };
}

/**
 * Adds everyone, with their first responsibility, in one statement, or no
 * one. The seat limit, people already active here and teams are checked again
 * inside the statement, so a change since planning can't produce a
 * half-import. A removed member of this company comes back with their old row
 * (and their data). The same email may be in other companies; that is fine.
 * Returns how many were added, or null on a database error.
 */
export async function insertPeople(sql: Db, companyId: string, people: PlannedPerson[], by: string): Promise<number | null> {
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
           where m.company_id = ${companyId}::uuid and m.removed_at is null
        ) as free,
        not exists (
          select 1 from input i
           where i.team_id is not null
             and not exists (select 1 from course.teams t where t.id = i.team_id and t.company_id = ${companyId}::uuid)
        ) as teams_ok
    ), added as (
      insert into course.company_members as m (email, company_id, team_id, role, name)
      select i.email, ${companyId}::uuid, i.team_id, case i.role when 'admin' then 'hr' else 'employee' end, i.name
        from input i, guard g
       where g.fits and g.free and g.teams_ok
      on conflict (company_id, email) do update
         set removed_at = null, team_id = excluded.team_id, role = excluded.role,
             name = coalesce(excluded.name, m.name), added_at = now()
       where m.removed_at is not null
      returning m.email
    ), granted as (
      insert into course.company_member_roles (company_id, email, role, granted_by)
      select ${companyId}::uuid, a.email, i.role, ${by}
        from added a join input i on i.email = a.email
      on conflict (company_id, email, role) do nothing
      returning email
    )
    select a.email from added a
  `;
  if (error) {
    console.error("company people insert failed:", error.code, error.message);
    return null;
  }
  return data?.length ?? 0;
}

export interface PersonInCompany {
  email: string;
  name: string | null;
  roles: CompanyRole[];
  teamId: string | null;
  leadTeamId: string | null;
  removed: boolean;
}

/** The person an admin is acting on, in this company, whether removed or not. undefined on a database error. */
export async function loadPerson(sql: Db, companyId: string, email: string): Promise<PersonInCompany | null | undefined> {
  const { data, error } = await sql.row<{ email: string; name: string | null; role: string; team_id: string | null; removed_at: string | null }>`
    select email, name, role, team_id, removed_at from course.company_members
     where email = ${email} and company_id = ${companyId}::uuid
  `;
  if (error) return undefined;
  if (!data) return null;
  const roles = await rolesByEmail(sql, companyId, [data]);
  if (!roles) return undefined;
  const r = data.removed_at ? undefined : roles.get(data.email);
  return { email: data.email, name: data.name, roles: r?.roles ?? [], teamId: data.team_id, leadTeamId: r?.leadTeamId ?? null, removed: data.removed_at !== null };
}

/** Active people holding the admin responsibility. */
export async function activeAdminCount(sql: Db, companyId: string): Promise<number | null> {
  const { data, error } = await sql.scalar<number>`
    select count(*)::int from course.company_member_roles r
      join course.company_members m on m.company_id = r.company_id and m.email = r.email
     where r.company_id = ${companyId}::uuid and r.role = 'admin' and m.removed_at is null
  `;
  return error ? null : (data ?? 0);
}

/**
 * Removes a person from this company: stamps removed_at (their row and data
 * stay), ends their responsibilities here, and deletes their sign-in code
 * unless they are still in another company. The safety rules are checked
 * again inside the statement: never yourself, never the last admin. Returns 1
 * when removed, 0 when a rule stopped it, null on a database error.
 */
export async function removePersonRow(sql: Db, companyId: string, email: string, actorEmail: string): Promise<number | null> {
  const { data, error } = await sql.scalar<number>`
    with r as (
      update course.company_members m
         set removed_at = now()
       where m.email = ${email} and m.company_id = ${companyId}::uuid and m.removed_at is null
         and m.email <> ${actorEmail}
         and (
           not exists (select 1 from course.company_member_roles a
                        where a.company_id = m.company_id and a.email = m.email and a.role = 'admin')
           or (select count(*) from course.company_member_roles a
                 join course.company_members o on o.company_id = a.company_id and o.email = a.email
                where a.company_id = ${companyId}::uuid and a.role = 'admin' and o.removed_at is null) > 1
         )
      returning m.email
    ), ended as (
      delete from course.company_member_roles x using r
       where x.company_id = ${companyId}::uuid and x.email = r.email
      returning 1
    ), codes as (
      delete from course.company_signin_codes s using r
       where s.email = r.email
         and not exists (select 1 from course.company_members o
                          where o.email = r.email and o.removed_at is null and o.company_id <> ${companyId}::uuid)
      returning 1
    )
    select count(*)::int from r
  `;
  if (error) {
    console.error("company person remove failed:", error.code, error.message);
    return null;
  }
  return data ?? 0;
}

/**
 * Sets the responsibilities an admin grants on the People page (everything
 * but team lead, which the Teams page sets). Adds the missing ones and ends
 * the rest, in one statement; the last admin is kept an admin inside it too.
 * Returns whether the person was found and nothing was refused, or null on a
 * database error.
 */
export async function setMemberRoles(sql: Db, companyId: string, email: string, roles: readonly GrantableRole[], by: string): Promise<boolean | null> {
  const wanted = [...roles];
  const { data, error } = await sql.row<{ found: number; kept_admin: boolean }>`
    with target as (
      select email from course.company_members
       where company_id = ${companyId}::uuid and email = ${email} and removed_at is null
    ), others as (
      select count(*)::int as n from course.company_member_roles a
        join course.company_members o on o.company_id = a.company_id and o.email = a.email
       where a.company_id = ${companyId}::uuid and a.role = 'admin' and o.removed_at is null and a.email <> ${email}
    ), ended as (
      delete from course.company_member_roles r
       where r.company_id = ${companyId}::uuid and r.email in (select email from target)
         and r.role <> 'team_lead' and r.role <> all(${wanted}::text[])
         and (r.role <> 'admin' or (select n from others) > 0)
      returning r.role
    ), added as (
      insert into course.company_member_roles (company_id, email, role, granted_by)
      select ${companyId}::uuid, t.email, w.role, ${by}
        from target t, unnest(${wanted}::text[]) as w(role)
      on conflict (company_id, email, role) do nothing
      returning role
    )
    select (select count(*) from target)::int as found,
           ('admin' = any(${wanted}::text[])
             or not exists (select 1 from course.company_member_roles r
                             where r.company_id = ${companyId}::uuid and r.email = ${email} and r.role = 'admin')
             or (select n from others) > 0) as kept_admin
  `;
  if (error) {
    console.error("company roles update failed:", error.code, error.message);
    return null;
  }
  return !!data && data.found === 1 && data.kept_admin;
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
 * Makes `email` the lead of `teamId`, moving them onto that team. The old
 * lead, if any, stays on the team and keeps their other responsibilities.
 * Someone who led another team leads this one instead. One statement; the
 * one-lead rule is checked once every row has changed. 1, 0, or null.
 */
export async function setTeamLead(sql: Db, companyId: string, teamId: string, email: string, by: string): Promise<number | null> {
  const { data, error } = await sql.rows<{ email: string }>`
    with team as (
      select id from course.teams where id = ${teamId}::uuid and company_id = ${companyId}::uuid
    ), target as (
      select email from course.company_members
       where email = ${email} and company_id = ${companyId}::uuid and removed_at is null
         and exists (select 1 from team)
    ), stepped_down as (
      -- Only when the new lead qualifies, so a refused change never leaves the team without one.
      delete from course.company_member_roles r
       where r.company_id = ${companyId}::uuid and r.role = 'team_lead' and r.team_id = ${teamId}::uuid
         and r.email <> ${email} and exists (select 1 from target)
      returning r.email
    ), moved as (
      update course.company_members m
         set team_id = ${teamId}::uuid
       where m.company_id = ${companyId}::uuid and m.email in (select email from target)
      returning m.email
    )
    insert into course.company_member_roles as r (company_id, email, role, team_id, granted_by)
    select ${companyId}::uuid, t.email, 'team_lead', ${teamId}::uuid, ${by} from target t
    on conflict (company_id, email, role) do update
       set team_id = excluded.team_id, granted_by = excluded.granted_by, granted_at = now()
    returning r.email
  `;
  if (error) {
    console.error("company team lead failed:", error.code, error.message);
    return null;
  }
  return data?.length ?? 0;
}

/**
 * Moves a person to a team, or to no team (null). A lead who changes team
 * stops leading the old one, so it is left without a lead rather than gaining
 * a second one; everything else they hold stays. 1, 0, or null.
 */
export async function movePersonRow(sql: Db, companyId: string, email: string, teamId: string | null): Promise<number | null> {
  const { data, error } = await sql.scalar<number>`
    with moved as (
      update course.company_members m
         set team_id = ${teamId}::uuid,
             -- The old column's own rule (a head has a team) is checked at once, so it is set here too.
             role = case when m.role = 'head' and m.team_id is distinct from ${teamId}::uuid then 'employee' else m.role end
       where m.email = ${email} and m.company_id = ${companyId}::uuid and m.removed_at is null
         and (${teamId}::uuid is null or exists (
           select 1 from course.teams t where t.id = ${teamId}::uuid and t.company_id = ${companyId}::uuid
         ))
      returning m.email
    ), stepped_down as (
      delete from course.company_member_roles r using moved
       where r.company_id = ${companyId}::uuid and r.email = moved.email and r.role = 'team_lead'
         and r.team_id is distinct from ${teamId}::uuid
      returning 1
    )
    select count(*)::int from moved
  `;
  if (error) {
    console.error("company person move failed:", error.code, error.message);
    return null;
  }
  return data ?? 0;
}
