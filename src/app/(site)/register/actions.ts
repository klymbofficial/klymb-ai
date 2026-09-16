"use server";

import { cohort } from "@/data/config";
import { getSupabase } from "@/lib/supabase";
import { validateRegistration, type RegistrationData, type RegistrationErrors } from "@/lib/validation";

export type RegisterResult =
  | { ok: true; duplicate?: boolean }
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

  if (error?.code === UNIQUE_VIOLATION) return { ok: true, duplicate: true };

  if (error) {
    console.error("registrations insert failed:", error.code, error.message);
    return { ok: false, message: "Something went wrong saving your registration. Please try again, or email us." };
  }
  return { ok: true };
}
