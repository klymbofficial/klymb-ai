"use server";

import { revalidatePath } from "next/cache";
import { signIn, signOut } from "@/auth";
import { checkGithubUrl, checkLinkedinPostUrl, LINKEDIN_POST_DAYS, normaliseGithubUsername, normaliseLinkedinSlug } from "@/lib/learner/evidence";
import { getLearnerState } from "@/lib/learner/data";
import { checkRateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/admin";
import { clamp, LIMITS, safeUrl } from "@/lib/validation";

export type SubmitResult = { ok: true } | { ok: false; message: string };

export async function submitDay(day: number, formData: FormData): Promise<SubmitResult> {
  const rawUrl = String(formData.get("deliverable_url") ?? "").trim();
  const url = rawUrl ? safeUrl(rawUrl) : null;
  const note = clamp(formData.get("note"), LIMITS.note);
  const quizRaw = formData.get("quiz");
  const linkedinPost = clamp(formData.get("linkedin_post_url"), LIMITS.url);

  if (!Number.isInteger(day) || day < 1 || day > 30) return { ok: false, message: "That is not a valid day." };
  if (rawUrl && !url) {
    return { ok: false, message: "Enter a full link starting with https://, under 500 characters: or leave it blank." };
  }
  // A quiz-only submit is valid: the answers are the work for that step.
  let quizAnswers: string[] | null = null;
  if (typeof quizRaw === "string" && quizRaw) {
    try {
      const parsed: unknown = JSON.parse(quizRaw);
      if (Array.isArray(parsed)) quizAnswers = parsed.slice(0, 10).map((a) => clamp(a, LIMITS.quizAnswer));
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

  // Generous for a person re-saving drafts, tight for a script. Keyed to the
  // account, so learners sharing an office network never throttle each other.
  const limit = await checkRateLimit("day_submit", { limit: 60, windowMinutes: 60, identity: state.learner.id });
  if (!limit.allowed) return { ok: false, message: "You have saved a lot in the last hour. Wait a few minutes and try again." };

  // Evidence has to be the learner's own.
  const ownershipError =
    checkGithubUrl(url ?? "", state.learner.github_username) ??
    checkLinkedinPostUrl(linkedinPost, state.learner.linkedin_slug);
  if (ownershipError) return { ok: false, message: ownershipError };

  if (LINKEDIN_POST_DAYS.includes(day) && !linkedinPost && !submissionExists(state.submissions, day)) {
    return { ok: false, message: "This checkpoint needs your LinkedIn post link as well: it is part of the evidence." };
  }

  const supabase = createServiceClient();
  if (!supabase) return { ok: false, message: "Submissions are unavailable right now." };

  const { error } = await supabase
    .from("day_submissions")
    .upsert(
      {
        learner_id: state.learner.id,
        day,
        deliverable_url: url,
        note: note || null,
        ...(quizAnswers ? { quiz_answers: quizAnswers } : {}),
        ...(linkedinPost ? { linkedin_post_url: linkedinPost } : {}),
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

function submissionExists(submissions: { day: number }[], day: number) {
  return submissions.some((s) => s.day === day);
}

/** Learners declare their GitHub and LinkedIn once; everything is checked against these. */
export async function saveEvidenceProfile(_: unknown, formData: FormData) {
  const github = normaliseGithubUsername(String(formData.get("github") ?? ""));
  const linkedin = normaliseLinkedinSlug(String(formData.get("linkedin") ?? ""));

  if (!github) return { error: "That does not look like a GitHub profile. Paste https://github.com/your-username, or just your username." };
  if (!linkedin) return { error: "That does not look like a LinkedIn profile. Paste https://www.linkedin.com/in/yourname." };

  const state = await getLearnerState();
  if (state.state !== "enrolled") return { error: "You are not enrolled in a cohort." };

  const limit = await checkRateLimit("evidence_profile", { limit: 20, windowMinutes: 60, identity: state.learner.id });
  if (!limit.allowed) return { error: "Too many changes in the last hour. Try again shortly." };

  const supabase = createServiceClient();
  if (!supabase) return { error: "That could not be saved right now." };

  const { error } = await supabase
    .from("learners")
    .update({
      github_username: github,
      linkedin_slug: linkedin,
      github_url: `https://github.com/${github}`,
      linkedin_url: `https://www.linkedin.com/in/${linkedin}`,
    })
    .eq("id", state.learner.id);

  if (error) {
    console.error("profile save failed:", error.code, error.message);
    return { error: "That could not be saved right now." };
  }

  revalidatePath("/learn");
  return { saved: true };
}

export async function signInLearner() {
  await signIn("google", { redirectTo: "/learn" });
}

export async function signOutLearner() {
  await signOut({ redirectTo: "/learn/login" });
}
