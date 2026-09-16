"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLearnerState } from "@/lib/learner/data";

export type SubmitResult = { ok: true } | { ok: false; message: string };

export async function submitDay(day: number, formData: FormData): Promise<SubmitResult> {
  const url = String(formData.get("deliverable_url") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!Number.isInteger(day) || day < 1 || day > 30) return { ok: false, message: "That is not a valid day." };
  if (url && !/^https?:\/\/.+\..+/i.test(url)) return { ok: false, message: "Enter a full link starting with https://, or leave it blank." };
  if (!url && note.length < 20) return { ok: false, message: "Add a link to your work, or at least 20 characters describing what you did." };

  const state = await getLearnerState();
  if (state.state !== "enrolled") return { ok: false, message: "You are not enrolled in a cohort." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Submissions are unavailable right now." };

  const { error } = await supabase
    .from("day_submissions")
    .upsert(
      { learner_id: state.learner.id, day, deliverable_url: url || null, note: note || null, status: "submitted", submitted_at: new Date().toISOString() },
      { onConflict: "learner_id,day" },
    );

  if (error) {
    console.error("day submission failed:", error.code, error.message);
    return { ok: false, message: "Something went wrong saving that. Please try again." };
  }

  revalidatePath("/learn");
  revalidatePath(`/learn/day/${day}`);
  return { ok: true };
}

export async function signOutLearner() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/learn/login");
}

export async function signInLearner(_: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  if (!supabase) return { error: "Sign-in is unavailable right now." };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "That email and password combination did not work." };

  redirect("/learn");
}
