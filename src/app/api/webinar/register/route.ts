import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { createOrder, razorpayKeys } from "@/lib/razorpay";
import { checkRateLimit } from "@/lib/rate-limit";
import { WEBINAR, webinarOpen, webinarRegistrationOf } from "@/lib/webinar";
import { sendWebinarConfirmation } from "@/lib/webinar-seat";

const busy = "We couldn't save that right now. Please try again in a minute.";

/**
 * A sign-up for the live webinar. Saved first, so even someone who doesn't
 * finish paying is on the list as a lead.
 *
 * A free webinar confirms the seat here and sends the confirmation email.
 * A paid one hands back a Razorpay order instead: the seat is confirmed, and
 * the email sent, by /api/webinar/verify or Razorpay's webhook once it's paid.
 * The amount comes from the server, so it can't be edited on the way.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  // A field only bots fill in. They get the same answer as everyone else, and never an order.
  if (body && typeof body.website === "string" && body.website) return NextResponse.json({ ok: true, group: WEBINAR.whatsappGroup, emailed: true });
  if (!webinarOpen()) return NextResponse.json({ error: "This webinar has ended, so registration is closed." }, { status: 410 });

  const parsed = webinarRegistrationOf(body);
  if (!parsed.ok) return NextResponse.json({ error: `Add ${parsed.missing.join(", ")}.` }, { status: 400 });

  const limit = await checkRateLimit("webinar-register", { limit: 8, windowMinutes: 60 });
  if (!limit.allowed) return NextResponse.json({ error: "Too many tries from this network. Please try again in a while." }, { status: 429 });

  const sql = db();
  if (!sql) return NextResponse.json({ error: busy }, { status: 500 });

  const price = WEBINAR.price;
  // Stops before saving if a paid webinar can't take payment: a sign-up with no way to pay would hang.
  const keys = price ? razorpayKeys() : null;
  if (price && !keys) return NextResponse.json({ error: "Payments are not available right now. Please try again later." }, { status: 500 });

  const r = parsed.row;
  const { data: saved, error } = await sql.row<{ id: string; emailed: boolean; paid: boolean }>`
    insert into course.webinar_registrations (webinar, email, name, phone, role, org, question, amount, currency)
    values (${WEBINAR.slug}, ${r.email}, ${r.name}, ${r.phone}, ${r.role}, ${r.org}, ${r.question}, ${price?.amount ?? null}, ${price?.currency ?? null})
    on conflict (webinar, email) do update
      set name = excluded.name, phone = excluded.phone, role = excluded.role,
          org = coalesce(excluded.org, course.webinar_registrations.org),
          question = coalesce(excluded.question, course.webinar_registrations.question),
          updated_at = now()
    returning id, confirmation_sent_at is not null as emailed, paid_at is not null as paid
  `;
  if (error || !saved) {
    console.error("webinar registration save failed:", error?.message);
    return NextResponse.json({ error: busy }, { status: 500 });
  }

  // Free, or already paid for: the seat is theirs.
  if (!price || saved.paid) {
    const emailed = await sendWebinarConfirmation(sql, { id: saved.id, email: r.email, name: r.name, emailed: saved.emailed });
    return NextResponse.json({ ok: true, group: WEBINAR.whatsappGroup, emailed });
  }

  const order = await createOrder(keys!, {
    amount: price.amount,
    currency: price.currency,
    receipt: `klymb-webinar-${Date.now().toString(36)}`,
    notes: { kind: "webinar", webinar: WEBINAR.slug, email: r.email },
  });
  if (!order.ok) {
    console.error("razorpay webinar order failed:", order.message);
    return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: order.status });
  }

  // The latest order is the one their checkout pays. Never touches a seat that's already paid.
  const { error: orderError } = await sql.run`
    update course.webinar_registrations set razorpay_order_id = ${order.id}, updated_at = now()
     where id = ${saved.id} and paid_at is null
  `;
  if (orderError) {
    console.error("webinar order save failed:", orderError.message);
    return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    pay: { order_id: order.id, amount: order.amount, currency: order.currency, key_id: keys!.keyId, prefill: { name: r.name, email: r.email, contact: r.phone } },
  });
}
