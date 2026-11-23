import "server-only";
import { site } from "@/data/config";
import { type Db } from "@/lib/db/client";
import { MAIL_SUPPORT, sendMail, webinarConfirmationEmail } from "@/lib/mail";
import { WEBINAR, googleCalendarLink } from "@/lib/webinar";

/**
 * Sends the "you're registered" email once per sign-up, and says whether it
 * has gone. A failed email never fails the sign-up: the page shows the
 * WhatsApp group link too.
 */
export async function sendWebinarConfirmation(sql: Db, row: { id: string | number; email: string; name: string; emailed: boolean }) {
  if (row.emailed) return true;
  const mail = webinarConfirmationEmail({
    name: row.name.split(" ")[0] || "there",
    title: WEBINAR.title, date: WEBINAR.dateLabel, time: WEBINAR.timeLabel,
    paid: WEBINAR.price?.label ?? null,
    groupUrl: WEBINAR.whatsappGroup, calendarUrl: googleCalendarLink(),
    siteUrl: site.url, supportEmail: MAIL_SUPPORT,
  });
  const sent = await sendMail({ to: { email: row.email, name: row.name }, ...mail, kind: "webinar.confirmation", idempotencyKey: `webinar:${WEBINAR.slug}:${row.email}` });
  if (sent.ok) await sql.run`update course.webinar_registrations set confirmation_sent_at = now() where id = ${row.id}`;
  else if (!sent.skipped) console.error("webinar confirmation email failed:", sent.reason);
  return sent.ok;
}

/**
 * Confirms the seat a webinar order paid for, then sends the confirmation.
 *
 * The checkout's verify call and Razorpay's webhook both land here, in either
 * order and sometimes twice, so marking it paid is one statement and safe to
 * repeat. No row comes back for an order that isn't a webinar ticket.
 */
export async function confirmWebinarSeat(sql: Db, orderId: string, paymentId: string) {
  const { data: row, error } = await sql.row<{ id: string; email: string; name: string; emailed: boolean }>`
    update course.webinar_registrations
       set paid_at = coalesce(paid_at, now()), razorpay_payment_id = ${paymentId}, updated_at = now()
     where razorpay_order_id = ${orderId}
    returning id, email, name, confirmation_sent_at is not null as emailed
  `;
  if (error || !row) return { error, seat: null };
  return { error: null, seat: row };
}
