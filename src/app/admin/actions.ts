"use server";

import { signIn, signOut as authSignOut } from "@/auth";

export async function signInWithGoogle(redirectTo = "/admin") {
  await signIn("google", { redirectTo });
}

export async function signOut() {
  await authSignOut({ redirectTo: "/admin/login" });
}
