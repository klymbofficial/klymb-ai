import { NextResponse } from "next/server";
import { site } from "@/data/config";
import { db } from "@/lib/db/client";
import { INTERNSHIP, internshipApplicationOf } from "@/lib/internship";
import { internshipApplicationEmail, MAIL_SUPPORT, sendMail } from "@/lib/mail";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * An application for the sales internship. Saved first; the "we got it" email
 * goes once per person, and a failed email never fails the application.
 * Applying again with the same email updates the answers, unless the team has
 * already decided on it.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  // A field only bots fill in. They get the same answer as everyone else.
  if (body && typeof body.website === "string" && body.website) return NextResponse.json({ ok: true });

  const parsed = internshipApplicationOf(body);
  if (!parsed.ok) return NextResponse.json({ error: `Add ${parsed.missing.join(", ")}.` }, { status: 400 });

  const limit = await checkRateLimit("internship-apply", { limit: 6, windowMinutes: 60 });
  if (!limit.allowed) return NextResponse.json({ error: "Too many tries from this network. Please try again in a while." }, { status: 429 });

  const sql = db();
  if (!sql) return NextResponse.json({ error: "We couldn't save that right now. Please try again in a minute." }, { status: 500 });

  const r = parsed.row;
  const { data: saved, error } = await sql.row<{ id: string; emailed: boolean }>`
    insert into course.internship_applications (batch, email, name, phone, city, role, org, linkedin, instagram, hours, sales_experience, why)
    values (${INTERNSHIP.batch}, ${r.email}, ${r.name}, ${r.phone}, ${r.city}, ${r.role}, ${r.org}, ${r.linkedin}, ${r.instagram}, ${r.hours}, ${r.sales_experience}, ${r.why})
    on conflict (batch, email) do update
      set name = excluded.name, phone = excluded.phone, city = excluded.city, role = excluded.role, org = excluded.org,
          linkedin = excluded.linkedin, instagram = excluded.instagram, hours = excluded.hours,
          sales_experience = excluded.sales_experience, why = excluded.why, updated_at = now()
      where course.internship_applications.status in ('applied', 'shortlisted')
    returning id, confirmation_sent_at is not null as emailed
  `;
  if (error) {
    console.error("internship application save failed:", error.code, error.message);
    return NextResponse.json({ error: "We couldn't save that right now. Please try again in a minute." }, { status: 500 });
  }
  // No row back: they applied before and the team has already decided. Nothing to change.
  if (!saved) return NextResponse.json({ ok: true, emailed: true });

  let emailed = saved.emailed;
  if (!emailed) {
    const mail = internshipApplicationEmail({ name: r.name.split(" ")[0] || "there", starts: INTERNSHIP.startsLabel, months: INTERNSHIP.months, pct: INTERNSHIP.commissionPct, siteUrl: site.url, supportEmail: MAIL_SUPPORT });
    const sent = await sendMail({ to: { email: r.email, name: r.name }, ...mail, kind: "internship.application", idempotencyKey: `internship:${INTERNSHIP.batch}:${r.email}` });
    emailed = sent.ok;
    if (sent.ok) await sql.run`update course.internship_applications set confirmation_sent_at = now() where id = ${saved.id}`;
    else if (!sent.skipped) console.error("internship application email failed:", sent.reason);
  }
  return NextResponse.json({ ok: true, emailed });
}
