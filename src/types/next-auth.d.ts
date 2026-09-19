import type { DefaultSession } from "next-auth";

/**
 * Carries the provider's email_verified claim through the session, so
 * authorisation can require a verified address rather than assume one.
 */
declare module "next-auth" {
  interface Session {
    user: {
      emailIsVerified: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    emailIsVerified?: boolean;
  }
}

export {};
