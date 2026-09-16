import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe config: providers and callbacks only, no database access.
 *
 * Deliberately NOT here: any notion of "is this an admin". Admin status is
 * read from the database at request time (see src/lib/admin/auth.ts) so there
 * is exactly one authority — a token that outlives a revoked grant is the
 * classic way this goes wrong.
 */
export default {
  trustHost: true,
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
      // Only trust an email Google has verified.
      if (profile) token.emailVerified = profile.email_verified === true;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.sub ?? "";
      return session;
    },
  },
  session: { strategy: "jwt" },
} satisfies NextAuthConfig;
