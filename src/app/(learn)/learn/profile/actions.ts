"use server";

import { revalidatePath } from "next/cache";
import { currentEmail } from "@/auth";
import { saveProfile } from "@/lib/profile";
import { parseProfile, type ProfileErrors } from "@/lib/profile-validate";
import { checkRateLimit } from "@/lib/rate-limit";

export type ProfileFormState = {
  saved?: boolean;
  message?: string;
  errors?: ProfileErrors;
  /** What they typed, handed back when it isn't saved: React clears a form after its action runs. */
  values?: Record<string, string>;
} | null;

/** The submitted text fields, kept short, to refill the form. */
function typed(form: FormData): Record<string, string> {
  return Object.fromEntries([...form.entries()].filter((e): e is [string, string] => typeof e[1] === "string" && !e[0].startsWith("$")).map(([k, v]) => [k, v.slice(0, 600)]));
}

/** Saves the signed-in learner's profile, every field checked again here. */
export async function saveProfileAction(_: ProfileFormState, form: FormData): Promise<ProfileFormState> {
  const email = await currentEmail();
  if (!email) return { message: "Log in again to save your profile.", values: typed(form) };
  const { profile, errors } = parseProfile(form);
  if (Object.keys(errors).length) return { errors, message: "Check the fields marked above.", values: typed(form) };
  const limit = await checkRateLimit("profile_save", { limit: 40, windowMinutes: 60, identity: email });
  if (!limit.allowed) return { message: "That's a lot of saves in an hour. Try again in a few minutes.", values: typed(form) };
  if (!(await saveProfile(email, profile))) return { message: "Your profile could not be saved right now. Please try again.", values: typed(form) };
  revalidatePath("/learn/profile");
  revalidatePath("/learn");
  return { saved: true };
}
