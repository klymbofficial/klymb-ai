"use server";

import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/admin/auth";
import { logAdmin } from "@/lib/admin/audit";
import { db } from "@/lib/db/client";
import { platformUserId } from "@/lib/learner/enrolment-db";
import type { TrackSlug } from "@/types/program";
import { todayInIndia } from "@/lib/learn";

export type EnrollResult = { ok: true } | { ok: false; message: string };

/** Turns a registration into an enrolled learner. Admin-only, checked here. */
export async function enrollRegistration(input: {
  name: string; email: string; track: TrackSlug; cohort_start: string;
}): Promise<EnrollResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, message: "Not authorised." };

  const sql = db();
  if (!sql) return { ok: false, message: "Unavailable right now." };

  const email = input.email.toLowerCase();
  // Rolling enrolment: Day 1 is the day they are enrolled. The registration's
  // cohort_start is only its intake key. user_id links the place to their
  // app.klymb.ai account, when they have one.
  const { error } = await sql.run`
    insert into course.learners (name, email, track, cohort_start, user_id)
    values (${input.name}, ${email}, ${input.track}, ${todayInIndia()}, ${await platformUserId(sql, email)})
  `;

  if (!error) await logAdmin(admin, "learner.enrol", input.email.toLowerCase(), { track: input.track });

  // 23505 = already enrolled, which is not an error worth showing.
  if (error && error.code !== "23505") {
    console.error("enrol failed:", error.code, error.message);
    return { ok: false, message: "Could not enroll that person. Please try again." };
  }

  revalidatePath("/admin/learners");
  revalidatePath("/admin/registrations");
  return { ok: true };
}
