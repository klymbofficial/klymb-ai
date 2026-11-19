"use server";

import { revalidatePath } from "next/cache";
import { getSalesAdmin } from "@/lib/admin/auth";
import { logAdmin } from "@/lib/admin/audit";
import { db } from "@/lib/db/client";
import { ensureInternCode } from "@/lib/intern-codes";
import { INTERNSHIP_LIMITS, isInternStatus } from "@/lib/internship";

type Result = { ok: true; rep?: boolean; code?: string | null } | { ok: false; message: string };

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
  let code: string | null = null;
  if (status === "accepted") {
    const { error: repError } = await sql.run`
      insert into course.sales_reps (email, name, added_by) values (${app.email}, ${app.name.slice(0, 80)}, ${admin.email})
      on conflict (email) do update set active = true, removed_at = null, name = coalesce(course.sales_reps.name, excluded.name)
    `;
    rep = !repError;
    if (repError) console.error("intern to rep failed:", repError.code, repError.message);
    // Their personal link: klymb.ai/i/<code>.
    code = await ensureInternCode(sql, { email: app.email, name: app.name, by: admin.email });
  }
  await logAdmin(admin, "internship.status", id, { status, email: app.email, rep, code });
  revalidatePath("/admin/internship");
  revalidatePath("/admin/sales/team");
  return { ok: true, rep, code };
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

/** Records a payout to an intern for a month. Amount in rupees, as typed. */
export async function recordPayout(input: { email: string; month: string; rupees: string; method: string; reference: string }): Promise<Result> {
  const admin = await getSalesAdmin();
  if (!admin) return { ok: false, message: "Not authorised." };
  const rupees = Number(input.rupees);
  if (!Number.isFinite(rupees) || rupees <= 0 || rupees > 10_00_000) return { ok: false, message: "Enter the amount paid, in rupees." };
  if (!/^\d{4}-\d{2}$/.test(input.month)) return { ok: false, message: "Pick a month." };
  const method = ["upi", "bank", "other"].includes(input.method) ? input.method : "other";
  const sql = db();
  if (!sql) return { ok: false, message: "Unavailable right now." };
  const amount = Math.round(rupees * 100);
  const { error } = await sql.run`
    insert into course.intern_payouts (email, month, amount, method, reference, created_by)
    values (${input.email.toLowerCase()}, ${`${input.month}-01`}::date, ${amount}, ${method}, ${input.reference.trim().slice(0, 120) || null}, ${admin.email})
  `;
  if (error) return { ok: false, message: error.code === "42P01" ? "Run db/migrations/0045_intern_commissions.sql in Neon first." : "That could not be saved." };
  await logAdmin(admin, "internship.payout", input.email, { month: input.month, amount, method });
  revalidatePath("/admin/internship/commissions");
  return { ok: true };
}

/** Makes a personal link for someone already working as a sales rep. */
export async function makeInternLink(email: string, name: string): Promise<Result> {
  const admin = await getSalesAdmin();
  if (!admin) return { ok: false, message: "Not authorised." };
  const sql = db();
  if (!sql) return { ok: false, message: "Unavailable right now." };
  const code = await ensureInternCode(sql, { email: email.toLowerCase(), name, by: admin.email });
  if (!code) return { ok: false, message: "Couldn't make a link. Is migration 0045 run in Neon?" };
  await logAdmin(admin, "internship.code", email, { code });
  revalidatePath("/admin/internship/commissions");
  return { ok: true, code };
}
