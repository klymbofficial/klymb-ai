import { isAdmin, viewOf, type CompanyMember } from "@/lib/company/access";
import { seesAssessments } from "@/lib/company/assessment-rules";
import { seesLibrary } from "@/lib/company/library-rules";
import { seesHiring } from "@/lib/company/batch-rules";

/** The icon a sidebar link draws (src/components/company/OrgIcons.tsx). */
export type OrgNavIcon = "overview" | "people" | "teams" | "learning" | "assessments" | "batches" | "library" | "branding";

export interface OrgNavItem {
  href: string;
  label: string;
  icon: OrgNavIcon;
}

export interface OrgNavGroup {
  /** Shown above the links; null for the first group and for a member with a single group. */
  label: string | null;
  items: OrgNavItem[];
}

const item = (href: string, label: string, icon: OrgNavIcon): OrgNavItem => ({ href, label, icon });

const UPSKILL_LABEL = { company: "Upskill", team: "Team Upskill", self: "My Upskill" } as const;

/**
 * What a member can open, as one plain list with no headings (user, 26 Nov):
 * Assessments first, then Upskill, then the rest. People are those invited to
 * external tests (outside the company); Team is everyone inside it. Settings
 * (branding), Billing and Add admin live in the account menu, not here.
 * Responsibilities add up; a link a member can't use isn't shown.
 */
export function navGroupsFor(member: CompanyMember, own: { myAssessments?: boolean } = {}): OrgNavGroup[] {
  const base = `/org/${member.companySlug}`;
  const admin = isAdmin(member);
  const items: OrgNavItem[] = [
    ...(seesAssessments(member) ? [item(`${base}/assessments`, "Assessments", "assessments")] : []),
    item(`${base}/learning`, UPSKILL_LABEL[viewOf(member)], "learning"),
    // Tests sent to this member's own work email (U11), only once there is one.
    ...(own.myAssessments ? [item(`${base}/my-assessments`, "My assessments", "assessments")] : []),
    ...(seesHiring(member) ? [item(`${base}/people`, "People", "people")] : []),
    ...(admin ? [item(`${base}/teams`, "Team", "teams")] : []),
    ...(seesLibrary(member) ? [item(`${base}/library`, "Library", "library")] : []),
  ];
  return [{ label: null, items }];
}

/** Where the workspace home sends a member now that there is no Overview: Assessments, or Upskill for those who don't see them. */
export function homeFor(member: CompanyMember): string {
  const base = `/org/${member.companySlug}`;
  return seesAssessments(member) ? `${base}/assessments` : `${base}/learning`;
}

/** True when `pathname` is this link's page or one under it. The overview matches only itself. */
export function isCurrent(href: string, pathname: string, overviewHref: string): boolean {
  if (href === overviewHref) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
