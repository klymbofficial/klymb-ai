import { NextResponse } from "next/server";
import { cohort } from "@/data/config";
import { getTrack } from "@/data/tracks";
import { db } from "@/lib/db/client";
import { normaliseEmail } from "@/lib/email";
import { createOrder, razorpayKeys } from "@/lib/razorpay";
import { priceNow } from "@/lib/offer";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Creates a Razorpay order for a registered learner.
 *
 * The browser sends only who is paying. The amount comes from the track they
 * registered for, looked up here, so it cannot be edited on the way.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
  const email = normaliseEmail(body?.email);
  if (!email) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });

  const limit = await checkRateLimit("create_order", { limit: 10, windowMinutes: 60 });
  if (!limit.allowed) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

  const keys = razorpayKeys();
  const sql = db();
  if (!keys || !sql) return NextResponse.json({ error: "Payments are not available right now." }, { status: 500 });

  // A registration, or failing that a learner enrolled directly by an admin.
  let { data: reg } = await sql.row<{ name: string; phone: string; track: string }>`
    select name, phone, track from course.registrations
     where email = ${email} and cohort_start = ${cohort.startDate}
  `;
  if (!reg) {
    const { data: learner } = await sql.row<{ name: string; track: string }>`
      select name, track from course.learners
       where email = ${email} and cohort_start = ${cohort.startDate}
    `;
    if (learner) reg = { name: learner.name, phone: "", track: learner.track };
  }
  if (!reg) return NextResponse.json({ error: "We could not find a registration for this email. Register first, then pay." }, { status: 400 });

  const track = getTrack(reg.track);
  if (!track) return NextResponse.json({ error: "Unknown track." }, { status: 400 });

  const { data: paid } = await sql.rows<{ id: string }>`
    select id from course.payments
     where email = ${email} and cohort_start = ${cohort.startDate} and status = 'paid'
     limit 1
  `;
  if (paid?.length) return NextResponse.json({ error: "You have already paid for this cohort." }, { status: 409 });

  if (track.price === 0) return NextResponse.json({ error: "This track is free: no payment needed." }, { status: 400 });

  // The launch price is applied here, on the server, so the browser can't change it.
  const amount = priceNow(track.price) * 100;
  const order = await createOrder(keys, {
    amount,
    receipt: `klymb-${Date.now().toString(36)}`,
    notes: { email, track: track.slug, cohort: cohort.startDate },
  });
  if (!order.ok) {
    console.error("razorpay create order failed:", order.message);
    return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: order.status });
  }

  const { error } = await sql.run`
    insert into course.payments (email, track, cohort_start, amount, currency, razorpay_order_id)
    values (${email}, ${track.slug}, ${cohort.startDate}, ${order.amount}, ${order.currency}, ${order.id})
  `;
  if (error) {
    console.error("payments insert failed:", error.code, error.message);
    return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: 500 });
  }

  return NextResponse.json({
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    key_id: keys.keyId,
    track_name: track.name,
    prefill: { name: reg.name, email, ...(reg.phone ? { contact: reg.phone } : {}) },
  });
}
