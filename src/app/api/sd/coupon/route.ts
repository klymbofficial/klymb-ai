import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { checkRateLimit } from "@/lib/rate-limit";
import { couponOf, couponProblem, findCoupon } from "@/lib/sd-coupons";

/**
 * Checks a coupon code so the page can show its price before Google and
 * Razorpay. Nothing is saved: the order checks the code again and sets the
 * amount itself. Limited per network address, so codes can't be guessed.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { code?: unknown } | null;
  const code = couponOf(body?.code);
  if (!code) return NextResponse.json({ error: "That coupon code isn't valid. Check it, or leave it blank." }, { status: 400 });

  const limit = await checkRateLimit("sd_coupon", { limit: 20, windowMinutes: 60 });
  if (!limit.allowed) return NextResponse.json({ error: "Too many tries. Please try again later." }, { status: 429 });

  const sql = db();
  if (!sql) return NextResponse.json({ error: "Coupons aren't available right now." }, { status: 500 });
  const { data: coupon, error } = await findCoupon(sql, code);
  if (error) return NextResponse.json({ error: "Coupons aren't available right now." }, { status: 500 });
  const problem = couponProblem(coupon);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  return NextResponse.json({ code, price: coupon!.price });
}
