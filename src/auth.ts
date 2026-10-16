import { randomUUID } from "node:crypto";
import NextAuth, { type Session } from "next-auth";
import authConfig from "@/auth.config";
import { normaliseEmail } from "@/lib/email";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // One device per learner: a second device may sign in, but it doesn't take the
    // slot. It lands on "Signed in on another device" and the learner chooses
    // whether to continue there (which signs the first device out).
    async jwt(params) {
      const token = await authConfig.callbacks.jwt(params);
      // A fresh sign-in gets its own session id and takes the learner's device slot.
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
      if (session.user) session.user.sid = typeof params.token.sid === "string" ? params.token.sid : undefined;
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
