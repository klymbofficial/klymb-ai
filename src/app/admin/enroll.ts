"use server";

import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import type { TrackSlug } from "@/types/program";

export type EnrollResult = { ok: true } | { ok: false; message: string };

/** Turns a registration into an enrolled learner. Admin-only; RLS enforces it again. */
export async function enrollRegistration(input: {
  name: string; email: string; track: TrackSlug; cohort_start: string;
}): Promise<EnrollResult> {
  if (!(await getAdmin())) return { ok: false, message: "Not authorised." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Unavailable right now." };

  const { error } = await supabase.from("learners").insert({
    name: input.name,
    email: input.email.toLowerCase(),
    track: input.track,
    cohort_start: input.cohort_start,
  });

  // 23505 = already enrolled, which is not an error worth showing.
  if (error && error.code !== "23505") {
    console.error("enrol failed:", error.code, error.message);
    return { ok: false, message: "Could not enrol that person. Please try again." };
  }

  revalidatePath("/admin/learners");
  revalidatePath("/admin/registrations");
  return { ok: true };
}
