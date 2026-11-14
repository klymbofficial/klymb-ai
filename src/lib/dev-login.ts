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
}

/** The fake company the company user belongs to. */
export const DEV_COMPANY = { slug: "dev-company", name: "Dev Company" } as const;

/** Every address is on the reserved .test domain, so none can be a real mailbox. */
export const DEV_USERS: readonly DevUser[] = [
  { email: "dev-learner-paid@klymb.test", name: "Dev Learner (paid)", role: "learner-paid", label: "Learner, paid", blurb: "Has a System Design seat. Opens /learn." },
  { email: "dev-learner-free@klymb.test", name: "Dev Learner (free)", role: "learner-free", label: "Learner, not paid", blurb: "Signed in, no seat. Sees the locked state." },
  { email: "dev-admin@klymb.test", name: "Dev Admin", role: "admin", label: "Admin", blurb: "On the admin list. Opens /admin." },
  { email: "dev-company@klymb.test", name: "Dev HR", role: "company", label: "Company HR", blurb: `HR at ${DEV_COMPANY.name}. Opens /org.` },
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
      return `/org/${DEV_COMPANY.slug}`;
    default:
      return "/learn";
  }
}
