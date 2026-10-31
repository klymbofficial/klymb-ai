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
      /** How this session signed in. Sessions from before this field existed have none. */
      signInMethod?: SignInMethod;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    emailIsVerified?: boolean;
    sid?: string;
    signInMethod?: SignInMethod;
  }
}

/** "email-code" is the company sign-in; it is never treated as Google-verified. */
type SignInMethod = "google" | "email-code";

export {};
