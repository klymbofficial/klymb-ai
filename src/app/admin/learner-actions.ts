"use server";

import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/admin/auth";
import { logAdmin } from "@/lib/admin/audit";
import { createServiceClient } from "@/lib/supabase/admin";
import { resetDevice } from "@/lib/learner/device";

export type LearnerActionResult = { ok: true } | { ok: false; message: string };

const STATUSES = ["active", "paused", "withdrawn", "completed"] as const;
export type LearnerStatus = (typeof STATUSES)[number];

/** Reversible: keeps their work and history, stops counting them in the cohort. */
export async function setLearnerStatus(id: string, status: LearnerStatus): Promise<LearnerActionResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, message: "Not authorised." };
  if (!STATUSES.includes(status)) return { ok: false, message: "Unknown status." };

  const supabase = createServiceClient();
  if (!supabase) return { ok: false, message: "Unavailable right now." };

  const { error } = await supabase.from("learners").update({ status }).eq("id", id);
  if (error) {
    console.error("status change failed:", error.code, error.message);
    return { ok: false, message: "That could not be saved." };
  }
  await logAdmin(admin, "learner.status", id, { status });

  revalidatePath("/admin/learners");
  return { ok: true };
}

/**
 * Permanent: deletes the learner and, by cascade, every submission and
 * assessment they have. Prefer withdrawing: this cannot be undone.
 */
export async function removeLearner(id: string, confirmEmail: string): Promise<LearnerActionResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, message: "Not authorised." };

  const supabase = createServiceClient();
  if (!supabase) return { ok: false, message: "Unavailable right now." };

  // Typed email must match the record, so a misclick cannot delete the wrong learner.
  const { data: learner } = await supabase.from("learners").select("email").eq("id", id).maybeSingle();
  if (!learner) return { ok: false, message: "That learner no longer exists." };
  if (learner.email.toLowerCase() !== confirmEmail.trim().toLowerCase()) {
    return { ok: false, message: "The email you typed does not match this learner. Nothing was deleted." };
  }

  const { error } = await supabase.from("learners").delete().eq("id", id);
  if (error) {
    console.error("learner delete failed:", error.code, error.message);
    return { ok: false, message: "That could not be deleted." };
  }
  await logAdmin(admin, "learner.remove", learner.email);

  revalidatePath("/admin/learners");
  revalidatePath("/admin/registrations");
  return { ok: true };
}

/** Frees a learner's one-device lock, e.g. after they lose or change their phone. */
export async function resetLearnerDevice(id: string): Promise<LearnerActionResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, message: "Not authorised." };
  const ok = await resetDevice(id);
  if (ok) await logAdmin(admin, "learner.device_reset", id);
  return ok ? { ok: true } : { ok: false, message: "That could not be reset." };
}
