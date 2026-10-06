"use server";

import { getAdmin } from "@/lib/admin/auth";
import { razorpayKeys, refundPayment } from "@/lib/razorpay";
import { createServiceClient } from "@/lib/supabase/admin";

export type RefundResult = { ok: true } | { ok: false; message: string };

/**
 * Refunds a payment in full through Razorpay.
 *
 * The row is not marked here: Razorpay's refund.processed webhook does that,
 * so the admin table always reflects what Razorpay actually did.
 */
export async function refund(id: string, confirmEmail: string): Promise<RefundResult> {
  if (!(await getAdmin())) return { ok: false, message: "Not authorised." };

  const keys = razorpayKeys();
  const supabase = createServiceClient();
  if (!keys || !supabase) return { ok: false, message: "Unavailable right now." };

  const { data: pay } = await supabase.from("payments").select("email, status, razorpay_payment_id").eq("id", id).maybeSingle();
  if (!pay?.razorpay_payment_id) return { ok: false, message: "That payment no longer exists." };
  if (pay.status !== "paid") return { ok: false, message: "This payment has already been refunded." };
  // Typed email must match, so a misclick cannot refund the wrong learner.
  if (pay.email.toLowerCase() !== confirmEmail.trim().toLowerCase()) {
    return { ok: false, message: "The email you typed does not match this payment. Nothing was refunded." };
  }

  const result = await refundPayment(keys, pay.razorpay_payment_id);
  if (!result.ok) console.error("refund failed:", pay.razorpay_payment_id, result.message);
  return result;
}
