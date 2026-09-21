"use server";

import { cohort } from "@/data/config";
import { getTrack } from "@/data/tracks";
import { normaliseEmail } from "@/lib/email";
import { ensureLearner, UNIQUE_VIOLATION, type EnrolmentClient } from "@/lib/learner/enrolment";
import { checkRateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/admin";
import { clamp, LIMITS, validateRegistration, type RegistrationData, type RegistrationErrors } from "@/lib/validation";

export type RegisterResult =
  | { ok: true; duplicate?: boolean; enrolled?: boolean }
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

  const email = normaliseEmail(input.email);

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
    consent: input.consent === true,
  };

  const errors = validateRegistration(data);
  if (Object.keys(errors).length) return { ok: false, errors };

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

  // Open tracks enrol straight away, so the learner can start Day 1 now.
  let enrolled = false;
  if (getTrack(data.track)?.available) {
    // The client satisfies the narrow shape ensureLearner needs; Supabase's own
    // generics are too deep for TypeScript to prove it.
    enrolled = await ensureLearner(supabase as unknown as EnrolmentClient, {
      email: data.email,
      name: data.name,
      track: data.track,
      cohortStart: cohort.startDate,
    });
  }

  return { ok: true, duplicate, enrolled };
}
