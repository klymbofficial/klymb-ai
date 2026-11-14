import "server-only";
import { db, type Db } from "@/lib/db/client";
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

/** Everyone with a paid seat, for the one-off announcement. */
export function paidLearners(sql: Db) {
  return sql.rows<{ email: string; name: string | null }>`
    select e.email, l.name
      from course.enrollments e
      join course.payments p on p.id = e.payment_id
      left join course.sd_preregistrations l on l.email = e.email
     where e.course = ${SD_COURSE} and e.status = 'active' and e.source = 'payment' and p.status = 'paid'
     order by e.created_at
  `;
}

/** For the admin panel: who the announcement reaches, and whether it already went out. */
export async function announcementStatus() {
  const sql = db();
  if (!sql) return null;
  const [{ data: learners, error }, { data: devices }, { data: sent }] = await Promise.all([
    paidLearners(sql),
    sql.rows<{ n: number }>`
      select count(*)::int as n
        from course.sd_push_subscriptions d
       where d.email in (
         select e.email from course.enrollments e join course.payments p on p.id = e.payment_id
          where e.course = ${SD_COURSE} and e.status = 'active' and e.source = 'payment' and p.status = 'paid'
       )
    `,
    sql.rows<{ at: string; details: Record<string, number> }>`
      select at, details from course.admin_audit_log
       where action = 'sd.whatsapp_announce' order by at desc limit 1
    `,
  ]);
  if (error) return null;
  return { learners: new Set((learners ?? []).map((l) => l.email)).size, devices: devices?.[0]?.n ?? 0, sent: sent?.[0] ?? null };
}
