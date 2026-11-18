import { NextResponse } from "next/server";
import { site } from "@/data/config";
import { db } from "@/lib/db/client";
import { MAIL_SUPPORT, sendMail, webinarConfirmationEmail } from "@/lib/mail";
import { checkRateLimit } from "@/lib/rate-limit";
import { WEBINAR, googleCalendarLink, webinarOpen, webinarRegistrationOf } from "@/lib/webinar";

/**
 * A sign-up for the live webinar. Saved first; the confirmation email with
 * the WhatsApp group link goes once per person, and a failed email never
 * fails the sign-up: the page shows the group link too.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  // A field only bots fill in. They get the same answer as everyone else.
  if (body && typeof body.website === "string" && body.website) return NextResponse.json({ ok: true, group: WEBINAR.whatsappGroup, emailed: true });
  if (!webinarOpen()) return NextResponse.json({ error: "This webinar has ended, so registration is closed." }, { status: 410 });

  const parsed = webinarRegistrationOf(body);
  if (!parsed.ok) return NextResponse.json({ error: `Add ${parsed.missing.join(", ")}.` }, { status: 400 });

  const limit = await checkRateLimit("webinar-register", { limit: 8, windowMinutes: 60 });
  if (!limit.allowed) return NextResponse.json({ error: "Too many tries from this network. Please try again in a while." }, { status: 429 });

  const sql = db();
  if (!sql) return NextResponse.json({ error: "We couldn't save that right now. Please try again in a minute." }, { status: 500 });

  const r = parsed.row;
  const { data: saved, error } = await sql.row<{ id: number; emailed: boolean }>`
    insert into course.webinar_registrations (webinar, email, name, phone, role, org, question)
    values (${WEBINAR.slug}, ${r.email}, ${r.name}, ${r.phone}, ${r.role}, ${r.org}, ${r.question})
    on conflict (webinar, email) do update
      set name = excluded.name, phone = excluded.phone, role = excluded.role,
          org = coalesce(excluded.org, course.webinar_registrations.org),
          question = coalesce(excluded.question, course.webinar_registrations.question),
          updated_at = now()
    returning id, confirmation_sent_at is not null as emailed
  `;
  if (error || !saved) {
    console.error("webinar registration save failed:", error?.message);
    return NextResponse.json({ error: "We couldn't save that right now. Please try again in a minute." }, { status: 500 });
  }

  let emailed = saved.emailed;
  if (!emailed) {
    const mail = webinarConfirmationEmail({
      name: r.name.split(" ")[0] || "there",
      title: WEBINAR.title, date: WEBINAR.dateLabel, time: WEBINAR.timeLabel,
      groupUrl: WEBINAR.whatsappGroup, calendarUrl: googleCalendarLink(),
      siteUrl: site.url, supportEmail: MAIL_SUPPORT,
    });
    const sent = await sendMail({ to: { email: r.email, name: r.name }, ...mail, kind: "webinar.confirmation", idempotencyKey: `webinar:${WEBINAR.slug}:${r.email}` });
    emailed = sent.ok;
    if (sent.ok) await sql.run`update course.webinar_registrations set confirmation_sent_at = now() where id = ${saved.id}`;
    else if (!sent.skipped) console.error("webinar confirmation email failed:", sent.reason);
  }

  return NextResponse.json({ ok: true, group: WEBINAR.whatsappGroup, emailed });
}
