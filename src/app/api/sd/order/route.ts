import { NextResponse } from "next/server";
import { currentEmail } from "@/auth";
import { db } from "@/lib/db/client";
import { todayInIndia } from "@/lib/learn";
import { marketOf, visitorCountry } from "@/lib/local-price";
import { inrPaiseOf, minorUnits, priceIn } from "@/lib/pricing";
import { createOrder, razorpayKeys } from "@/lib/razorpay";
import { checkRateLimit } from "@/lib/rate-limit";
import { couponOf, couponProblem, findCoupon, withCoupon } from "@/lib/sd-coupons";
import { findInternCode } from "@/lib/intern-codes";
import { internCodeOf } from "@/lib/internship";
import { referrerOf } from "@/lib/referrals";
import { SD_COURSE, campaignOf, claimProblems, linkedInProblem, phoneOf, refOf, referralProblem, sdPriceFor, sdPriceNow, type SdRole } from "@/lib/sd-offer";
import { LIMITS, clamp } from "@/lib/validation";

/**
 * Creates the Razorpay order for a System Design seat.
 *
 * Who is paying comes from the Google session and the amount from the server,
 * so neither can be edited on the way. The page only calls this once they are
 * back from Google, which is where the email comes from. Their answers are saved first, keeping
 * any price they locked earlier: someone who claims during the offer keeps its
 * price even if they finish paying after it ends. A referral code is checked
 * here, so a bad one is refused while they can still fix it, not after paying.
 * So is a coupon code, which sets the price; the two can go together.
 * The INR price is then charged in the buyer's own currency (lib/pricing):
 * INR in India, $20 in the US, today's conversion everywhere else.
 */
export async function POST(req: Request) {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ error: "Please sign in with Google again." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { name?: unknown; dial?: unknown; phone?: unknown; linkedin?: unknown; role?: unknown; campaign?: unknown; ref?: unknown; coupon?: unknown; intern?: unknown; country?: unknown } | null;
  const name = clamp(body?.name, LIMITS.name);
  const dial = String(body?.dial ?? "91");
  const phone = String(body?.phone ?? "");
  const role = String(body?.role ?? "");
  const linkedin = clamp(body?.linkedin, LIMITS.linkedin + 1);
  const missing = claimProblems({ name, dial, phone, role });
  if (missing.length) return NextResponse.json({ error: `Add ${missing.join(", ")}.` }, { status: 400 });
  const badLink = linkedInProblem(linkedin);
  if (badLink) return NextResponse.json({ error: badLink }, { status: 400 });

  const limit = await checkRateLimit("sd_order", { limit: 10, windowMinutes: 60, identity: email });
  if (!limit.allowed) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

  const keys = razorpayKeys();
  const sql = db();
  if (!keys || !sql) return NextResponse.json({ error: "Payments are not available right now." }, { status: 500 });

  // Stops here if this can't be read: a payment with nowhere to record the seat would take money for nothing.
  const { data: seat, error: seatError } = await sql.row<{ id: string }>`
    select id from course.enrollments where email = ${email} and course = ${SD_COURSE} and status = 'active'
  `;
  if (seatError) return NextResponse.json({ error: "Payments are not available right now." }, { status: 500 });
  if (seat) return NextResponse.json({ error: "You already have this course.", enrolled: true }, { status: 409 });

  const now = new Date();
  // Checked above, so never null here: +<country code><number>, as Razorpay and WhatsApp want it.
  const contact = phoneOf(dial, phone)!;

  let referrerEmail: string | null = null;
  const typedRef = clamp(body?.ref, 20);
  if (typedRef) {
    const code = refOf(typedRef);
    const { data: referrer, error: refError } = code ? await referrerOf(sql, code) : { data: null, error: null };
    if (refError) return NextResponse.json({ error: "Payments are not available right now." }, { status: 500 });
    const refused = referralProblem(referrer, { email, phone: contact });
    if (refused) return NextResponse.json({ error: refused }, { status: 400 });
    referrerEmail = referrer!.email;
  }

  // The order stores the code in its own column only when one is used, so orders keep working before the coupon migration runs.
  let couponCode: string | null = null;
  let couponPrice: { price: number } | null = null;
  const typedCoupon = clamp(body?.coupon, 30);
  if (typedCoupon) {
    const code = couponOf(typedCoupon);
    const { data: coupon, error: couponError } = code ? await findCoupon(sql, code) : { data: null, error: null };
    if (couponError) return NextResponse.json({ error: "Coupons aren't available right now. Leave the code blank, or try again later." }, { status: 500 });
    const refused = couponProblem(coupon, now);
    if (refused) return NextResponse.json({ error: refused }, { status: 400 });
    couponCode = coupon!.code;
    couponPrice = coupon;
  }

  const { data: lead, error: leadError } = await sql.row<{ locked_price: number }>`
    insert into course.sd_preregistrations (email, name, phone, linkedin, status, locked_price, consent)
    values (${email}, ${name}, ${contact}, ${linkedin || null}, ${role as SdRole}, ${sdPriceNow(now)}, false)
    on conflict (email) do update
      set name = excluded.name, phone = excluded.phone, status = excluded.status,
          linkedin = coalesce(excluded.linkedin, sd_preregistrations.linkedin), updated_at = now()
    returning locked_price
  `;
  if (leadError) {
    console.error("sd_preregistrations save failed:", leadError.code, leadError.message);
    return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: 500 });
  }

  // The intern whose link they came through, if it's a live code and not their own. Never blocks the purchase.
  const internTyped = internCodeOf(body?.intern);
  const internHit = internTyped ? await findInternCode(sql, internTyped).catch(() => null) : null;
  const internCode = internHit?.data && internHit.data.email !== email ? internHit.data.code : null;

  // Where they pay from. `country` from the form only counts on a local machine, for trying other currencies.
  const market = await marketOf(await visitorCountry(body?.country));
  const order = await createOrder(keys, {
    amount: minorUnits(priceIn(market, withCoupon(sdPriceFor(lead?.locked_price, now), couponPrice)), market.currency),
    currency: market.currency,
    receipt: `klymb-sd-${Date.now().toString(36)}`,
    notes: { email, course: SD_COURSE, ...(market.country ? { country: market.country } : {}), ...(couponCode ? { coupon: couponCode } : {}), ...(internCode ? { intern: internCode } : {}) },
  });
  if (!order.ok) {
    console.error("razorpay create order failed:", order.message);
    return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: order.status });
  }

  const { error } = couponCode
    ? await sql.run`
        insert into course.payments (email, track, cohort_start, amount, currency, razorpay_order_id, campaign, referrer_email, coupon_code)
        values (${email}, ${SD_COURSE}, ${todayInIndia()}, ${order.amount}, ${order.currency}, ${order.id}, ${campaignOf(body?.campaign)}, ${referrerEmail}, ${couponCode})
      `
    : await sql.run`
        insert into course.payments (email, track, cohort_start, amount, currency, razorpay_order_id, campaign, referrer_email)
        values (${email}, ${SD_COURSE}, ${todayInIndia()}, ${order.amount}, ${order.currency}, ${order.id}, ${campaignOf(body?.campaign)}, ${referrerEmail})
      `;
  if (error) {
    console.error("payments insert failed:", error.code, error.message);
    return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: 500 });
  }
  // Its worth in rupees, and where they claimed from: their own statements, so a database without 0048 still takes the payment.
  const rate = order.currency === "INR" ? null : market.rate;
  const worth = await sql.run`
    update course.payments set amount_inr = ${inrPaiseOf(order.amount, order.currency, rate)}, fx_rate = ${rate}
     where razorpay_order_id = ${order.id}
  `;
  if (worth.error) console.error("payment INR value failed:", worth.error.code, worth.error.message);
  if (market.country) {
    const from = await sql.run`update course.sd_preregistrations set country = ${market.country} where email = ${email}`;
    if (from.error) console.error("claim country failed:", from.error.code, from.error.message);
  }
  if (internCode) {
    const credit = await sql.run`update course.payments set intern_code = ${internCode} where razorpay_order_id = ${order.id}`;
    if (credit.error) console.error("intern credit failed:", credit.error.code, credit.error.message);
  }

  return NextResponse.json({
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    key_id: keys.keyId,
    prefill: { name, email, contact },
  });
}
