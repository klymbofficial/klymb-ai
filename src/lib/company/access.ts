import { normaliseEmail } from "@/lib/email";

/**
 * The company access rule, kept free of the database and of Next so it can
 * be tested. src/lib/company/auth.ts wires it to the signed-in user.
 *
 * A member is a verified email with a row in company_members. Every company
 * page and every company data query asks this rule first:
 *
 *   * hr       sees everyone in their company
 *   * head     sees everyone on their own team
 *   * employee sees only themselves
 *
 * Nobody sees anything in another company.
 */

export const COMPANY_ROLES = ["hr", "head", "employee"] as const;
export type CompanyRole = (typeof COMPANY_ROLES)[number];

/** What the lookup returns: one company_members row joined to its company. */
export interface MemberRow {
  email: string;
  role: string;
  team_id: string | null;
  company_id: string;
  company_slug: string;
  company_name: string;
}

export interface CompanyMember {
  email: string;
  role: CompanyRole;
  teamId: string | null;
  companyId: string;
  companySlug: string;
  companyName: string;
}

function isRole(value: unknown): value is CompanyRole {
  return typeof value === "string" && (COMPANY_ROLES as readonly string[]).includes(value);
}

/**
 * Resolves a signed-in (already verified) email to a company member, or null.
 * `lookup` must be an exact, lowercase match against company_members.
 */
export async function resolveMember(
  email: unknown,
  lookup: (email: string) => Promise<MemberRow | null>,
): Promise<CompanyMember | null> {
  const value = normaliseEmail(email);
  if (!value) return null;
  const row = await lookup(value);
  if (!row) return null;
  // A row whose stored email differs from the asked one is never trusted.
  if (normaliseEmail(row.email) !== value) return null;
  // An unknown role grants nothing, rather than falling back to some default.
  if (!isRole(row.role)) return null;
  // The database requires this too; checked again so a bad row can't widen access.
  if (row.role === "head" && !row.team_id) return null;
  if (!row.company_id || !row.company_slug) return null;
  return {
    email: value,
    role: row.role,
    teamId: row.team_id,
    companyId: row.company_id,
    companySlug: row.company_slug,
    companyName: row.company_name,
  };
}

/** True when the member belongs to the company named in the URL. */
export function belongsTo(member: CompanyMember | null, slug: unknown): member is CompanyMember {
  return member !== null && typeof slug === "string" && slug.toLowerCase() === member.companySlug;
}

export function hasRole(member: CompanyMember | null, roles: readonly CompanyRole[]): member is CompanyMember {
  return member !== null && roles.includes(member.role);
}

/**
 * The decision requireCompany makes: a member of the company in the URL,
 * and, when roles are given, holding one of them.
 */
export function allowCompany(member: CompanyMember | null, slug: unknown, roles?: readonly CompanyRole[]): member is CompanyMember {
  if (!belongsTo(member, slug)) return false;
  return roles === undefined || hasRole(member, roles);
}

/** Who a data row belongs to. */
export interface Subject {
  companyId: string;
  teamId: string | null;
  email: string;
}

/** May `viewer` see data belonging to `subject`? */
export function canSee(viewer: CompanyMember | null, subject: Subject): boolean {
  if (!viewer || subject.companyId !== viewer.companyId) return false;
  switch (viewer.role) {
    case "hr":
      return true;
    case "head":
      return viewer.teamId !== null && subject.teamId === viewer.teamId;
    case "employee":
      return normaliseEmail(subject.email) === viewer.email;
  }
}

/** May `viewer` see a whole team's data (a team page, team totals)? */
export function canSeeTeam(viewer: CompanyMember | null, team: { companyId: string; teamId: string }): boolean {
  if (!viewer || team.companyId !== viewer.companyId) return false;
  if (viewer.role === "hr") return true;
  return viewer.role === "head" && viewer.teamId === team.teamId;
}

/**
 * The filter every company data query must apply. Always has the company;
 * a head is narrowed to their team, an employee to their own email.
 *
 *   where m.company_id = ${scope.companyId}
 *     and (${scope.teamId}::uuid is null or m.team_id = ${scope.teamId})
 *     and (${scope.email}::text is null or m.email = ${scope.email})
 */
export interface MemberScope {
  companyId: string;
  teamId: string | null;
  email: string | null;
}

export function scopeFor(member: CompanyMember): MemberScope {
  switch (member.role) {
    case "hr":
      return { companyId: member.companyId, teamId: null, email: null };
    case "head":
      return { companyId: member.companyId, teamId: member.teamId, email: null };
    case "employee":
      return { companyId: member.companyId, teamId: null, email: member.email };
  }
}
