import type { Db } from "@/lib/db/client";
import type { MemberRow } from "@/lib/company/access";

/**
 * The one query that finds a signed-in email's company and role. Kept apart
 * from src/lib/company/auth.ts (which is server-only) so the opt-in database
 * test can run this exact query against a real Postgres.
 *
 * Exact match only: ILIKE would treat % and _ in a stored row as wildcards.
 * A query error gives null, so the check fails closed.
 */
export function memberLookup(sql: Pick<Db, "row">) {
  return async (email: string): Promise<MemberRow | null> => {
    const { data, error } = await sql.row<MemberRow>`
      select m.email, m.role, m.team_id, c.id as company_id, c.slug as company_slug, c.name as company_name
        from course.company_members m
        join course.companies c on c.id = m.company_id
       where m.email = ${email}
    `;
    return error ? null : data;
  };
}
