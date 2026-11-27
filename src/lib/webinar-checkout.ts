import { loadCheckout, type RazorpaySuccess } from "@/lib/razorpay-checkout";
import { WEBINAR } from "@/lib/webinar";
import { adsWebinarPurchase } from "@/lib/google-ads";
import { metaTrack } from "@/lib/meta-pixel";
import { trackEvent } from "@/lib/analytics";

/** What /api/webinar/register hands back for a paid webinar. */
export interface WebinarOrder {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  prefill: { name: string; email: string; contact: string };
}

export type SeatResult = { ok: true; group: string; emailed: boolean } | { ok: false; error: string };

/**
 * Opens Razorpay for a webinar seat and, once paid, has the server check the
 * signature and confirm the seat. Resolves when the person pays, closes the
 * checkout, or the payment fails.
 */
export async function payForSeat(order: WebinarOrder): Promise<SeatResult> {
  if (!(await loadCheckout()) || !window.Razorpay) {
    trackEvent("webinar_checkout_fail", { reason: "script", webinar: WEBINAR.slug }, { reason: "script" });
    return { ok: false, error: "The payment window didn't load. Check your connection and try again." };
  }
  const money = { value: order.amount / 100, currency: order.currency, webinar: WEBINAR.slug };
  trackEvent("webinar_checkout_open", money, { currency: order.currency });
  return new Promise((resolve) => {
    // A failed attempt leaves Razorpay open to try another card, so it's only reported if they then close it.
    let failed = "";
    const rzp = new window.Razorpay!({
      key: order.key_id,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name: "Klymb.ai",
      description: `Live webinar: ${WEBINAR.title}`,
      prefill: order.prefill,
      theme: { color: "#83050B" },
      handler: async (r: RazorpaySuccess) => {
        const res = await fetch("/api/webinar/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(r) }).catch(() => null);
        const out = await res?.json().catch(() => null);
        if (res?.ok && out?.ok) adsWebinarPurchase({ paymentId: r.razorpay_payment_id, amount: order.amount, currency: order.currency });
        if (res?.ok && out?.ok) metaTrack("Purchase", { value: order.amount / 100, currency: order.currency, content_name: "System Design webinar" });
        // GA4's own purchase event too, so revenue reports and the funnel count it; the payment ID stops a double count.
        if (res?.ok && out?.ok) trackEvent("purchase", { ...money, transaction_id: r.razorpay_payment_id, item_name: "System Design webinar seat" }, { item: "webinar seat", currency: order.currency });
        if (res?.ok && out?.ok) trackEvent("webinar_paid", money, { currency: order.currency });
        if (!(res?.ok && out?.ok)) trackEvent("webinar_checkout_fail", { reason: "verify", webinar: WEBINAR.slug }, { reason: "verify" });
        resolve(res?.ok && out?.ok
          ? { ok: true, group: out.group ?? WEBINAR.whatsappGroup, emailed: out.emailed === true }
          : { ok: false, error: out?.error ?? `We couldn't confirm the payment. Email us with payment ID ${r.razorpay_payment_id}.` });
      },
      modal: {
        ondismiss: () => {
          trackEvent("webinar_checkout_fail", { reason: failed ? "card_failed" : "closed", webinar: WEBINAR.slug }, { reason: failed ? "card_failed" : "closed" });
          resolve({ ok: false, error: failed || "Payment cancelled. Your seat isn't saved until you pay; try again any time." });
        },
      },
    });
    rzp.on("payment.failed", (r) => { failed = r.error?.description ?? "The payment failed. No money was taken; please try again."; });
    rzp.open();
  });
}
