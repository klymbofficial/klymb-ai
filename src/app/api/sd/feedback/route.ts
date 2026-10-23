import { NextResponse } from "next/server";
import { currentEmail } from "@/auth";
import { normaliseEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { validAnon } from "@/lib/sd-events";
import { createServiceClient } from "@/lib/supabase/admin";

const pick = <T extends string>(v: unknown, ok: readonly T[]) => (ok.includes(v as T) ? (v as T) : null);

/** End-of-day feedback from the System Design course: a rating, three quick answers and an optional note. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const rating = Number(b?.rating);
  const lesson = typeof b?.lesson === "string" ? b.lesson.slice(0, 12) : "";
  if (!b || !validAnon(b.anon) || !lesson || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Pick a rating first." }, { status: 400 });
  }
  const limit = await checkRateLimit("sd-feedback", { limit: 10, windowMinutes: 60 });
  if (!limit.allowed) return NextResponse.json({ error: "Thanks, we already have your feedback." }, { status: 429 });

  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: "Couldn't save right now." }, { status: 500 });
  const { error } = await supabase.from("sd_feedback").insert({
    anon_id: b.anon,
    email: normaliseEmail(await currentEmail().catch(() => null)),
    lesson,
    rating,
    clarity: pick(b.clarity, ["yes", "mostly", "no"] as const),
    will_finish: pick(b.willFinish, ["yes", "maybe", "no"] as const),
    improve: typeof b.improve === "string" && b.improve.trim() ? b.improve.trim().slice(0, 2000) : null,
    lang: b.lang === "hi" ? "hi" : "en",
  });
  if (error) {
    console.error("sd feedback save failed:", error.message);
    return NextResponse.json({ error: "Couldn't save right now. Try again in a minute." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
