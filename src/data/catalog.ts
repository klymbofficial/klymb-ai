/**
 * The course catalog: every program the site can name, whether you can
 * actually take it today, and the roles and industries it is for.
 *
 * What is open is read from the real data, not retyped:
 *   - the career tracks come from `tracks` (src/data/tracks.ts), the ones the
 *     site lists, which all enrol straight into a built 30-day course;
 *   - System Design is the course app at /learn/system-design, sold at
 *     /system-design.
 *
 * Programs that are NOT open are listed on purpose, so a visitor who looks for
 * them finds an honest answer instead of nothing. For those, `status` is
 * "unavailable" and there is no curriculum, lesson, trial or enrolment link to
 * point at, because none exists. Do not add one here until the course itself
 * is built and an enrolment path works. Write nothing about what an
 * unavailable program "will" cover or when it "will" open: nothing is decided.
 */
import { contact } from "@/data/config";
import { tracks } from "@/data/tracks";
import type { TrackSlug } from "@/types/program";

export type RoleSlug =
  | "software-engineering"
  | "quality-assurance"
  | "support-operations"
  | "project-management"
  | "reporting-analytics"
  | "security";

export type IndustrySlug = "any-industry" | "healthcare" | "insurance" | "banking" | "cybersecurity";

export type ProgramStatus = "available" | "unavailable";

export interface Role {
  slug: RoleSlug;
  name: string;
  /** One line on the kind of work, shown on the role's page. */
  blurb: string;
}

export interface Industry {
  slug: IndustrySlug;
  name: string;
  blurb: string;
}

export const roles: Role[] = [
  { slug: "software-engineering", name: "Software engineering", blurb: "Writing, designing and shipping software." },
  { slug: "quality-assurance", name: "QA and testing", blurb: "Making sure software works before it reaches users." },
  { slug: "support-operations", name: "Support and service operations", blurb: "Resolving tickets, running incidents, helping customers." },
  { slug: "project-management", name: "Project and delivery management", blurb: "Planning work, tracking risk, keeping delivery on course." },
  { slug: "reporting-analytics", name: "Reporting and analytics", blurb: "Turning data into numbers a team can act on." },
  { slug: "security", name: "Security", blurb: "Defending systems and testing their defences." },
];

export const industries: Industry[] = [
  {
    slug: "any-industry",
    name: "Any industry",
    blurb: "Role-based programs. They teach the work of a role, not the rules of one sector, so they fit a team in any industry.",
  },
  { slug: "healthcare", name: "Healthcare", blurb: "Hospitals, clinics, health-tech and the teams around them." },
  { slug: "insurance", name: "Insurance", blurb: "Insurers, brokers and the claims and underwriting teams inside them." },
  { slug: "banking", name: "Banking", blurb: "Banks and the operations, risk and technology teams inside them." },
  { slug: "cybersecurity", name: "Cybersecurity", blurb: "Security teams, in any sector." },
];

export interface Program {
  /** The path under /courses. For a career track this is the track's own slug. */
  slug: string;
  name: string;
  kind: "30-day career track" | "Short video course" | "Industry program";
  status: ProgramStatus;
  /** One or two plain sentences. For an unavailable program, only what it is called. */
  summary: string;
  roles: RoleSlug[];
  industries: IndustrySlug[];
  /** Set only on a career track: its slug, for the plan at /tracks/[slug] and enrolment. */
  track?: TrackSlug;
  /** Where to start. Present if and only if the program is available. */
  startHref?: string;
}

const trackRoles: Record<TrackSlug, RoleSlug> = {
  "qa-engineer": "quality-assurance",
  "l1-l2-support": "support-operations",
  "project-manager": "project-management",
  "junior-developer": "software-engineering",
  "reporting-analyst": "reporting-analytics",
  // Invite-only: not in `tracks`, so never reaches the catalog. Kept so the map is total.
  "ai-product-manager": "project-management",
  // The 60-day challenges: not in `tracks` either (they have /challenges). Kept so the map is total.
  claude: "software-engineering",
  "artificial-intelligence": "software-engineering",
  "software-engineering": "software-engineering",
  "data-science": "reporting-analytics",
};

const trackPrograms: Program[] = tracks
  .filter((t) => t.available && t.contentLive)
  .map((t) => ({
    slug: t.slug,
    name: t.name,
    kind: "30-day career track" as const,
    status: "available" as const,
    summary: t.description,
    roles: [trackRoles[t.slug]],
    industries: ["any-industry" as const],
    track: t.slug,
    startHref: `/register?track=${t.slug}`,
  }));

const systemDesign: Program = {
  slug: "system-design",
  name: "System Design",
  kind: "Short video course",
  status: "available",
  summary: "System design explained with real examples, in short video lessons with quick checks. Built for interviews.",
  roles: ["software-engineering"],
  industries: ["any-industry"],
  startHref: "/system-design",
};

/** Named so a visitor can find the answer; nothing behind them is built. */
const unavailable: Program[] = [
  { slug: "ai-in-healthcare", name: "AI in Healthcare", kind: "Industry program", status: "unavailable", summary: "Not available. There is no course or enrolment for this program.", roles: [], industries: ["healthcare"] },
  { slug: "ai-in-insurance", name: "AI in Insurance", kind: "Industry program", status: "unavailable", summary: "Not available. There is no course or enrolment for this program.", roles: [], industries: ["insurance"] },
  { slug: "ai-in-banking", name: "AI in Banking", kind: "Industry program", status: "unavailable", summary: "Not available. There is no course or enrolment for this program.", roles: [], industries: ["banking"] },
  { slug: "cybersecurity", name: "Cybersecurity", kind: "Industry program", status: "unavailable", summary: "Not available. There is no course or enrolment for this program.", roles: ["security"], industries: ["cybersecurity"] },
  { slug: "red-teaming", name: "Red Teaming", kind: "Industry program", status: "unavailable", summary: "Not available. There is no course or enrolment for this program.", roles: ["security"], industries: ["cybersecurity"] },
];

/** Open programs first (career tracks in site order, then System Design), then the ones not open. */
export const programs: Program[] = [...trackPrograms, systemDesign, ...unavailable];

export const availablePrograms = programs.filter((p) => p.status === "available");
export const unavailablePrograms = programs.filter((p) => p.status === "unavailable");

export const getProgram = (slug: string) => programs.find((p) => p.slug === slug);
export const getRole = (slug: string) => roles.find((r) => r.slug === slug);
export const getIndustry = (slug: string) => industries.find((i) => i.slug === slug);

export const programsForRole = (role: RoleSlug) => programs.filter((p) => p.roles.includes(role));
export const programsForIndustry = (industry: IndustrySlug) => programs.filter((p) => p.industries.includes(industry));

export const availableIn = (list: Program[]) => list.filter((p) => p.status === "available");

/**
 * The one existing way to reach the team: the address on the Contact page
 * (src/data/config.ts). There is no booking form, call scheduler or sales
 * flow in the app, so this is a plain email with the topic filled in.
 */
export const CONTACT_PAGE = "/contact";
export const contactMailto = (subject: string) => `mailto:${contact.email}?subject=${encodeURIComponent(subject)}`;
export const contactEmail = contact.email;
