"use server";

import { currentEmail, signIn, signOut } from "@/auth";
import { cohort } from "@/data/config";
import { todayInIndia } from "@/lib/learn";
import { getTrack, trackSlugs } from "@/data/tracks";
import { after } from "next/server";
import { normaliseEmail } from "@/lib/email";
import { sendWelcome } from "@/lib/welcome";
import { ensureLearner, UNIQUE_VIOLATION, type EnrolmentClient } from "@/lib/learner/enrolment";
import { checkRateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/admin";
import { clamp, LIMITS, parseRepoUrl, validateRegistration, type RegistrationData, type RegistrationErrors } from "@/lib/validation";
import type { TrackSlug } from "@/types/program";

export type RegisterResult =
  | { ok: true; duplicate?: boolean; enrolled?: boolean; signedIn?: boolean }
  | { ok: false; errors?: RegistrationErrors; message?: string };

/**
 * Public registration, written entirely in trusted server code.
 *
 * The browser holds no database credential: this runs with the service-role
 * client, which never leaves the server, and the anon role has no write access
 * to registrations at all.
 */
export async function registerInterest(input: RegistrationData, honeypot?: string): Promise<RegisterResult> {
  // Bots fill every field, including the hidden one. Humans never see it.
  if (honeypot) return { ok: true };

  // Registering with Google: the verified account is the identity, whatever
  // the browser sent, so the enrolment matches the sign-in exactly.
  const sessionEmail = await currentEmail();
  const email = sessionEmail ?? normaliseEmail(input.email);

  // Never trust the client: rebuild the record from clamped, canonical values.
  const data: RegistrationData = {
    name: clamp(input.name, LIMITS.name),
    email: email ?? "",
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

  // Stored in one canonical form, so reviewers and the submission check see the same link.
  const repo = parseRepoUrl(data.github)!;
  data.github = repo.url;
  const repoError = await checkRepoExists(repo.owner, repo.repo);
  if (repoError) return { ok: false, errors: { github: repoError } };

  // Throttle before touching anything else, so a flood costs one cheap count.
  const limit = await checkRateLimit("register", { limit: 5, windowMinutes: 60 });
  if (!limit.allowed) {
    return { ok: false, message: "Too many registrations from this connection. Please try again later, or email us." };
  }

  const supabase = createServiceClient();
  if (!supabase) return { ok: false, message: "Registration is not available right now. Please email us instead." };

  const { error } = await supabase.from("registrations").insert({
    name: data.name,
    email: data.email,
    phone: data.phone,
    track: data.track,
    job_role: data.currentRole,
    experience: data.experience,
    linkedin: data.linkedin || null,
    github: data.github || null,
    consent: data.consent,
    cohort_start: cohort.startDate,
  });

  const duplicate = error?.code === UNIQUE_VIOLATION;

  if (duplicate) {
    // Already registered: keep their latest answers rather than the first ones.
    await supabase
      .from("registrations")
      .update({
        name: data.name,
        phone: data.phone,
        track: data.track,
        job_role: data.currentRole,
        experience: data.experience,
        linkedin: data.linkedin || null,
        github: data.github || null,
      })
      .eq("email", data.email)
      .eq("cohort_start", cohort.startDate);
  }

  if (error && !duplicate) {
    console.error("registrations insert failed:", error.code, error.message);
    return { ok: false, message: "Something went wrong saving your registration. Please try again, or email us." };
  }

  // Only tracks whose course is built enrol straight into Day 1. The others
  // hold a reserved place until their content opens.
  let enrolled = false;
  if (getTrack(data.track)?.contentLive) {
    // The client satisfies the narrow shape ensureLearner needs; Supabase's own
    // generics are too deep for TypeScript to prove it.
    enrolled = await ensureLearner(supabase as unknown as EnrolmentClient, {
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
  if (!duplicate) after(() => sendWelcome({ email: data.email, name: data.name, track: data.track }));

  return { ok: true, duplicate, enrolled, signedIn: !!sessionEmail };
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
      if (body.private) return "That repository is private. Make it public so reviewers can see your work.";
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
