import type { Db } from "@/lib/db/client";
import { workspaceSlug, type MemberRow } from "@/lib/company/access";

/**
 * The queries that find a signed-in email's memberships and responsibilities.
 * Kept apart from src/lib/company/auth.ts (which is server-only) so the opt-in
 * database test can run these exact queries against a real Postgres.
 *
 * Exact match only: ILIKE would treat % and _ in a stored row as wildcards.
 * A removed member (removed_at set) is nobody, so removal ends access on
 * their next request. A query error gives nothing, so the check fails closed.
 *
 * The responsibilities come from course.company_member_roles (0047). A
 * preview runs this code against a database that may not have that table
 * yet; then (42P01) the same query runs without it, and access.ts reads the
 * one old role from company_members.role.
 */

/** Postgres: no such table. */
const UNDEFINED_TABLE = "42P01";

type Sql = Pick<Db, "rows">;

/** Every active membership of this email, in any company. Used where no workspace is named yet: /org and sign-in. */
export function membershipsLookup(sql: Sql) {
  return async (email: string): Promise<MemberRow[] | null> => {
    const withRoles = await sql.rows<MemberRow>`
      select m.email, m.team_id, m.role as legacy_role,
             c.id as company_id, c.slug as company_slug, c.name as company_name,
             coalesce(array_agg(r.role order by r.role) filter (where r.role is not null), '{}') as roles,
             max(r.team_id::text) filter (where r.role = 'team_lead') as lead_team_id
        from course.company_members m
        join course.companies c on c.id = m.company_id
        left join course.company_member_roles r on r.company_id = m.company_id and r.email = m.email
       where m.email = ${email} and m.removed_at is null
       group by m.email, m.team_id, m.role, c.id, c.slug, c.name
    `;
    if (withRoles.error?.code !== UNDEFINED_TABLE) return withRoles.error ? null : withRoles.data;
    const legacy = await sql.rows<MemberRow>`
      select m.email, m.team_id, m.role as legacy_role, null as roles, null as lead_team_id,
             c.id as company_id, c.slug as company_slug, c.name as company_name
        from course.company_members m
        join course.companies c on c.id = m.company_id
       where m.email = ${email} and m.removed_at is null
    `;
    return legacy.error ? null : legacy.data;
  };
}

/**
 * The person's membership of the workspace the URL names, or null. Every
 * /org/[slug] page, layout and action resolves access through this, so the
 * workspace comes from the requested link and the responsibilities from that
 * workspace alone.
 *
 * A malformed slug never reaches the database, and a row for any other
 * company is refused even if the query returned one.
 */
export function workspaceLookup(sql: Sql, slug: unknown) {
  const wanted = workspaceSlug(slug);
  return async (email: string): Promise<MemberRow | null> => {
    if (!wanted) return null;
    const withRoles = await sql.rows<MemberRow>`
      select m.email, m.team_id, m.role as legacy_role,
             c.id as company_id, c.slug as company_slug, c.name as company_name,
             coalesce(array_agg(r.role order by r.role) filter (where r.role is not null), '{}') as roles,
             max(r.team_id::text) filter (where r.role = 'team_lead') as lead_team_id
        from course.company_members m
        join course.companies c on c.id = m.company_id
        left join course.company_member_roles r on r.company_id = m.company_id and r.email = m.email
       where m.email = ${email} and c.slug = ${wanted} and m.removed_at is null
       group by m.email, m.team_id, m.role, c.id, c.slug, c.name
    `;
    let rows = withRoles.data;
    if (withRoles.error?.code === UNDEFINED_TABLE) {
      const legacy = await sql.rows<MemberRow>`
        select m.email, m.team_id, m.role as legacy_role, null as roles, null as lead_team_id,
               c.id as company_id, c.slug as company_slug, c.name as company_name
          from course.company_members m
          join course.companies c on c.id = m.company_id
         where m.email = ${email} and c.slug = ${wanted} and m.removed_at is null
      `;
      if (legacy.error) return null;
      rows = legacy.data;
    } else if (withRoles.error) {
      return null;
    }
    // Exactly one membership per (company, email): anything else is refused.
    if (!rows || rows.length !== 1) return null;
    return rows[0].company_slug === wanted ? rows[0] : null;
  };
}
