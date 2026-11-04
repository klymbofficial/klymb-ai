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
import { db } from "@/lib/db/client";
import { checkRateLimit } from "@/lib/rate-limit";
import { gradeQuiz } from "@/lib/challenge-quiz";
import type { QuizResult } from "@/lib/quiz-score";
import { clamp, LIMITS, safeUrl } from "@/lib/validation";

export type SubmitResult = { ok: true } | { ok: false; message: string };

export async function submitDay(day: number, formData: FormData): Promise<SubmitResult> {
  const rawUrl = String(formData.get("deliverable_url") ?? "").trim();
  const url = rawUrl ? safeUrl(rawUrl) : null;
  const note = clamp(formData.get("note"), LIMITS.note);
  const quizRaw = formData.get("quiz");
  const linkedinPost = clamp(formData.get("linkedin_post_url"), LIMITS.url);

  // 60 is the longest course (a challenge); the learner's own course length is checked below.
  if (!Number.isInteger(day) || day < 1 || day > 60) return { ok: false, message: "That is not a valid day." };
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

  // Authorisation: the submission is written for the signed-in learner only,
  // on the track the form names (older queued submits carry none: their most recent).
  const trackField = formData.get("track");
  const state = await getLearnerState(typeof trackField === "string" && trackField ? trackField : undefined);
  if (state.state !== "enrolled") return { ok: false, message: "You are not enrolled on this track." };
  if (!getCurriculumDay(state.learner.track, day)) return { ok: false, message: "That is not a valid day." };
  const isChallenge = getTrack(state.learner.track)?.kind === "challenge";
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

  // A challenge is built in public: every day's work goes up on LinkedIn.
  if ((isChallenge || LINKEDIN_POST_DAYS.includes(day)) && !linkedinPost && !submissionExists(state.submissions, day)) {
    return { ok: false, message: isChallenge ? "Add the link to today's LinkedIn post as well: posting every day is part of the challenge." : "This checkpoint needs your LinkedIn post link as well: it is part of the evidence." };
  }

  const sql = db();
  if (!sql) return { ok: false, message: "Submissions are unavailable right now." };

  // Answers are a JSON array in a jsonb column, so they go over as JSON text:
  // a bare array would be sent as a Postgres array literal, which jsonb rejects.
  const answers = quizAnswers ? JSON.stringify(quizAnswers) : null;
  const post = linkedinPost || null;
  // submitted_at records the first save only, so re-saving an old day never
  // looks like new progress (the daily pace limit depends on it).
  const { error } = submissionExists(state.submissions, day)
    // coalesce, not assignment: a save that carries no answers or no post must
    // leave the ones already stored alone, as omitting the column used to.
    ? await sql.run`
        update course.day_submissions
           set deliverable_url = ${url},
               note = ${note || null},
               quiz_answers = coalesce(${answers}::jsonb, quiz_answers),
               linkedin_post_url = coalesce(${post}, linkedin_post_url),
               status = 'submitted'
         where learner_id = ${state.learner.id} and day = ${day}
      `
    : await sql.run`
        insert into course.day_submissions
          (learner_id, day, deliverable_url, note, quiz_answers, linkedin_post_url, status, submitted_at)
        values (
          ${state.learner.id}, ${day}, ${url}, ${note || null}, ${answers}::jsonb,
          ${post}, 'submitted', ${new Date().toISOString()}
        )
      `;

  if (error) {
    console.error("day submission failed:", error.code, error.message);
    return { ok: false, message: "Something went wrong saving that. Please try again." };
  }

  revalidatePath("/learn");
  revalidatePath(`/learn/tracks/${state.learner.track}`);
  revalidatePath(`/learn/tracks/${state.learner.track}/day/${day}`);
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

  const trackField = formData.get("track");
  const state = await getLearnerState(typeof trackField === "string" && trackField ? trackField : undefined);
  if (state.state !== "enrolled") return { error: "You are not enrolled on this track." };

  // Locked once work is submitted: switching to someone else's account would
  // make their repository look like yours. The team can change it on request.
  const { github_username: oldGithub, linkedin_slug: oldLinkedin } = state.learner;
  const changed = (oldGithub && oldGithub.toLowerCase() !== github.toLowerCase()) || (oldLinkedin && oldLinkedin !== linkedin);
  if (changed && state.submissions.length > 0) {
    return { error: "Your GitHub and LinkedIn are locked once you've submitted work. Ask Kamran (bottom right) to send a change request to the team." };
  }

  const limit = await checkRateLimit("evidence_profile", { limit: 20, windowMinutes: 60, identity: state.learner.id });
  if (!limit.allowed) return { error: "Too many changes in the last hour. Try again shortly." };

  const sql = db();
  if (!sql) return { error: "That could not be saved right now." };

  const { error } = await sql.run`
    update course.learners
       set github_username = ${github},
           linkedin_slug = ${linkedin},
           github_url = ${`https://github.com/${github}`},
           linkedin_url = ${`https://www.linkedin.com/in/${linkedin}`}
     where id = ${state.learner.id}
  `;

  if (error) {
    console.error("profile save failed:", error.code, error.message);
    return { error: "That could not be saved right now." };
  }

  revalidatePath(`/learn/tracks/${state.learner.track}`);
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
  const sql = db();
  const { data: learner } = sql
    ? await sql.row<{ id: string }>`select id from course.learners where email = ${email} order by created_at limit 1`
    : { data: null };
  if (learner?.id) await broadcastTakeover(learner.id);
  redirect("/learn");
}

export async function signOutLearner() {
  // Free this device's slot so the learner can sign in somewhere else.
  const session = await auth();
  const email = normaliseEmail(session?.user?.email);
  if (email) await releaseDevice(email, session?.user?.sid);
  await signOut({ redirectTo: "/learn/login" });
}

/**
 * A challenge's weekly quiz: scored here against the key, never in the
 * browser, and recorded as one try. Answers are option indexes, in order.
 */
export async function submitQuiz(track: string, week: number, answers: number[]): Promise<{ ok: true; result: QuizResult } | { ok: false; message: string }> {
  if (!Number.isInteger(week) || week < 1 || week > 9) return { ok: false, message: "That is not a valid week." };
  if (!Array.isArray(answers) || answers.length > 50 || !answers.every((a) => Number.isInteger(a) && a >= 0 && a <= 3)) {
    return { ok: false, message: "Answer every question first." };
  }
  const state = await getLearnerState(track);
  if (state.state !== "enrolled" || getTrack(state.learner.track)?.kind !== "challenge") return { ok: false, message: "You are not on this challenge." };
  const limit = await checkRateLimit("challenge_quiz", { limit: 30, windowMinutes: 60, identity: state.learner.id });
  if (!limit.allowed) return { ok: false, message: "That is a lot of tries in an hour. Have a break and come back." };
  const result = await gradeQuiz(state.learner.id, state.learner.track, week, answers);
  if (!result) return { ok: false, message: "Answer every question first." };
  revalidatePath(`/learn/tracks/${state.learner.track}`);
  return { ok: true, result };
}
