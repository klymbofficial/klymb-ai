"use server";

import { signIn } from "@/auth";

/**
 * Google sign-in from the hackathon page, back to its registration section.
 * Any Google account will do: registering needs no course. Backing out at
 * Google returns here too (see signInFailedPath).
 */
export async function signInForHackathon() {
  await signIn("google", { redirectTo: "/hackathons#register" });
}
