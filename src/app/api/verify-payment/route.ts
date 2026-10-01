import { after, NextResponse } from "next/server";
import { razorpayKeys, signatureValid } from "@/lib/razorpay";
import { sendReceiptOnce } from "@/lib/receipt";
import { createServiceClient } from "@/lib/supabase/admin";

const field = (v: unknown) => (typeof v === "string" && v.length > 0 && v.length <= 200 ? v : null);

/** Marks an order paid, but only when Razorpay's checkout signature verifies. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const orderId = field(body?.razorpay_order_id);
  const paymentId = field(body?.razorpay_payment_id);
  const signature = field(body?.razorpay_signature);
  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "Missing payment details." }, { status: 400 });
  }

  const keys = razorpayKeys();
  const supabase = createServiceClient();
  if (!keys || !supabase) return NextResponse.json({ error: "Payments are not available right now." }, { status: 500 });

  if (!signatureValid(orderId, paymentId, signature, keys.keySecret)) {
    return NextResponse.json({ error: "Payment could not be verified." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("payments")
    .update({ status: "paid", razorpay_payment_id: paymentId, updated_at: new Date().toISOString() })
    .eq("razorpay_order_id", orderId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("payments update failed:", orderId, error?.code, error?.message);
    return NextResponse.json({ error: "Payment received but not recorded. Email us with your payment ID." }, { status: 500 });
  }

  // The thank-you email goes after the response, so the learner is not kept waiting on it.
  after(() => sendReceiptOnce(orderId));

  return NextResponse.json({ ok: true });
}
