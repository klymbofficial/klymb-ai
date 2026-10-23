import { NextResponse } from "next/server";
import { currentEmail } from "@/auth";
import { normaliseEmail } from "@/lib/email";
import { db } from "@/lib/db/client";
import { checkRateLimit } from "@/lib/rate-limit";
import { validAnon } from "@/lib/sd-events";

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

  const sql = db();
  if (!sql) return NextResponse.json({ error: "Couldn't save right now." }, { status: 500 });
  const { error } = await sql.run`
    insert into course.sd_feedback (anon_id, email, lesson, rating, clarity, will_finish, improve, lang)
    values (
      ${b.anon},
      ${normaliseEmail(await currentEmail().catch(() => null))},
      ${lesson},
      ${rating},
      ${pick(b.clarity, ["yes", "mostly", "no"] as const)},
      ${pick(b.willFinish, ["yes", "maybe", "no"] as const)},
      ${typeof b.improve === "string" && b.improve.trim() ? b.improve.trim().slice(0, 2000) : null},
      ${b.lang === "hi" ? "hi" : "en"}
    )
  `;
  if (error) {
    console.error("sd feedback save failed:", error.message);
    return NextResponse.json({ error: "Couldn't save right now. Try again in a minute." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
