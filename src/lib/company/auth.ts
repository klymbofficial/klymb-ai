import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { currentEmail } from "@/auth";
import { belongsTo, hasRole, resolveMember, type CompanyMember, type CompanyRole, type MemberRow } from "@/lib/company/access";
import { db } from "@/lib/db/client";

/**
 * Data Access Layer for company pages: every company read goes through here.
 *
 * The company and role come from company_members on each request, looked up
 * by the verified Google email: never from the login token and never from
 * the URL, so removing a row takes effect immediately.
 *
 * Fails closed: no database, a query error or no row all mean no access.
 * (The opposite of hasPaid in src/lib/access.ts, which fails open so an
 * outage never locks out a paying learner. Here an outage must never show
 * one company's data to another.)
 *
 * Anything a viewer may not see is a 404, not a 403, so a URL can't be used
 * to find out which companies exist.
 *
 * `cache` memoises it for one request only, as with getAdmin.
 */
export const getMember = cache(async (): Promise<CompanyMember | null> => {
  const sql = db();
  if (!sql) return null;

  return resolveMember(await currentEmail(), async (email) => {
    // Exact match only: ILIKE would treat % and _ in a stored row as wildcards.
    const { data, error } = await sql.row<MemberRow>`
      select m.email, m.role, m.team_id, c.id as company_id, c.slug as company_slug, c.name as company_name
        from course.company_members m
        join course.companies c on c.id = m.company_id
       where m.email = ${email}
    `;
    return error ? null : data;
  });
});

/** Any company member. Everyone else gets a 404. */
export async function requireMember(): Promise<CompanyMember> {
  const member = await getMember();
  if (!member) notFound();
  return member;
}

/**
 * Use at the top of every /org/[slug] page, layout, action and route. The
 * slug only picks the company; access still comes from the login.
 */
export async function requireCompany(slug: string, roles?: readonly CompanyRole[]): Promise<CompanyMember> {
  const member = await getMember();
  if (!belongsTo(member, slug)) notFound();
  if (roles && !hasRole(member, roles)) notFound();
  return member;
}
