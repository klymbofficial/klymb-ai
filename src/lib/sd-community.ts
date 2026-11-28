import "server-only";
import { db, type Db } from "@/lib/db/client";
import { site } from "@/data/config";
import { MAIL_SUPPORT, sdWhatsAppGroupEmail, sendMail } from "@/lib/mail";
import { SD_COURSE } from "@/lib/sd-offer";

/**
 * The System Design learners' WhatsApp group. Server-only: it reaches the
 * browser only as a prop, and only for someone who paid, so the link never
 * sits in the public bundle.
 */
export const SD_WHATSAPP_GROUP = "https://chat.whatsapp.com/Lrn0gmHNjOXDMXkAXBtjdw?mode=gi_t";

/**
 * A paid seat: active, opened by a payment that is still paid. Granted seats
 * and company-assigned learners have course access but are not in the group.
 * Fails closed: an error never hands out the link.
 */
export async function hasPaidSeat(email: string) {
  const sql = db();
  if (!sql) return false;
  const { data, error } = await sql.rows<{ id: string }>`
    select e.id
      from course.enrollments e
      join course.payments p on p.id = e.payment_id
     where e.email = ${email} and e.course = ${SD_COURSE} and e.status = 'active'
       and e.source = 'payment' and p.status = 'paid'
     limit 1
  `;
  return !error && !!data?.length;
}

/**
 * Every active System Design seat that has not had the WhatsApp group email:
 * paid, granted by hand or company, whoever holds a seat today.
 */
export function learnersAwaitingGroupEmail(sql: Db) {
  return sql.rows<{ email: string; name: string | null }>`
    select e.email, coalesce(r.name, p.name) as name
      from course.enrollments e
      left join course.sd_preregistrations r on r.email = e.email
      left join course.profiles p on p.email = e.email
     where e.course = ${SD_COURSE} and e.status = 'active' and e.whatsapp_mailed_at is null
     order by e.created_at
  `;
}

/**
 * Sends one learner the WhatsApp group email, at most once. The seat is
 * claimed by setting whatsapp_mailed_at from null in one UPDATE, so the
 * payment hook and the admin button can never both send. A failed send
 * releases the claim so a later press can try again; a suppressed address
 * (hard bounce, unsubscribed) keeps it, since a retry won't change that.
 */
export async function sendGroupEmailOnce(sql: Db, email: string, name: string | null): Promise<"sent" | "failed" | "skipped"> {
  const { data: claimed } = await sql.row<{ id: string }>`
    update course.enrollments set whatsapp_mailed_at = now()
     where email = ${email} and course = ${SD_COURSE} and status = 'active' and whatsapp_mailed_at is null
    returning id
  `;
  if (!claimed) return "skipped";
  const mail = sdWhatsAppGroupEmail({ name: name?.trim().split(/\s+/)[0] || "there", groupUrl: SD_WHATSAPP_GROUP, siteUrl: site.url, supportEmail: MAIL_SUPPORT });
  const out = await sendMail({ to: { email, name: name ?? undefined }, ...mail, kind: "sd.whatsapp_group", idempotencyKey: `${email}:sd-whatsapp-group` });
  if (out.ok || out.skipped) return out.ok ? "sent" : "skipped";
  await sql.run`update course.enrollments set whatsapp_mailed_at = null where id = ${claimed.id}`;
  return "failed";
}

/** For the admin panel: who is still waiting for the email, their devices, and the last send. */
export async function announcementStatus() {
  const sql = db();
  if (!sql) return null;
  const [{ data: learners, error }, { data: devices }, { data: sent }] = await Promise.all([
    learnersAwaitingGroupEmail(sql),
    sql.rows<{ n: number }>`
      select count(*)::int as n
        from course.sd_push_subscriptions d
       where d.email in (
         select e.email from course.enrollments e
          where e.course = ${SD_COURSE} and e.status = 'active' and e.whatsapp_mailed_at is null
       )
    `,
    sql.rows<{ at: string }>`
      select at from course.admin_audit_log
       where action = 'sd.whatsapp_announce' and target is null order by at desc limit 1
    `,
  ]);
  if (error) return null;
  return { learners: new Set((learners ?? []).map((l) => l.email)).size, devices: devices?.[0]?.n ?? 0, lastSentAt: sent?.[0]?.at ?? null };
}
