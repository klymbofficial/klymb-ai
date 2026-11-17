"use server";

import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/admin/auth";
import { logAdmin } from "@/lib/admin/audit";
import { db } from "@/lib/db/client";
import { couponOf, endOfDayIST } from "@/lib/sd-coupons";
import { SD_OFFER } from "@/lib/sd-offer";

export interface CouponInput { code: string; price: string; maxUses: string; endsOn: string; note: string }

type Result = { ok: true } | { ok: false; message: string };

const MIGRATION = "Run db/migrations/0039_sd_coupons.sql in Neon first.";

/** Makes a System Design coupon code. Owners only. */
export async function createCoupon(i: CouponInput): Promise<Result> {
  const admin = await getAdmin();
  if (!admin?.owner) return { ok: false, message: "Only owners can make coupon codes." };
  const code = couponOf(i.code);
  if (!code) return { ok: false, message: "The code needs 4 to 20 letters or digits, no spaces." };
  const price = Number(i.price);
  if (!Number.isInteger(price) || price < 1 || price >= SD_OFFER.full) return { ok: false, message: `The price must be a whole number of rupees, from 1 to ${SD_OFFER.full - 1}.` };
  const maxUses = i.maxUses.trim() ? Number(i.maxUses) : null;
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) return { ok: false, message: "Uses must be a whole number, or blank for no limit." };
  const endsAt = i.endsOn ? endOfDayIST(i.endsOn) : null;
  if (i.endsOn && !endsAt) return { ok: false, message: "Pick a valid last day, or leave it blank." };
  const note = i.note.trim().slice(0, 120) || null;
  const sql = db();
  if (!sql) return { ok: false, message: "Unavailable right now." };

  const { data, error } = await sql.row<{ code: string }>`
    insert into course.sd_coupons (code, price, max_uses, ends_at, note, created_by)
    values (${code}, ${price}, ${maxUses}, ${endsAt}, ${note}, ${admin.email})
    on conflict (code) do nothing
    returning code
  `;
  if (error) return { ok: false, message: error.code === "42P01" ? MIGRATION : "That could not be saved." };
  if (!data) return { ok: false, message: `${code} already exists. Pick another code.` };
  await logAdmin(admin, "coupon.create", code, { price, maxUses, endsAt });
  revalidatePath("/admin/coupons");
  return { ok: true };
}

/** Pauses a code so it stops working, or turns it back on. Payments already made keep it. Owners only. */
export async function setCouponPaused(code: string, paused: boolean): Promise<Result> {
  const admin = await getAdmin();
  if (!admin?.owner) return { ok: false, message: "Only owners can change coupon codes." };
  const clean = couponOf(code);
  const sql = db();
  if (!clean || !sql) return { ok: false, message: "Unknown code." };
  const { error } = paused
    ? await sql.run`update course.sd_coupons set paused_at = now() where code = ${clean} and paused_at is null`
    : await sql.run`update course.sd_coupons set paused_at = null where code = ${clean}`;
  if (error) return { ok: false, message: "That could not be saved." };
  await logAdmin(admin, paused ? "coupon.pause" : "coupon.resume", clean);
  revalidatePath("/admin/coupons");
  return { ok: true };
}

/**
 * Deletes a code for good: it stops working at checkout and leaves the list.
 * Payments already made keep the code and the price they paid (both are on
 * the payment), so nothing paid is touched. Owners only.
 */
export async function deleteCoupon(code: string): Promise<Result> {
  const admin = await getAdmin();
  if (!admin?.owner) return { ok: false, message: "Only owners can remove coupon codes." };
  const clean = couponOf(code);
  const sql = db();
  if (!clean || !sql) return { ok: false, message: "Unknown code." };
  const { data, error } = await sql.run`delete from course.sd_coupons where code = ${clean}`;
  if (error) return { ok: false, message: "That could not be removed." };
  if (!data) return { ok: false, message: `${clean} was already removed.` };
  await logAdmin(admin, "coupon.delete", clean);
  revalidatePath("/admin/coupons");
  return { ok: true };
}
