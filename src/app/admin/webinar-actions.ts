"use server";

import { site } from "@/data/config";
import { getAdmin } from "@/lib/admin/auth";
import { logAdmin } from "@/lib/admin/audit";
import { db } from "@/lib/db/client";
import { MAIL_SUPPORT, mailReady, sendMail, webinarLiveEmail } from "@/lib/mail";
import { WEBINAR } from "@/lib/webinar";

export type MeetSendResult = { ok: true; sent: number; skipped: number; failed: number; already: number } | { ok: false; message: string };

const firstName = (name: string | null | undefined) => name?.trim().split(/\s+/)[0] || "there";

function mailFor(name: string | null | undefined) {
  return webinarLiveEmail({
    name: firstName(name), title: WEBINAR.title, date: WEBINAR.dateLabel, time: WEBINAR.timeLabel,
    meetUrl: WEBINAR.meetUrl, agenda: WEBINAR.agenda, siteUrl: site.url, supportEmail: MAIL_SUPPORT,
  });
}

/** Emails the Meet link to the signed-in owner only, to check how it looks. */
export async function sendMeetLinkTest(): Promise<MeetSendResult> {
  const admin = await getAdmin();
  if (!admin?.owner) return { ok: false, message: "Only owners can send this." };
  if (!mailReady()) return { ok: false, message: "Email isn't set up on this server." };
  const out = await sendMail({ to: { email: admin.email }, ...mailFor(admin.name), kind: "webinar.meet_link", idempotencyKey: `webinar-meet-test:${WEBINAR.slug}:${admin.email}:${Date.now()}` });
  await logAdmin(admin, "webinar.meet_link_test", WEBINAR.slug, { ok: out.ok });
  return out.ok ? { ok: true, sent: 1, skipped: 0, failed: 0, already: 0 } : { ok: false, message: `The test didn't go: ${out.reason}` };
}

/**
 * Emails the Meet link to everyone registered for this webinar. Who has been
 * sent it is kept in the admin audit log, written after every batch, so
 * pressing the button again (or after a timeout) only reaches the rest.
 */
export async function sendMeetLinkToAll(): Promise<MeetSendResult> {
  const admin = await getAdmin();
  if (!admin?.owner) return { ok: false, message: "Only owners can send this." };
  if (!mailReady()) return { ok: false, message: "Email isn't set up on this server." };
  const sql = db();
  if (!sql) return { ok: false, message: "Unavailable right now." };

  const { data: people, error } = await sql.rows<{ email: string; name: string }>`
    select email, name from course.webinar_registrations where webinar = ${WEBINAR.slug} order by created_at
  `;
  if (error || !people) return { ok: false, message: "Couldn't read the registrations." };

  const { data: done } = await sql.rows<{ email: string }>`
    select distinct jsonb_array_elements_text(details->'sent') as email
      from course.admin_audit_log
     where action = 'webinar.meet_link' and target = ${WEBINAR.slug}
  `;
  const already = new Set((done ?? []).map((d) => d.email));
  const todo = people.filter((p) => !already.has(p.email));

  let sent = 0, skipped = 0, failed = 0;
  for (let i = 0; i < todo.length; i += 10) {
    const batch = todo.slice(i, i + 10);
    const results = await Promise.all(batch.map(async (p) => {
      const out = await sendMail({ to: { email: p.email, name: p.name }, ...mailFor(p.name), kind: "webinar.meet_link", idempotencyKey: `webinar-meet:${WEBINAR.slug}:${p.email}` });
      return { email: p.email, out };
    }));
    const ok = results.filter((r) => r.out.ok).map((r) => r.email);
    const skip = results.filter((r) => !r.out.ok && r.out.skipped).map((r) => r.email);
    sent += ok.length; skipped += skip.length; failed += results.length - ok.length - skip.length;
    for (const r of results) if (!r.out.ok && !r.out.skipped) console.error("webinar meet link email failed:", r.out.reason);
    // Skipped addresses (bounced, unsubscribed) count as done: retrying won't change them.
    if (ok.length || skip.length) await logAdmin(admin, "webinar.meet_link", WEBINAR.slug, { sent: [...ok, ...skip] });
  }
  return { ok: true, sent, skipped, failed, already: people.length - todo.length };
}
