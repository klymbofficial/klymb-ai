import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe config: providers and callbacks only, no database access.
 *
 * Deliberately NOT here: any notion of "is this an admin". Admin status is
 * read from the database at request time (see src/lib/admin/auth.ts) so there
 * is exactly one authority: a token that outlives a revoked grant is the
 * classic way this goes wrong.
 */
export default {
  /**
   * Host trust is explicit. Auth.js otherwise believes the Host header, which
   * lets a spoofed host redirect an OAuth callback elsewhere. Set
   * AUTH_TRUST_HOST=true only where the platform terminates TLS and sets the
   * host itself (Vercel). Absent, the safer behaviour applies and AUTH_URL is
   * the canonical origin.
   */
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  pages: { signIn: "/admin/login", error: "/admin/login" },
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            authorization: { params: { prompt: "select_account" } },
          }),
        ]
      : []),
  ],
  callbacks: {
    jwt({ token, profile }) {
      // Only an email Google has verified counts as an identity here.
      if (profile) token.emailIsVerified = profile.email_verified === true;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.emailIsVerified = token.emailIsVerified === true;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
} satisfies NextAuthConfig;
