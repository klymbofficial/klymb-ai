"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/auth";
import { normaliseEmail } from "@/lib/email";
import { claimDevice, releaseDevice } from "@/lib/learner/device";
import { broadcastTakeover } from "@/lib/learner/device-channel";
import { checkGithubUrl, checkLinkedinPostUrl, LINKEDIN_POST_DAYS, normaliseGithubUsername, normaliseLinkedinSlug } from "@/lib/learner/evidence";
import { getLearnerState } from "@/lib/learner/data";
import { dayLock } from "@/lib/access";
import { getTrack } from "@/data/tracks";
import { getCurriculumDay } from "@/data/curricula";
import { todayInIndia } from "@/lib/learn";
import { checkFreshPush } from "@/lib/learner/github";
import { checkAnswers, checkPace, checkReusedLink, checkWorkLink } from "@/lib/learner/integrity";
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
  let quizAnswers: string[] | null = null;
  // Answers arrive as quiz_0, quiz_1… with the day's form (or as one JSON field from older clients).
  const fields = Array.from({ length: 10 }, (_, i) => formData.get(`quiz_${i}`)).filter((v) => typeof v === "string");
  if (fields.length) quizAnswers = fields.map((a) => clamp(a, LIMITS.quizAnswer));
  else if (typeof quizRaw === "string" && quizRaw) {
    try {
      const parsed: unknown = JSON.parse(quizRaw);
      if (Array.isArray(parsed)) quizAnswers = parsed.slice(0, 10).map((a) => clamp(a, LIMITS.quizAnswer));
    } catch {
      return { ok: false, message: "Your answers could not be read. Please try again." };
    }
  }

  // Authorisation: the submission is written for the signed-in learner only.
  const state = await getLearnerState();
  if (state.state !== "enrolled") return { ok: false, message: "You are not enrolled in a cohort." };
  // Same rules as the page, enforced here too: days in order, Days 2+ paid.
  const lock = await dayLock({
    email: state.learner.email,
    track: state.learner.track,
    price: getTrack(state.learner.track)?.price ?? 0,
    day,
    submittedDays: state.submissions.map((x) => x.day),
  });
  if (lock === "pay") return { ok: false, message: "Unlock the full course to submit this day." };
  if (lock === "previous") return { ok: false, message: `Submit Day ${day - 1} first: days unlock in order.` };

  // Generous for a person re-saving drafts, tight for a script. Keyed to the
  // account, so learners sharing an office network never throttle each other.
  const limit = await checkRateLimit("day_submit", { limit: 60, windowMinutes: 60, identity: state.learner.id });
  if (!limit.allowed) return { ok: false, message: "You have saved a lot in the last hour. Wait a few minutes and try again." };

  // Evidence has to be real, today's, and the learner's own.
  const questions = getCurriculumDay(state.learner.track, day)?.quiz ?? [];
  const integrityError =
    checkWorkLink(url) ??
    checkGithubUrl(url!, state.learner.github_username) ??
    checkReusedLink(url!, day, state.submissions) ??
    checkAnswers(questions, quizAnswers) ??
    checkLinkedinPostUrl(linkedinPost, state.learner.linkedin_slug) ??
    checkPace(todayInIndia(), day, state.submissions);
  if (integrityError) return { ok: false, message: integrityError };
  if (!(await linkIsPublic(url!))) {
    return { ok: false, message: "We couldn't open that link. Check the file is pushed and the repository is public, then try again." };
  }
  // A real, new push by the learner: committed by their account after the previous day was submitted.
  const previous = state.submissions.find((x) => x.day === day - 1)?.submitted_at ?? null;
  const pushError = await checkFreshPush(url!, state.learner.github_username!, previous);
  if (pushError) return { ok: false, message: pushError };

  if (LINKEDIN_POST_DAYS.includes(day) && !linkedinPost && !submissionExists(state.submissions, day)) {
    return { ok: false, message: "This checkpoint needs your LinkedIn post link as well: it is part of the evidence." };
  }

  const supabase = createServiceClient();
  if (!supabase) return { ok: false, message: "Submissions are unavailable right now." };

  const row = {
    deliverable_url: url,
    note: note || null,
    ...(quizAnswers ? { quiz_answers: quizAnswers } : {}),
    ...(linkedinPost ? { linkedin_post_url: linkedinPost } : {}),
    status: "submitted",
  };
  // submitted_at records the first save only, so re-saving an old day never
  // looks like new progress (the daily pace limit depends on it).
  const { error } = submissionExists(state.submissions, day)
    ? await supabase.from("day_submissions").update(row).eq("learner_id", state.learner.id).eq("day", day)
    : await supabase.from("day_submissions").insert({ ...row, learner_id: state.learner.id, day, submitted_at: new Date().toISOString() });

  if (error) {
    console.error("day submission failed:", error.code, error.message);
    return { ok: false, message: "Something went wrong saving that. Please try again." };
  }

  revalidatePath("/learn");
  revalidatePath(`/learn/day/${day}`);
  return { ok: true };
}

/** The work must be reachable: a 404 means a private repo, an unpushed file or a made-up link. GitHub being down never blocks a learner. */
async function linkIsPublic(url: string) {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(5000), cache: "no-store" });
    return res.status !== 404;
  } catch {
    return true;
  }
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

  // Locked once work is submitted: switching to someone else's account would
  // make their repository look like yours. The team can change it on request.
  const { github_username: oldGithub, linkedin_slug: oldLinkedin } = state.learner;
  const changed = (oldGithub && oldGithub.toLowerCase() !== github.toLowerCase()) || (oldLinkedin && oldLinkedin !== linkedin);
  if (changed && state.submissions.length > 0) {
    return { error: "Your GitHub and LinkedIn are locked once you've submitted work. Ask Kamran (bottom right) to send a change request to the team." };
  }

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

/**
 * "Continue on this device": moves the learner's one device slot here, which
 * signs the other device out on its next click. Limited to 5 a day, so an
 * account can't bounce between two people all day.
 */
export async function continueOnThisDevice() {
  const session = await auth();
  const email = normaliseEmail(session?.user?.email);
  const sid = session?.user?.sid;
  if (!email || !sid || session?.user?.emailIsVerified !== true) redirect("/learn/login");

  const limit = await checkRateLimit("device_takeover", { limit: 5, windowMinutes: 24 * 60, identity: email });
  if (!limit.allowed) redirect("/learn/login?error=takeover-limit");

  await claimDevice(email, sid);
  console.info("device takeover:", email);
  // Tell the old device right away (it re-checks and leaves within a second).
  const { data: learner } = (await createServiceClient()?.from("learners").select("id").eq("email", email).maybeSingle()) ?? { data: null };
  if (learner?.id) await broadcastTakeover(learner.id as string);
  redirect("/learn");
}

export async function signOutLearner() {
  // Free this device's slot so the learner can sign in somewhere else.
  const session = await auth();
  const email = normaliseEmail(session?.user?.email);
  if (email) await releaseDevice(email, session?.user?.sid);
  await signOut({ redirectTo: "/learn/login" });
}
