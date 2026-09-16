"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInWithPassword(_: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  if (!supabase) return { error: "Sign-in is unavailable right now." };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // Deliberately vague: never reveal whether an email exists.
  if (error) return { error: "That email and password combination did not work." };

  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/admin/login");
}
