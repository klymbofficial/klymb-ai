import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay webhooks, kept pure so they are unit-tested.
 *
 * The signature is HMAC-SHA256 of the raw request body with the webhook
 * secret (set in the Razorpay dashboard, separate from the API key secret).
 */
export function webhookSignatureValid(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type WebhookAction =
  /** `inr`: Razorpay's own INR paise for a payment in another currency, when it sent one. */
  | { kind: "paid"; orderId: string; paymentId: string; inr?: number }
  | { kind: "failed"; orderId: string; paymentId: string }
  | { kind: "refunded"; paymentId: string }
  | { kind: "ignore" };

interface Payload {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; currency?: string; base_amount?: number; base_currency?: string } };
    refund?: { entity?: { payment_id?: string } };
  };
}

/** What a webhook event means for our payments table. */
export function webhookAction(body: Payload): WebhookAction {
  const payment = body.payload?.payment?.entity;
  switch (body.event) {
    case "payment.captured":
    case "order.paid":
      if (!payment?.id || !payment.order_id) return { kind: "ignore" };
      return payment.currency && payment.currency !== "INR" && payment.base_currency === "INR" && Number.isInteger(payment.base_amount)
        ? { kind: "paid", orderId: payment.order_id, paymentId: payment.id, inr: payment.base_amount }
        : { kind: "paid", orderId: payment.order_id, paymentId: payment.id };
    case "payment.failed":
      return payment?.id && payment.order_id ? { kind: "failed", orderId: payment.order_id, paymentId: payment.id } : { kind: "ignore" };
    case "refund.processed": {
      const paymentId = body.payload?.refund?.entity?.payment_id ?? payment?.id;
      return paymentId ? { kind: "refunded", paymentId } : { kind: "ignore" };
    }
    default:
      return { kind: "ignore" };
  }
}
