import { isAdmin, viewOf, type CompanyMember } from "@/lib/company/access";
import { seesAssessments } from "@/lib/company/assessment-rules";
import { seesLibrary } from "@/lib/company/library-rules";

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
 * What a member can open, grouped the way the work divides: their own
 * workforce (people, teams, learning), hiring (tests and batches), and the
 * company's own settings (branding). Responsibilities add up, and a
 * group with nothing in it isn't shown. Group names appear only when there is
 * more than one group to tell apart, so an employee sees two plain links.
 */
export function navGroupsFor(member: CompanyMember, own: { myAssessments?: boolean } = {}): OrgNavGroup[] {
  const base = `/org/${member.companySlug}`;
  const admin = isAdmin(member);
  const all: OrgNavGroup[] = [
    { label: null, items: [item(base, "Overview", "overview")] },
    {
      label: "Workforce",
      items: [
        ...(admin ? [item(`${base}/people`, "People", "people"), item(`${base}/teams`, "Teams", "teams")] : []),
        item(`${base}/learning`, UPSKILL_LABEL[viewOf(member)], "learning"),
        // Tests sent to this member's own work email (U11), only once there is one.
        ...(own.myAssessments ? [item(`${base}/my-assessments`, "My assessments", "assessments")] : []),
      ],
    },
    {
      label: "Hiring",
      items: [
        ...(seesAssessments(member) ? [item(`${base}/assessments`, "Assessments", "assessments")] : []),
        ...(seesLibrary(member) ? [item(`${base}/library`, "Library", "library")] : []),
      ],
    },
    {
      label: "Company",
      items: [
        ...(admin ? [item(`${base}/branding`, "Branding", "branding")] : []),
      ],
    },
  ];
  const groups = all.filter((g) => g.items.length > 0);
  // Overview plus one group: no headings needed.
  if (groups.length <= 2) return groups.map((g) => ({ ...g, label: null }));
  return groups;
}

/** True when `pathname` is this link's page or one under it. The overview matches only itself. */
export function isCurrent(href: string, pathname: string, overviewHref: string): boolean {
  if (href === overviewHref) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
