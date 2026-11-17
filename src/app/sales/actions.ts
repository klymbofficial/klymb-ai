"use server";

import { signIn, signOut } from "@/auth";

/** Interns sign in with Google, like admins; their access comes from course.sales_reps. */
export async function signInToSales() {
  await signIn("google", { redirectTo: "/sales" });
}

export async function signOutOfSales() {
  await signOut({ redirectTo: "/sales/login" });
}
