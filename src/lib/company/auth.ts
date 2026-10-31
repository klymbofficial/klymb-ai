import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { auth, companyEmailFrom } from "@/auth";
import { allowCompany, resolveMember, type CompanyMember, type CompanyRole } from "@/lib/company/access";
import { memberLookup } from "@/lib/company/lookup";
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
 */
export const getMember = cache(async (): Promise<CompanyMember | null> => {
  const sql = db();
  if (!sql) return null;
  return resolveMember(companyEmailFrom(await auth()), memberLookup(sql));
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
  if (!allowCompany(member, slug, roles)) notFound();
  return member;
}

/**
 * For server actions on HR pages: the signed-in HR person of this company,
 * or null. Actions answer null with an error message rather than a 404.
 */
export async function hrFor(slug: unknown): Promise<CompanyMember | null> {
  const member = await getMember();
  return allowCompany(member, slug, ["hr"]) ? member : null;
}
