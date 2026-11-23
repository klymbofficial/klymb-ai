import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { razorpayKeys, signatureValid } from "@/lib/razorpay";
import { WEBINAR } from "@/lib/webinar";
import { confirmWebinarSeat, sendWebinarConfirmation } from "@/lib/webinar-seat";

const field = (v: unknown) => (typeof v === "string" && v.length > 0 && v.length <= 200 ? v : null);

/** Confirms a paid webinar seat, but only when Razorpay's checkout signature verifies. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const orderId = field(body?.razorpay_order_id);
  const paymentId = field(body?.razorpay_payment_id);
  const signature = field(body?.razorpay_signature);
  if (!orderId || !paymentId || !signature) return NextResponse.json({ error: "Missing payment details." }, { status: 400 });

  const keys = razorpayKeys();
  const sql = db();
  if (!keys || !sql) return NextResponse.json({ error: "Payments are not available right now." }, { status: 500 });
  if (!signatureValid(orderId, paymentId, signature, keys.keySecret)) return NextResponse.json({ error: "Payment could not be verified." }, { status: 400 });

  const { error, seat } = await confirmWebinarSeat(sql, orderId, paymentId);
  if (error || !seat) {
    console.error("webinar seat confirm failed:", orderId, error?.message);
    return NextResponse.json({ error: `Payment received but your seat wasn't saved. Email us with payment ID ${paymentId}.` }, { status: 500 });
  }

  const emailed = await sendWebinarConfirmation(sql, seat);
  return NextResponse.json({ ok: true, group: WEBINAR.whatsappGroup, emailed });
}
