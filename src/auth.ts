import { randomUUID } from "node:crypto";
import NextAuth, { CredentialsSignin, type Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import authConfig from "@/auth.config";
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
      if (params.account?.provider === "email-code") token.signInMethod = "email-code";
      else if (params.profile) token.signInMethod = "google";
      // A fresh Google sign-in gets its own session id and takes the learner's device slot.
      if (params.profile) {
        const sid = randomUUID();
        token.sid = sid;
        const email = normaliseEmail(params.profile.email);
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
        session.user.signInMethod = method === "google" || method === "email-code" ? method : undefined;
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
  return normaliseEmail(session.user.email);
}

export async function currentEmail(): Promise<string | null> {
  return verifiedEmailFrom(await auth());
}

/**
 * The identity company pages authorise against: a Google-verified email, or
 * an email proven by a sign-in code. Only src/lib/company/auth.ts uses it,
 * so a code sign-in opens company pages and nothing else.
 */
export function companyEmailFrom(session: Session | null): string | null {
  const verified = verifiedEmailFrom(session);
  if (verified) return verified;
  if (session?.user?.signInMethod !== "email-code") return null;
  return normaliseEmail(session.user.email);
}
