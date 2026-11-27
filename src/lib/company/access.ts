import { normaliseEmail } from "@/lib/email";

/**
 * The company access rule, kept free of the database and of Next so it can
 * be tested. src/lib/company/auth.ts wires it to the signed-in user.
 *
 * A member is a verified email with a row in company_members for a company,
 * and one or more responsibilities there (course.company_member_roles, one
 * row each; migration 0072). The same email may be a member of several
 * companies, each with its own responsibilities. Every company page and every
 * company data query asks this rule first:
 *
 *   * admin         runs the workspace and sees everyone in the company
 *   * company_head  sees everyone in the company, changes nothing
 *   * team_lead     sees everyone on the team they lead
 *   * recruiter,
 *     reviewer,
 *     employee      see only themselves (hiring scopes arrive with batches)
 *
 * Responsibilities add up: someone who is a team lead and a recruiter sees
 * their team. Nobody sees anything in another company.
 */

export const COMPANY_ROLES = ["admin", "company_head", "recruiter", "reviewer", "team_lead", "employee"] as const;
export type CompanyRole = (typeof COMPANY_ROLES)[number];

/** Responsibilities an admin grants on the People page. A team's lead is chosen on the Teams page. */
export const GRANTABLE_ROLES = ["admin", "company_head", "recruiter", "reviewer", "employee"] as const satisfies readonly CompanyRole[];
export type GrantableRole = (typeof GRANTABLE_ROLES)[number];

export const ROLE_LABEL: Record<CompanyRole, string> = {
  admin: "Company admin",
  company_head: "Company head",
  recruiter: "Recruiter",
  reviewer: "Reviewer",
  team_lead: "Team lead",
  employee: "Employee",
};

/** The roles column of company_members before 0047, still kept right by a trigger. */
export const LEGACY_ROLES: Record<string, CompanyRole> = { hr: "admin", head: "team_lead", employee: "employee" };

/** What the lookup returns: one membership joined to its company and its responsibilities. */
export interface MemberRow {
  email: string;
  team_id: string | null;
  company_id: string;
  company_slug: string;
  company_name: string;
  /** One per company_member_roles row. Empty when the table isn't there yet, or the row predates it. */
  roles: string[] | null;
  /** The team the team_lead row names. */
  lead_team_id: string | null;
  /** company_members.role, read when `roles` is empty. */
  legacy_role: string | null;
}

export interface CompanyMember {
  email: string;
  /** Never empty, no repeats, in COMPANY_ROLES order. */
  roles: readonly CompanyRole[];
  /** The team they belong to. */
  teamId: string | null;
  /** The team they lead, when they are a team lead. */
  leadTeamId: string | null;
  companyId: string;
  companySlug: string;
  companyName: string;
}

function isRole(value: unknown): value is CompanyRole {
  return typeof value === "string" && (COMPANY_ROLES as readonly string[]).includes(value);
}

/**
 * Turns one membership row into a member, or null. `email` is the already
 * normalised address that was asked for.
 */
function toMember(email: string, row: MemberRow | null): CompanyMember | null {
  if (!row) return null;
  // A row whose stored email differs from the asked one is never trusted.
  if (normaliseEmail(row.email) !== email) return null;
  if (!row.company_id || !row.company_slug) return null;

  // Unknown values grant nothing, rather than falling back to some default.
  let roles = (row.roles ?? []).filter(isRole);
  let leadTeamId = row.lead_team_id;
  if (!row.roles?.length) {
    // Before 0047, or a row written by the release before it: the one old role.
    const legacy = row.legacy_role ? LEGACY_ROLES[row.legacy_role] : undefined;
    roles = legacy ? [legacy] : [];
    leadTeamId = legacy === "team_lead" ? row.team_id : null;
  }
  // The database requires a lead's team too; checked again so a bad row can't widen access.
  if (roles.includes("team_lead") && !leadTeamId) roles = roles.filter((r) => r !== "team_lead");
  if (!roles.includes("team_lead")) leadTeamId = null;
  if (!roles.length) return null;

  return {
    email,
    roles: COMPANY_ROLES.filter((r) => roles.includes(r)),
    teamId: row.team_id,
    leadTeamId,
    companyId: row.company_id,
    companySlug: row.company_slug,
    companyName: row.company_name,
  };
}

/**
 * Resolves a signed-in (already verified) email to a member of one company,
 * or null. `lookup` must be an exact, lowercase match.
 */
export async function resolveMember(
  email: unknown,
  lookup: (email: string) => Promise<MemberRow | null>,
): Promise<CompanyMember | null> {
  const value = normaliseEmail(email);
  if (!value) return null;
  return toMember(value, await lookup(value));
}

/** Every company a signed-in email is an active member of, by name. Empty on any doubt. */
export async function resolveMemberships(
  email: unknown,
  lookup: (email: string) => Promise<MemberRow[] | null>,
): Promise<CompanyMember[]> {
  const value = normaliseEmail(email);
  if (!value) return [];
  const rows = (await lookup(value)) ?? [];
  return rows
    .map((row) => toMember(value, row))
    .filter((m): m is CompanyMember => m !== null)
    .sort((a, b) => a.companyName.localeCompare(b.companyName));
}

/**
 * The workspace a URL asks for, as the slug the database stores, or null when
 * it can't be one (the same shape migration 0010 enforces). Checked before any
 * query, so a malformed address never reaches the database.
 */
export function workspaceSlug(slug: unknown): string | null {
  if (typeof slug !== "string") return null;
  const value = slug.toLowerCase();
  return value.length <= 60 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value) ? value : null;
}

/** True when the member belongs to the company named in the URL. */
export function belongsTo(member: CompanyMember | null, slug: unknown): member is CompanyMember {
  return member !== null && typeof slug === "string" && slug.toLowerCase() === member.companySlug;
}

/** True when the member holds at least one of these responsibilities. */
/**
 * True when the member holds any of the roles. A company admin holds every
 * power in their company (decided 25 Nov): they count as every role, in the
 * app here and in the database's own checks (migration 0094).
 */
export function hasRole(member: CompanyMember | null, roles: readonly CompanyRole[]): boolean {
  return member !== null && (member.roles.includes("admin") || member.roles.some((r) => roles.includes(r)));
}

/** Runs the workspace: People, Teams, assigning. */
export const isAdmin = (member: CompanyMember | null): boolean => hasRole(member, ["admin"]);

/** Sees the whole company. */
export const seesCompany = (member: CompanyMember | null): boolean => hasRole(member, ["admin", "company_head"]);

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
  if (seesCompany(viewer)) return true;
  if (viewer.leadTeamId !== null && subject.teamId === viewer.leadTeamId) return true;
  return normaliseEmail(subject.email) === viewer.email;
}

/** May `viewer` see a whole team's data (a team page, team totals)? */
export function canSeeTeam(viewer: CompanyMember | null, team: { companyId: string; teamId: string }): boolean {
  if (!viewer || team.companyId !== viewer.companyId) return false;
  return seesCompany(viewer) || viewer.leadTeamId === team.teamId;
}

/**
 * The filter every company data query must apply. Always has the company;
 * a team lead is narrowed to their team, anyone else who doesn't see the
 * whole company to their own email.
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
  if (seesCompany(member)) return { companyId: member.companyId, teamId: null, email: null };
  if (member.leadTeamId) return { companyId: member.companyId, teamId: member.leadTeamId, email: null };
  return { companyId: member.companyId, teamId: null, email: member.email };
}

/** The widest view a member has, for headings: the company, a team, or themselves. */
export function viewOf(member: CompanyMember): "company" | "team" | "self" {
  if (seesCompany(member)) return "company";
  return member.leadTeamId ? "team" : "self";
}
