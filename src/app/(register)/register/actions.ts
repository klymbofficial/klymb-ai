"use server";

import { currentEmail, signIn, signOut } from "@/auth";
import { cohort } from "@/data/config";
import { todayInIndia } from "@/lib/learn";
import { getTrack, trackSlugs } from "@/data/tracks";
import { after } from "next/server";
import { sendWelcome } from "@/lib/welcome";
import { db } from "@/lib/db/client";
import { ensureLearner, UNIQUE_VIOLATION } from "@/lib/learner/enrolment";
import { enrolmentClient } from "@/lib/learner/enrolment-db";
import { lookupPlaces } from "@/lib/registration-place";
import { checkRateLimit } from "@/lib/rate-limit";
import { clamp, LIMITS, parseRepoUrl, validateRegistration, type RegistrationData, type RegistrationErrors } from "@/lib/validation";
import type { TrackSlug } from "@/types/program";

export type RegisterResult =
  | {
      ok: true;
      /** The verified Google address the registration was made for. */
      email?: string;
      duplicate?: boolean;
      /** A course place exists for this email on the track chosen in the form now. */
      enrolled?: boolean;
      /** The canonical repository, owner/name, as saved. */
      repo?: string;
    }
  | {
      ok: false;
      errors?: RegistrationErrors;
      message?: string;
      /** Why it failed, when it was not a mistake in the form: lets the page say what to do next. */
      kind?: "signin" | "limited" | "unavailable" | "save-failed" | "support";
    };

/**
 * Registration, written entirely in trusted server code.
 *
 * The browser holds no database credential: this runs with the service-role
 * client, which never leaves the server, and the anon role has no write access
 * to registrations at all.
 *
 * It needs a Google-verified session, and the registration is made for that
 * session's email and no other: whatever address the browser sends is ignored.
 * So nobody can register, reserve a course place for, or overwrite the record
 * of an address they have not signed in as. Without a session it returns
 * before it reads or writes anything (no GitHub call, no rate-limit row, no
 * database access), so a signed-out attempt leaves no trace.
 */
export async function registerInterest(input: RegistrationData, honeypot?: string): Promise<RegisterResult> {
  // Bots fill every field, including the hidden one. Humans never see it.
  if (honeypot) return { ok: true };

  // The verified Google account is the identity, whatever the browser sent, so
  // the registration and the enrolment match the sign-in exactly.
  const email = await currentEmail();
  if (!email) {
    return { ok: false, kind: "signin", message: "Sign in with Google to register. Your sign-in may have ended." };
  }

  // Never trust the client: rebuild the record from clamped, canonical values.
  const data: RegistrationData = {
    name: clamp(input.name, LIMITS.name),
    email,
    phone: clamp(input.phone, LIMITS.phone).replace(/[\s()-]/g, ""),
    track: input.track,
    currentRole: clamp(input.currentRole, 60),
    experience: clamp(input.experience, 40),
    linkedin: clamp(input.linkedin, LIMITS.linkedin),
    github: clamp(input.github, LIMITS.github),
    repoConfirm: input.repoConfirm === true,
    consent: input.consent === true,
  };

  const errors = validateRegistration(data);
  if (Object.keys(errors).length) return { ok: false, errors };

  // Throttle before any outside call. Only a person who is signed in and whose
  // form is valid gets this far, and each attempt (a mistyped repository
  // included) counts, so repeated attempts are limited before they cost a
  // request to GitHub or a write here.
  const limit = await checkRateLimit("register", { limit: 5, windowMinutes: 60 });
  if (!limit.allowed) {
    return { ok: false, kind: "limited", message: "Too many registrations from this connection." };
  }

  const sql = db();
  if (!sql) return { ok: false, kind: "unavailable", message: "Registration is not available right now." };

  // Stored in one canonical form, so reviewers and the submission check see the same link.
  const repo = parseRepoUrl(data.github)!;
  data.github = repo.url;
  const repoError = await checkRepoExists(repo.owner, repo.repo);
  if (repoError) return { ok: false, errors: { github: repoError } };

  // A person can hold several tracks, one place on each: registering for
  // another track adds a place there and never moves or rewrites one they
  // already have. Their places are read first, and if that read fails, or a
  // place is on a track this app does not know (retired or corrupt), stop
  // before writing anything: neither is "no place".
  const place = await lookupPlaces(sql, data.email);
  if (!place.ok) {
    if (place.reason === "unknown-track") {
      return { ok: false, kind: "support", message: "We can't register this account automatically: it needs a quick check by our team. Nothing was changed." };
    }
    return { ok: false, kind: "unavailable", message: "Registration is not available right now." };
  }
  const alreadyOnTrack = place.tracks.includes(data.track as TrackSlug);

  const { error } = await sql.run`
    insert into course.registrations
      (name, email, phone, track, job_role, experience, linkedin, github, consent, cohort_start)
    values (
      ${data.name}, ${data.email}, ${data.phone}, ${data.track}, ${data.currentRole},
      ${data.experience}, ${data.linkedin || null}, ${data.github || null},
      ${data.consent}, ${cohort.startDate}
    )
  `;

  const duplicate = error?.code === UNIQUE_VIOLATION;

  if (error && !duplicate) {
    console.error("registrations insert failed:", error.code, error.message);
    return { ok: false, kind: "save-failed", message: "Something went wrong saving your registration." };
  }

  if (duplicate) {
    // Already registered for this track: keep their latest answers rather
    // than the first ones. Only this track's row: another track they are on
    // keeps its own repository. The address is the verified session's.
    await sql.run`
      update course.registrations
         set name = ${data.name}, phone = ${data.phone},
             job_role = ${data.currentRole}, experience = ${data.experience},
             linkedin = ${data.linkedin || null}, github = ${data.github || null}
       where email = ${data.email} and track = ${data.track} and cohort_start = ${cohort.startDate}
    `;
  }

  // Only tracks whose course is built enrol straight into Day 1. The others
  // hold a reserved place until their content opens.
  let enrolled = false;
  if (getTrack(data.track)?.contentLive) {
    enrolled = await ensureLearner(enrolmentClient(sql), {
      email: data.email,
      name: data.name,
      track: data.track,
      // Rolling enrolment: Day 1 is the day they join, not a shared date.
      cohortStart: todayInIndia(),
      githubUsername: repo.owner,
      githubUrl: repo.url,
    });
  }

  // A first registration gets the welcome email, after the response so the form never waits on it.
  // Not when they were already on this track: they have been welcomed to it before.
  if (!duplicate && !alreadyOnTrack) after(() => sendWelcome({ email: data.email, name: data.name, track: data.track }));

  return {
    ok: true,
    email: data.email,
    duplicate,
    enrolled,
    repo: `${repo.owner}/${repo.repo}`,
  };
}

/**
 * The repository must exist and be public: reviewers open it all cohort.
 * GitHub being slow, down or rate-limiting us never blocks a registration.
 */
async function checkRepoExists(owner: string, repo: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "klymb.ai" },
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (res.status === 404) {
      return "We couldn't find that repository. Check the spelling, and make sure it is public.";
    }
    if (res.ok) {
      const body = (await res.json()) as { private?: boolean };
      if (body.private) return "That repository is private. Make it public so your work can be opened and checked.";
    }
  } catch {
    // Network trouble: accept it, a reviewer checks the repository on Day 1.
  }
  return null;
}

/** Where a Google round trip from the form comes back to, track kept. */
function registerPath(formData: FormData) {
  const track = String(formData.get("track") ?? "");
  return trackSlugs.includes(track as TrackSlug) ? `/register?track=${track}` : "/register";
}

/** "Register with Google": sign in, then return to the form with the account filled in. */
export async function startGoogleRegistration(formData: FormData) {
  await signIn("google", { redirectTo: registerPath(formData) });
}

/** "Use a different account": drop the Google session and return to the form. */
export async function switchGoogleAccount(formData: FormData) {
  await signOut({ redirectTo: registerPath(formData) });
}
