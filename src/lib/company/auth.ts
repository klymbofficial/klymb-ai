import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { auth, companyEmailFrom } from "@/auth";
import { allowCompany, hasRole, isAdmin, resolveMember, resolveMemberships, type CompanyMember, type CompanyRole } from "@/lib/company/access";
import type { AssignScope } from "@/lib/company/assign-rules";
import { membershipsLookup, workspaceLookup } from "@/lib/company/lookup";
import { db } from "@/lib/db/client";

/**
 * Data Access Layer for company pages: every company read goes through here.
 *
 * The company and role come from company_members on each request, looked up
 * by the signed-in email (Google-verified, or proven by a sign-in code; see
 * companyEmailFrom): never from the login token and never from the URL, so
 * removing a row takes effect immediately.
 *
 * Fails closed: no database, a query error or no row all mean no access.
 * (The opposite of hasPaid in src/lib/access.ts, which fails open so an
 * outage never locks out a paying learner. Here an outage must never show
 * one company's data to another.)
 *
 * Anything a viewer may not see is a 404, not a 403, so a URL can't be used
 * to find out which companies exist.
 *
 * This file only joins tested pieces together: companyEmailFrom
 * (tests/auth-identity.test.ts), resolveMember and allowCompany
 * (tests/company-access.test.ts) and memberLookup
 * (tests/company-access-db.test.ts).
 *
 * `cache` memoises it for one request only, as with getAdmin.
 *
 * getMemberships is every workspace the person belongs to, for where none
 * is named (/org, the sign-in page). Pages under /org/[slug] use
 * getWorkspaceMember, which resolves the workspace from the requested link.
 */
export const getMemberships = cache(async (): Promise<CompanyMember[]> => {
  const sql = db();
  if (!sql) return [];
  return resolveMemberships(companyEmailFrom(await auth()), membershipsLookup(sql));
});

/** The signed-in person's membership of the workspace this slug names, or null. */
export const getWorkspaceMember = cache(async (slug: string): Promise<CompanyMember | null> => {
  const sql = db();
  if (!sql) return null;
  return resolveMember(companyEmailFrom(await auth()), workspaceLookup(sql, slug));
});

/**
 * Use at the top of every /org/[slug] page, layout, action and route. The
 * slug only picks the company; access still comes from the login.
 */
export async function requireCompany(slug: string, roles?: readonly CompanyRole[]): Promise<CompanyMember> {
  const member = await getWorkspaceMember(slug);
  if (!allowCompany(member, slug, roles)) notFound();
  return member;
}

/**
 * For server actions on admin pages: the signed-in admin of this company, or
 * null. Actions answer null with an error message rather than a 404.
 */
export async function adminFor(slug: unknown): Promise<CompanyMember | null> {
  if (typeof slug !== "string") return null;
  const member = await getWorkspaceMember(slug);
  return allowCompany(member, slug) && isAdmin(member) ? member : null;
}

/**
 * Who may assign learning in this workspace, and to whom: an admin to anyone
 * in the company, a team lead to people on their own team. Null for anyone
 * else. The scope comes from the membership, never from a form.
 */
export async function assignerFor(slug: unknown): Promise<{ member: CompanyMember; scope: AssignScope } | null> {
  if (typeof slug !== "string") return null;
  const member = await getWorkspaceMember(slug);
  if (!allowCompany(member, slug)) return null;
  if (isAdmin(member)) return { member, scope: { kind: "company" } };
  if (hasRole(member, ["team_lead"]) && member.leadTeamId) return { member, scope: { kind: "team", teamId: member.leadTeamId } };
  return null;
}
