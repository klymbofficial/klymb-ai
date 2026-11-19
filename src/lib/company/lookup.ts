import type { Db } from "@/lib/db/client";
import { workspaceSlug, type MemberRow } from "@/lib/company/access";

/**
 * The queries that find a signed-in email's company and role. Kept apart from
 * src/lib/company/auth.ts (which is server-only) so the opt-in database test
 * can run these exact queries against a real Postgres.
 *
 * Exact match only: ILIKE would treat % and _ in a stored row as wildcards.
 * A removed member (removed_at set) is nobody, so removal ends access on
 * their next request. A query error gives null, so the check fails closed.
 */

/**
 * The person's workspace, whichever it is. Used where no workspace is named
 * yet: /org on its own and the sign-in page. Today an email belongs to at most
 * one company (company_members is keyed by email), so this is one row.
 */
export function memberLookup(sql: Pick<Db, "row">) {
  return async (email: string): Promise<MemberRow | null> => {
    const { data, error } = await sql.row<MemberRow>`
      select m.email, m.role, m.team_id, c.id as company_id, c.slug as company_slug, c.name as company_name
        from course.company_members m
        join course.companies c on c.id = m.company_id
       where m.email = ${email} and m.removed_at is null
    `;
    return error ? null : data;
  };
}

/**
 * The person's membership of the workspace the URL names, or null. Every
 * /org/[slug] page, layout and action resolves access through this, so the
 * workspace comes from the requested link and the role from that workspace's
 * row. When an email can belong to several companies, only this query's
 * table changes; its callers already ask per workspace.
 *
 * A malformed slug never reaches the database, and a row for any other
 * company is refused even if the query returned one.
 */
export function workspaceLookup(sql: Pick<Db, "row">, slug: unknown) {
  const wanted = workspaceSlug(slug);
  return async (email: string): Promise<MemberRow | null> => {
    if (!wanted) return null;
    const { data, error } = await sql.row<MemberRow>`
      select m.email, m.role, m.team_id, c.id as company_id, c.slug as company_slug, c.name as company_name
        from course.company_members m
        join course.companies c on c.id = m.company_id
       where m.email = ${email} and c.slug = ${wanted} and m.removed_at is null
    `;
    if (error || !data) return null;
    return data.company_slug === wanted ? data : null;
  };
}
