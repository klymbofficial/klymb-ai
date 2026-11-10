"use server";

import { signOut } from "@/auth";

/** Ends a company session, whether it began with a code or with Google. */
export async function signOutOfCompany() {
  await signOut({ redirectTo: "/org/sign-in" });
}
