import type { DefaultSession } from "next-auth";

/**
 * Carries the provider's email_verified claim through the session, so
 * authorisation can require a verified address rather than assume one.
 */
declare module "next-auth" {
  interface Session {
    user: {
      emailIsVerified: boolean;
      /** This sign-in's id, matched against the learner's one device slot. */
      sid?: string;
      /** When this session signed in (ms since 1970). Sessions from before 0098 have none. */
      authAt?: number;
      /** How this session signed in. Sessions from before this field existed have none. */
      signInMethod?: SignInMethod;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    emailIsVerified?: boolean;
    sid?: string;
    authAt?: number;
    signInMethod?: SignInMethod;
  }
}

/**
 * "email-code" and "password" are the company sign-ins; neither is ever treated as Google-verified.
 * "dev" is the fake-user sign-in (src/lib/dev-login.ts), honoured only while it is enabled.
 */
type SignInMethod = "google" | "email-code" | "password" | "dev";

export {};
