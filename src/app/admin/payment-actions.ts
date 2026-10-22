"use server";

import { getAdmin } from "@/lib/admin/auth";
import { logAdmin } from "@/lib/admin/audit";
import { db } from "@/lib/db/client";
import { razorpayKeys, refundPayment } from "@/lib/razorpay";

export type RefundResult = { ok: true } | { ok: false; message: string };

/**
 * Refunds a payment in full through Razorpay.
 *
 * The row is not marked here: Razorpay's refund.processed webhook does that,
 * so the admin table always reflects what Razorpay actually did.
 */
export async function refund(id: string, confirmEmail: string): Promise<RefundResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, message: "Not authorised." };

  const keys = razorpayKeys();
  const sql = db();
  if (!keys || !sql) return { ok: false, message: "Unavailable right now." };

  const { data: pay } = await sql.row<{ email: string; status: string; razorpay_payment_id: string | null }>`
    select email, status, razorpay_payment_id from course.payments where id = ${id}
  `;
  if (!pay?.razorpay_payment_id) return { ok: false, message: "That payment no longer exists." };
  if (pay.status !== "paid") return { ok: false, message: "This payment has already been refunded." };
  // Typed email must match, so a misclick cannot refund the wrong learner.
  if (pay.email.toLowerCase() !== confirmEmail.trim().toLowerCase()) {
    return { ok: false, message: "The email you typed does not match this payment. Nothing was refunded." };
  }

  const result = await refundPayment(keys, pay.razorpay_payment_id);
  if (!result.ok) console.error("refund failed:", pay.razorpay_payment_id, result.message);
  await logAdmin(admin, "payment.refund", pay.email, { payment_id: pay.razorpay_payment_id, ok: result.ok });
  return result;
}
