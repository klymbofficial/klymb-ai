import { NextResponse } from "next/server";
import { currentEmail } from "@/auth";
import { normaliseEmail } from "@/lib/email";
import { db } from "@/lib/db/client";
import { cleanEvent, validAnon } from "@/lib/sd-events";

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
  const sql = db();
  if (!sql) return NextResponse.json({ ok: true });
  // The whole batch in one statement: the rows go over as JSON and Postgres
  // expands them, rather than one round trip per event.
  const { error } = await sql.run`
    insert into course.sd_events (anon_id, email, event, lesson, step, props, path, lang, device)
    select ${body.anon}, ${email}, e.event, e.lesson, e.step, e.props, e.path, ${lang}, ${device}
      from jsonb_to_recordset(${JSON.stringify(events)}::jsonb)
        as e(event text, lesson text, step text, props jsonb, path text)
  `;
  if (error) console.error("sd events save failed:", error.message);
  return NextResponse.json({ ok: !error });
}
