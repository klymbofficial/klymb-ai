import { normaliseEmail } from "@/lib/email";

/**
 * Dev sign-in: a "sign in as…" picker of fixed fake people, so a worktree can
 * be authenticated on any port without Google. Kept free of Next and the
 * database so the rule that decides whether it may run can be tested.
 *
 * It is OFF unless AUTH_DEV_LOGIN=true is set in that environment, and then
 * only on `next dev` or a Vercel preview. Never on a Vercel production
 * deployment, whatever else is set: the flag is the opt-in, the environment
 * check is the backstop if the flag is ever copied there by mistake.
 */

export type DevRole = "learner-paid" | "learner-free" | "admin" | "company";

export interface DevUser {
  email: string;
  name: string;
  role: DevRole;
  label: string;
  /** What the account has, shown on the picker. */
  blurb: string;
  /** For a company person: each fake company they belong to, and what they do there. */
  memberships?: readonly DevMembership[];
  /** Also has a System Design seat of their own, as a Klymb learner. */
  ownCourse?: boolean;
}

export interface DevMembership {
  company: DevCompany;
  roles: readonly ("admin" | "company_head" | "recruiter" | "reviewer" | "employee")[];
  /** A team in that company, made if missing; the person joins it unless they're already on one. */
  team?: string;
  /** Also leads that team. */
  leads?: boolean;
}

export interface DevCompany {
  slug: string;
  name: string;
  /** Published branding to start with, so the two companies look different from the first sign-in. */
  brand?: { displayName: string; accent: string; welcome: string; supportEmail: string; supportText: string };
}

/** Dev Company's one team, led by Dev Lead, with Dev Employee on it. */
export const DEV_TEAM = "Engineering";

/** Two fake companies, so a member of one can be checked against the other's pages. */
export const DEV_COMPANY: DevCompany = { slug: "dev-company", name: "Dev Company" };
export const DEV_COMPANY_TWO: DevCompany = {
  slug: "dev-company-two",
  name: "Dev Company Two",
  brand: {
    displayName: "Dev Two Learning Hub",
    accent: "#0f5e57",
    welcome: "Welcome to the Dev Two Learning Hub. Your team's courses and progress live here.",
    supportEmail: "learning@dev-two.klymb.test",
    supportText: "Learning team, weekdays 10 to 6 IST",
  },
};

/** Every address is on the reserved .test domain, so none can be a real mailbox. */
export const DEV_USERS: readonly DevUser[] = [
  { email: "dev-learner-paid@klymb.test", name: "Dev Learner (paid)", role: "learner-paid", label: "Learner, paid", blurb: "Has a System Design seat. Opens /learn." },
  { email: "dev-learner-free@klymb.test", name: "Dev Learner (free)", role: "learner-free", label: "Learner, not paid", blurb: "Signed in, no seat. Sees the locked state." },
  { email: "dev-admin@klymb.test", name: "Dev Admin", role: "admin", label: "Admin", blurb: "On the admin list. Opens /admin." },
  { email: "dev-company@klymb.test", name: "Dev HR", role: "company", memberships: [{ company: DEV_COMPANY, roles: ["admin"] }], label: "Company admin", blurb: `Admin at ${DEV_COMPANY.name}. Opens /org.` },
  { email: "dev-company-two@klymb.test", name: "Dev HR Two", role: "company", memberships: [{ company: DEV_COMPANY_TWO, roles: ["admin"] }], label: "Company admin, second company", blurb: `Admin at ${DEV_COMPANY_TWO.name}. ${DEV_COMPANY.name}'s pages are a 404 for them.` },
  {
    email: "dev-company-both@klymb.test", name: "Dev Both", role: "company", ownCourse: true,
    memberships: [{ company: DEV_COMPANY, roles: ["employee", "recruiter"] }, { company: DEV_COMPANY_TWO, roles: ["company_head"] }],
    label: "In both companies",
    blurb: `Employee and recruiter at ${DEV_COMPANY.name}, company head at ${DEV_COMPANY_TWO.name}, and has System Design of their own. Opens the workspace list.`,
  },
  {
    email: "dev-employee@klymb.test", name: "Dev Employee", role: "company",
    memberships: [{ company: DEV_COMPANY, roles: ["employee"], team: DEV_TEAM }],
    label: "Employee",
    blurb: `Employee on ${DEV_COMPANY.name}'s ${DEV_TEAM} team. Nothing assigned to start with: an admin or their lead assigns System Design.`,
  },
  {
    email: "dev-lead@klymb.test", name: "Dev Lead", role: "company",
    memberships: [{ company: DEV_COMPANY, roles: ["employee"], team: DEV_TEAM, leads: true }],
    label: "Team lead",
    blurb: `Leads ${DEV_COMPANY.name}'s ${DEV_TEAM} team. Assigns learning to people on it, and nobody else.`,
  },
  {
    email: "dev-reviewer@klymb.test", name: "Dev Reviewer", role: "company",
    memberships: [{ company: DEV_COMPANY, roles: ["reviewer"] }],
    label: "Reviewer",
    blurb: `Reviewer at ${DEV_COMPANY.name}. Approves or declines each version of a test before recruiters can pick it.`,
  },
];

type Env = Record<string, string | undefined>;

/** Whether the dev sign-in may run in this environment. Fails closed. */
export function devLoginEnabled(env: Env = process.env): boolean {
  if (env.AUTH_DEV_LOGIN !== "true") return false;
  // Production on Vercel, always off.
  if (env.VERCEL_ENV === "production") return false;
  // `next dev` locally, or a Vercel preview. NODE_ENV is "production" on a
  // preview, so it can't be the only test. A bare `next start` is neither.
  return env.NODE_ENV === "development" || env.VERCEL_ENV === "preview";
}

export function devUserByEmail(email: unknown): DevUser | null {
  const value = normaliseEmail(email);
  return DEV_USERS.find((u) => u.email === value) ?? null;
}

/** Where each person lands after signing in. */
export function devLandingPath(user: DevUser): string {
  switch (user.role) {
    case "admin":
      return "/admin";
    case "company":
      return user.memberships?.length === 1 ? `/org/${user.memberships[0].company.slug}` : "/org";
    default:
      return "/learn";
  }
}
