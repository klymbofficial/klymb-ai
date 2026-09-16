"use server";

import { cohort } from "@/data/config";
import { getTrack } from "@/data/tracks";
import { getSupabase } from "@/lib/supabase";
import { validateRegistration, type RegistrationData, type RegistrationErrors } from "@/lib/validation";

export type RegisterResult =
  | { ok: true; duplicate?: boolean; enrolled?: boolean }
  | { ok: false; errors?: RegistrationErrors; message?: string };

/** Postgres unique-violation: this email already registered for this cohort. */
const UNIQUE_VIOLATION = "23505";

export async function registerInterest(input: RegistrationData, honeypot?: string): Promise<RegisterResult> {
  // Bots fill every field, including the hidden one. Humans never see it.
  if (honeypot) return { ok: true };

  // Never trust the client: validate again on the server.
  const data: RegistrationData = {
    name: String(input.name ?? "").trim(),
    email: String(input.email ?? "").trim().toLowerCase(),
    phone: String(input.phone ?? "").replace(/[\s()-]/g, ""),
    track: input.track,
    currentRole: String(input.currentRole ?? ""),
    experience: String(input.experience ?? ""),
    linkedin: String(input.linkedin ?? "").trim(),
    consent: input.consent === true,
  };
  const errors = validateRegistration(data);
  if (Object.keys(errors).length) return { ok: false, errors };

  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: "Registration is not available right now. Please email us instead." };

  const { error } = await supabase.from("registrations").insert({
    name: data.name,
    email: data.email,
    phone: data.phone,
    track: data.track,
    job_role: data.currentRole,
    experience: data.experience,
    linkedin: data.linkedin || null,
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
      })
      .ilike("email", data.email)
      .eq("cohort_start", cohort.startDate);
  }

  if (error && !duplicate) {
    console.error("registrations insert failed:", error.code, error.message);
    return { ok: false, message: "Something went wrong saving your registration. Please try again, or email us." };
  }

  // Open tracks enrol straight away, so the learner can start Day 1 now.
  let enrolled = false;
  if (getTrack(data.track)?.available) {
    const { data: placed, error: enrolError } = await supabase.rpc("enrol_open_track", { p_email: data.email });
    if (enrolError) console.error("enrolment failed:", enrolError.code, enrolError.message);
    // The function returns true only when a place actually exists.
    enrolled = placed === true;
  }

  return { ok: true, duplicate, enrolled };
}
