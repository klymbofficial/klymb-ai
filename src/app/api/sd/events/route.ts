import { NextResponse } from "next/server";
import { currentEmail } from "@/auth";
import { normaliseEmail } from "@/lib/email";
import { cleanEvent, validAnon } from "@/lib/sd-events";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Activity from the System Design course: a small batch of events per call,
 * sent by the browser every few seconds and when the page is hidden. Unknown
 * events and odd values are dropped; a signed-in learner's email is attached here.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !validAnon(body.anon) || !Array.isArray(body.events)) return NextResponse.json({ ok: false }, { status: 400 });
  const events = body.events.slice(0, 40).map(cleanEvent).filter((e) => e !== null);
  if (!events.length) return NextResponse.json({ ok: true });

  const email = normaliseEmail(await currentEmail().catch(() => null));
  const lang = body.lang === "hi" || body.lang === "en" ? body.lang : null;
  const device = typeof body.device === "string" ? body.device.slice(0, 12) : null;
  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ ok: true });
  const { error } = await supabase.from("sd_events").insert(
    events.map((e) => ({ anon_id: body.anon, email, event: e.event, lesson: e.lesson, step: e.step, props: e.props, path: e.path, lang, device })),
  );
  if (error) console.error("sd events save failed:", error.message);
  return NextResponse.json({ ok: !error });
}
