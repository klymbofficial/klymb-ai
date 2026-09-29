import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay Standard Checkout, server side.
 *
 * The key secret lives only in server env. The key id is public by design and
 * is handed to the browser with each order, so no NEXT_PUBLIC_ copy is needed.
 */
export function razorpayKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

export type OrderResult =
  | { ok: true; id: string; amount: number; currency: string }
  | { ok: false; status: 401 | 500; message: string };

/** POST /v1/orders. Amount is in paise. */
export async function createOrder(
  keys: { keyId: string; keySecret: string },
  { amount, receipt, notes }: { amount: number; receipt: string; notes?: Record<string, string> },
): Promise<OrderResult> {
  if (!Number.isInteger(amount) || amount < 100) return { ok: false, status: 500, message: "Amount below 100 paise" };

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify({ amount, currency: "INR", receipt, notes }),
    cache: "no-store",
  }).catch(() => null);

  if (!res) return { ok: false, status: 500, message: "Razorpay unreachable" };
  if (res.status === 401) return { ok: false, status: 401, message: "Razorpay rejected the API keys" };
  if (!res.ok) return { ok: false, status: 500, message: `Razorpay error ${res.status}` };

  const order = (await res.json()) as { id: string; amount: number; currency: string };
  return { ok: true, id: order.id, amount: order.amount, currency: order.currency };
}

/** HMAC-SHA256(order_id + "|" + payment_id, key_secret), compared in constant time. */
export function signatureValid(orderId: string, paymentId: string, signature: string, keySecret: string) {
  const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
