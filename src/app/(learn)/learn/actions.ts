"use server";

import { revalidatePath } from "next/cache";
import { signIn, signOut } from "@/auth";
import { getLearnerState } from "@/lib/learner/data";
import { createServiceClient } from "@/lib/supabase/admin";

export type SubmitResult = { ok: true } | { ok: false; message: string };

export async function submitDay(day: number, formData: FormData): Promise<SubmitResult> {
  const url = String(formData.get("deliverable_url") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const quizRaw = formData.get("quiz");

  if (!Number.isInteger(day) || day < 1 || day > 30) return { ok: false, message: "That is not a valid day." };
  if (url && !/^https?:\/\/.+\..+/i.test(url)) return { ok: false, message: "Enter a full link starting with https://, or leave it blank." };
  // A quiz-only submit is valid: the answers are the work for that step.
  let quizAnswers: string[] | null = null;
  if (typeof quizRaw === "string" && quizRaw) {
    try {
      const parsed: unknown = JSON.parse(quizRaw);
      if (Array.isArray(parsed)) quizAnswers = parsed.slice(0, 10).map((a) => String(a).slice(0, 2000));
    } catch {
      return { ok: false, message: "Your answers could not be read. Please try again." };
    }
  }

  const hasQuiz = quizAnswers?.some((a) => a.trim().length > 2) ?? false;
  if (!url && !hasQuiz && note.length < 20) {
    return { ok: false, message: "Add a link to your work, answer the questions, or describe what you did in at least 20 characters." };
  }

  // Authorisation: the submission is written for the signed-in learner only.
  const state = await getLearnerState();
  if (state.state !== "enrolled") return { ok: false, message: "You are not enrolled in a cohort." };

  const supabase = createServiceClient();
  if (!supabase) return { ok: false, message: "Submissions are unavailable right now." };

  const { error } = await supabase
    .from("day_submissions")
    .upsert(
      {
        learner_id: state.learner.id,
        day,
        deliverable_url: url || null,
        note: note || null,
        ...(quizAnswers ? { quiz_answers: quizAnswers } : {}),
        status: "submitted",
        submitted_at: new Date().toISOString(),
      },
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

export async function signInLearner() {
  await signIn("google", { redirectTo: "/learn" });
}

export async function signOutLearner() {
  await signOut({ redirectTo: "/learn/login" });
}
