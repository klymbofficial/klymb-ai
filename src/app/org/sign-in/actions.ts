"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { CODE_TTL_MINUTES } from "@/lib/company/signin-code";
import { requestSignInCode } from "@/lib/company/signin";
import { memberLookup } from "@/lib/company/lookup";
import { db } from "@/lib/db/client";
import { normaliseEmail } from "@/lib/email";

export interface SignInState {
  step: "email" | "code";
  email?: string;
  message?: string;
  error?: string;
}

const UNAVAILABLE = "Sign-in isn't available right now. Please try again in a few minutes.";

/** Both steps of /org/sign-in, told apart by the submit button's `intent`. */
export async function companySignIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const intent = formData.get("intent");
  const rawEmail = formData.get("email");
  const email = normaliseEmail(rawEmail);
  // What they typed, kept in the field when it isn't a valid address.
  const typed = typeof rawEmail === "string" ? rawEmail.trim().slice(0, 254) : undefined;

  if (intent === "restart") return { step: "email", email: email ?? undefined };

  if (intent === "request") {
    if (!email) return { step: "email", email: typed, error: "Enter a valid email address." };
    const result = await requestSignInCode(email);
    switch (result.status) {
      case "sent":
        // Said the same way whether or not the email was invited.
        return {
          step: "code",
          email,
          message: `If ${email} has been invited, a 6-digit code is on its way. It expires in ${CODE_TTL_MINUTES} minutes.`,
        };
      case "limited":
        return { step: "email", email, error: "Too many codes asked for. Please wait 15 minutes and try again." };
      case "invalid":
        return { step: "email", email: typed, error: "Enter a valid email address." };
      case "unavailable":
        return { step: "email", email, error: UNAVAILABLE };
    }
  }

  if (intent === "verify") {
    if (!email) return { step: "email", error: "Enter a valid email address." };
    try {
      await signIn("email-code", { email, code: formData.get("code"), redirect: false });
    } catch (error) {
      if (error instanceof CredentialsSignin && error.code === "rate_limited") {
        return { step: "code", email, error: "Too many attempts. Please wait 15 minutes and try again." };
      }
      if (error instanceof AuthError) {
        return { step: "code", email, error: "That code is wrong or has expired. Check it, or ask for a new one." };
      }
      throw error;
    }

    // Signed in. Send them to their own company; the slug comes from the database, not the form.
    const sql = db();
    const member = sql ? await memberLookup(sql)(email) : null;
    redirect(member ? `/org/${member.company_slug}` : "/org/sign-in");
  }

  return { step: "email" };
}
