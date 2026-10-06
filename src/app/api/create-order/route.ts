import { NextResponse } from "next/server";
import { cohort } from "@/data/config";
import { getTrack } from "@/data/tracks";
import { normaliseEmail } from "@/lib/email";
import { createOrder, razorpayKeys } from "@/lib/razorpay";
import { checkRateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/admin";

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
  const supabase = createServiceClient();
  if (!keys || !supabase) return NextResponse.json({ error: "Payments are not available right now." }, { status: 500 });

  // A registration, or failing that a learner enrolled directly by an admin.
  let { data: reg } = await supabase
    .from("registrations")
    .select("name, phone, track")
    .eq("email", email)
    .eq("cohort_start", cohort.startDate)
    .maybeSingle();
  if (!reg) {
    const { data: learner } = await supabase
      .from("learners")
      .select("name, track")
      .eq("email", email)
      .eq("cohort_start", cohort.startDate)
      .maybeSingle();
    if (learner) reg = { name: learner.name, phone: "", track: learner.track };
  }
  if (!reg) return NextResponse.json({ error: "We could not find a registration for this email. Register first, then pay." }, { status: 400 });

  const track = getTrack(reg.track);
  if (!track) return NextResponse.json({ error: "Unknown track." }, { status: 400 });

  const { data: paid } = await supabase
    .from("payments")
    .select("id")
    .eq("email", email)
    .eq("cohort_start", cohort.startDate)
    .eq("status", "paid")
    .limit(1);
  if (paid?.length) return NextResponse.json({ error: "You have already paid for this cohort." }, { status: 409 });

  // TEMPORARY: a ₹1 live test for the owner's account only. Remove after the test.
  const amount = email === "sarthakgupta.ksj@gmail.com" ? 100 : track.price * 100;
  const order = await createOrder(keys, {
    amount,
    receipt: `klymb-${Date.now().toString(36)}`,
    notes: { email, track: track.slug, cohort: cohort.startDate },
  });
  if (!order.ok) {
    console.error("razorpay create order failed:", order.message);
    return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: order.status });
  }

  const { error } = await supabase.from("payments").insert({
    email,
    track: track.slug,
    cohort_start: cohort.startDate,
    amount: order.amount,
    currency: order.currency,
    razorpay_order_id: order.id,
  });
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
