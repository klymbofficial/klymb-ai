"use server";

import { revalidatePath } from "next/cache";
import { getSalesAdmin } from "@/lib/admin/auth";
import { logAdmin } from "@/lib/admin/audit";
import { db } from "@/lib/db/client";
import { INTERNSHIP_LIMITS, isInternStatus } from "@/lib/internship";

type Result = { ok: true; rep?: boolean } | { ok: false; message: string };

/**
 * Moves an application along: shortlisted, accepted or rejected, with the
 * note from the call. Accepting also makes them a sales rep, so they can sign
 * in at /sales with that Google email. Owners and sales managers only.
 */
export async function setInternStatus(id: string, status: string, note: string): Promise<Result> {
  const admin = await getSalesAdmin();
  if (!admin) return { ok: false, message: "Not authorised." };
  if (!/^[0-9a-f-]{36}$/.test(id) || !isInternStatus(status)) return { ok: false, message: "That can't be changed." };
  const sql = db();
  if (!sql) return { ok: false, message: "Unavailable right now." };
  const callNote = note.trim().slice(0, INTERNSHIP_LIMITS.callNote) || null;
  const { data: app, error } = await sql.row<{ email: string; name: string }>`
    update course.internship_applications
       set status = ${status}, call_note = coalesce(${callNote}, call_note),
           status_changed_at = now(), status_by = ${admin.email}, updated_at = now()
     where id = ${id}
     returning email, name
  `;
  if (error || !app) return { ok: false, message: "That could not be saved." };

  let rep = false;
  if (status === "accepted") {
    const { error: repError } = await sql.run`
      insert into course.sales_reps (email, name, added_by) values (${app.email}, ${app.name.slice(0, 80)}, ${admin.email})
      on conflict (email) do update set active = true, removed_at = null, name = coalesce(course.sales_reps.name, excluded.name)
    `;
    rep = !repError;
    if (repError) console.error("intern to rep failed:", repError.code, repError.message);
  }
  await logAdmin(admin, "internship.status", id, { status, email: app.email, rep });
  revalidatePath("/admin/internship");
  revalidatePath("/admin/sales/team");
  return { ok: true, rep };
}

/** Saves the note from the call without changing the status. */
export async function saveInternNote(id: string, note: string): Promise<Result> {
  const admin = await getSalesAdmin();
  if (!admin) return { ok: false, message: "Not authorised." };
  if (!/^[0-9a-f-]{36}$/.test(id)) return { ok: false, message: "That can't be changed." };
  const sql = db();
  if (!sql) return { ok: false, message: "Unavailable right now." };
  const { error } = await sql.run`
    update course.internship_applications set call_note = ${note.trim().slice(0, INTERNSHIP_LIMITS.callNote) || null}, updated_at = now() where id = ${id}
  `;
  if (error) return { ok: false, message: "That could not be saved." };
  revalidatePath("/admin/internship");
  return { ok: true };
}
