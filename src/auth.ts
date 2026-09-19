import NextAuth, { type Session } from "next-auth";
import authConfig from "@/auth.config";
import { normaliseEmail } from "@/lib/email";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

/**
 * The identity the whole app authorises against.
 *
 * Returns null unless the provider verified the address. An unverified claim
 * is an assertion by whoever controls the account, not proof of the mailbox —
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
