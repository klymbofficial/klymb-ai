import { randomUUID } from "node:crypto";
import NextAuth, { CredentialsSignin, type Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import authConfig from "@/auth.config";
import { devLoginEnabled, devUserByEmail } from "@/lib/dev-login";
import { normaliseEmail } from "@/lib/email";

/** The "email-code" sign-in was refused by the rate limiter, not a wrong code. */
export class CodeRateLimited extends CredentialsSignin {
  code = "rate_limited";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    // Invited company members sign in with a code sent to their email. Lives
    // here, not in the edge-safe auth.config.ts, because it reads the database.
    // The tries, expiry and rate limits are enforced inside redeemSignInCode,
    // so they hold whether the request comes from /org/sign-in or straight to
    // /api/auth/callback/email-code.
    Credentials({
      id: "email-code",
      name: "Email code",
      credentials: { email: {}, code: {} },
      async authorize(credentials) {
        // Loaded on demand: the module is server-only and touches the database.
        const { redeemSignInCode } = await import("@/lib/company/signin");
        const result = await redeemSignInCode(credentials.email, credentials.code);
        if (result.ok) return { id: result.email, email: result.email };
        if (result.reason === "limited") throw new CodeRateLimited();
        return null;
      },
    }),
    // Members who set a password in Settings may sign in with it instead of a
    // code. Like the code, it opens company pages only (see companyEmailFrom).
    // The throttles live inside redeemPassword, so they hold for direct calls
    // to /api/auth/callback/password too.
    Credentials({
      id: "password",
      name: "Password",
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        // Loaded on demand: the module is server-only and touches the database.
        const { redeemPassword } = await import("@/lib/company/password");
        const result = await redeemPassword(credentials.email, credentials.password);
        if (result.ok) return { id: result.email, email: result.email };
        if (result.reason === "limited") throw new CodeRateLimited();
        return null;
      },
    }),
    // Dev sign-in: a fixed list of fake people, so any worktree on any port can
    // be authenticated without Google. Refuses unless devLoginEnabled(), which
    // needs AUTH_DEV_LOGIN=true and a dev or preview environment (never Vercel
    // production). Checked here, in the callbacks and in verifiedEmailFrom, so
    // a token minted where it was on stops working where it is off.
    Credentials({
      id: "dev-login",
      name: "Dev sign-in",
      credentials: { email: {} },
      async authorize(credentials) {
        if (!devLoginEnabled()) return null;
        const user = devUserByEmail(credentials.email);
        if (!user) return null;
        // Loaded on demand: the module is server-only and touches the database.
        const { ensureDevUser } = await import("@/lib/dev-login-seed");
        await ensureDevUser(user);
        return { id: user.email, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // One device per learner: a second device may sign in, but it doesn't take the
    // slot. It lands on "Signed in on another device" and the learner chooses
    // whether to continue there (which signs the first device out).
    async jwt(params) {
      const token = await authConfig.callbacks.jwt(params);
      // How this session signed in. A code sign-in is never marked verified,
      // so everything that uses verifiedEmailFrom (admin, the learner course)
      // ignores it; only company pages accept it, via companyEmailFrom.
      if (params.account?.provider === "email-code") {
        token.signInMethod = "email-code";
        // Said outright, not left to the default: a code proves the mailbox to
        // company pages only, never to admin.
        token.emailIsVerified = false;
      } else if (params.account?.provider === "password") {
        // A company password, like a code, opens company pages and nothing else.
        token.signInMethod = "password";
        token.emailIsVerified = false;
      } else if (params.account?.provider === "dev-login") {
        // Only a person from DEV_USERS, only while enabled; authorize checked both.
        token.signInMethod = devLoginEnabled() ? "dev" : undefined;
        token.emailIsVerified = devLoginEnabled();
      } else if (params.profile) {
        token.signInMethod = "google";
      }
      // A fresh Google (or dev) sign-in gets its own session id and takes the learner's device slot.
      const fresh = params.profile || params.account?.provider === "dev-login";
      if (fresh) {
        const sid = randomUUID();
        token.sid = sid;
        const email = normaliseEmail(params.profile ? params.profile.email : params.user?.email);
        // Loaded on demand: the device module is server-only and touches the database.
        const device = await import("@/lib/learner/device");
        if (email && !(await device.deviceBusy(email))) await device.claimDevice(email, sid);
      }
      return token;
    },
    session(params) {
      const session = authConfig.callbacks.session(params);
      if (session.user) {
        session.user.sid = typeof params.token.sid === "string" ? params.token.sid : undefined;
        const method = params.token.signInMethod;
        session.user.signInMethod =
          method === "google" || method === "email-code" || method === "password" || method === "dev" ? method : undefined;
      }
      return session;
    },
  },
});

/**
 * The identity the whole app authorises against.
 *
 * Returns null unless the provider verified the address. An unverified claim
 * is an assertion by whoever controls the account, not proof of the mailbox:
 * and admin access is granted by email, so an unverified one would be enough
 * to walk in.
 */
export function verifiedEmailFrom(session: Session | null): string | null {
  if (!session?.user) return null;
  if (session.user.emailIsVerified !== true) return null;
  // A code or company-password sign-in never counts here, even if a flag were somehow set.
  if (session.user.signInMethod === "email-code" || session.user.signInMethod === "password") return null;
  // A dev session counts only where the dev sign-in is on right now, and only
  // for a person on the fixed list. A token carried to an environment where it
  // is off, or one with any other address, is nothing.
  if (session.user.signInMethod === "dev") {
    if (!devLoginEnabled() || !devUserByEmail(session.user.email)) return null;
  }
  return normaliseEmail(session.user.email);
}

export async function currentEmail(): Promise<string | null> {
  return verifiedEmailFrom(await auth());
}

/**
 * The identity Klymb admin authorises against: Google only.
 *
 * A Google-verified email whose session says it came from Google, or which
 * predates the field (sessions from before company sign-in existed, when
 * Google was the only way in). Any other method, the company email code
 * included, is refused, so being invited to a company never opens the admin.
 */
export function adminEmailFrom(session: Session | null): string | null {
  const method = session?.user?.signInMethod;
  // "dev" passes this test and is then held to devLoginEnabled() by verifiedEmailFrom.
  if (method !== undefined && method !== "google" && method !== "dev") return null;
  return verifiedEmailFrom(session);
}

export async function currentAdminEmail(): Promise<string | null> {
  return adminEmailFrom(await auth());
}

/**
 * The identity company pages authorise against: a Google-verified email, or
 * an email proven by a sign-in code or a company password. Only
 * src/lib/company/auth.ts uses it, so those sign-ins open company pages and
 * nothing else.
 */
export function companyEmailFrom(session: Session | null): string | null {
  const verified = verifiedEmailFrom(session);
  if (verified) return verified;
  if (!session?.user) return null;
  const method = session.user.signInMethod;
  if (method !== "email-code" && method !== "password") return null;
  return normaliseEmail(session.user.email);
}
