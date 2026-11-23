import { isCronRequest } from "@/lib/cron-auth";
import { NextResponse } from "next/server";
import { site } from "@/data/config";
import { db } from "@/lib/db/client";
import { normaliseEmail } from "@/lib/email";
import { MAIL_SUPPORT, mailReady, sdReminderEmail, sendMail } from "@/lib/mail";
import { SD_COURSE } from "@/lib/sd-offer";
import { canTake, midnightOf, paceOf } from "@/lib/sd-pace";
import { IST, dayIn, hourIn, timeZoneOf } from "@/lib/timezone";
import { SD_FINAL_ASSESSMENT, pickSdReminder, unsubscribeToken, type ReminderPick } from "@/lib/sd-reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Sends in parallel, this many at a time. */
const CONCURRENCY = 8;
/** Before 18:00 on their own clock "you haven't done today's lesson" isn't true yet. */
const EARLIEST_HOUR = 18;

/**
 * Hourly (.github/workflows/sd-reminders.yml), with the daily Vercel cron in
 * vercel.json at about 20:00 IST as a backup for learners on India time. Each
 * learner is mailed once in their own evening, from 18:00 to midnight.
 * Mails each System Design learner who passed no lesson check today: the next
 * lesson that is out, or the final assessment once every lesson is passed.
 * Who is due and how often is decided in lib/sd-reminders.
 *
 * Each reminder is claimed before it is sent (enrollments.reminded_on), so a
 * re-run never mails anyone twice in a day, and released if the send fails.
 * Requires CRON_SECRET as a bearer token.
 */
export async function GET(req: Request) {
  if (!isCronRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = db();
  const secret = process.env.AUTH_SECRET;
  if (!sql || !secret) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  if (!mailReady()) return NextResponse.json({ sent: 0, skipped: "email not configured" });

  const now = Date.now();
  // For testing on a local machine only: ?force=1 skips the hour, and
  // ?only=<email> sends to that one learner, so a real run mails nobody else.
  const local = process.env.NODE_ENV !== "production";
  const params = new URL(req.url).searchParams;
  const force = local && params.get("force") === "1";
  const only = local ? normaliseEmail(params.get("only")) : null;

  const { data: rows, error } = await sql.rows<{
    id: string; email: string; name: string | null; enrolled_at: string; reminded_on: string | null; reminder_streak: number; refundable: boolean;
  }>`
    select e.id, e.email, p.name, e.created_at as enrolled_at,
           to_char(e.reminded_on, 'YYYY-MM-DD') as reminded_on,
           e.reminder_streak,
           (e.source = 'payment' and pay.status = 'paid') as refundable
      from course.enrollments e
      left join course.sd_preregistrations p on p.email = e.email
      left join course.payments pay on pay.id = e.payment_id
     where e.course = ${SD_COURSE} and e.status = 'active'
       and e.finished_at is null and e.reminders_off_at is null
       and (${only}::text is null or e.email = ${only})
  `;
  // 42703: the columns aren't there, so 0022_sd_mail.sql hasn't run here.
  if (error) return NextResponse.json({ error: error.code === "42703" ? "Run npm run db:migrate (0022_sd_mail.sql)." : error.message }, { status: 500 });
  // Their time zones, read on their own so a database without 0048 still mails everyone on India time.
  const { data: zones } = rows?.length
    ? await sql.rows<{ id: string; timezone: string }>`select id, timezone from course.enrollments where id = any(${rows.map((r) => r.id)}::uuid[])`
    : { data: [] };
  const zoneOf = new Map((zones ?? []).map((z) => [z.id, timeZoneOf(z.timezone) ?? IST]));
  // Only those in their own evening who haven't had today's mail.
  const learners = (rows ?? [])
    .map((r) => ({ ...r, timeZone: zoneOf.get(r.id) ?? IST }))
    .map((r) => ({ ...r, today: dayIn(now, r.timeZone) }))
    .filter((r) => (force || hourIn(now, r.timeZone) >= EARLIEST_HOUR) && (!r.reminded_on || r.reminded_on < r.today));
  if (!learners.length) return NextResponse.json({ checked: 0, sent: 0 });

  const { data: checks, error: checksError } = await sql.rows<{ email: string; lesson: string; passed_at: string }>`
    select email, lesson, passed_at
      from course.lesson_checks
     where course = ${SD_COURSE} and passed_at is not null
       and email = any(${learners.map((l) => l.email)}::text[])
  `;
  if (checksError) return NextResponse.json({ error: checksError.message }, { status: 500 });
  const { data: finals, error: finalsError } = await sql.rows<{ email: string; attempt: number; score: number; at: string }>`
    select email, attempt, score, taken_at as at
      from course.final_attempts
     where course = ${SD_COURSE} and email = any(${learners.map((l) => l.email)}::text[])
  `;
  if (finalsError) return NextResponse.json({ error: finalsError.message }, { status: 500 });
  const checksOf = new Map<string, { lesson: string; passed_at: string }[]>();
  for (const c of checks ?? []) checksOf.set(c.email, [...(checksOf.get(c.email) ?? []), c]);

  const due: { learner: (typeof learners)[number]; pick: ReminderPick; refund: boolean; midnight: string }[] = [];
  for (const l of learners) {
    const { today, timeZone } = l;
    const mine = checksOf.get(l.email) ?? [];
    const passed = new Map(mine.map((c) => [c.lesson, dayIn(c.passed_at, timeZone)]));
    const tries = (finals ?? []).filter((f) => f.email === l.email);
    const pace = paceOf({ passes: mine.map((c) => ({ lesson: c.lesson, at: new Date(c.passed_at).toISOString() })), finals: tries, refundable: l.refundable, timeZone }, now);
    if (pace.state === "finished") passed.set(SD_FINAL_ASSESSMENT, today);
    const pick = pickSdReminder({ enrolledOn: dayIn(l.enrolled_at, timeZone), passes: passed, remindedOn: l.reminded_on, streak: l.reminder_streak }, today);
    // One day at a time: a lesson that isn't open to them yet is nothing to be reminded of.
    if (!pick || (pick.target.kind === "lesson" ? !canTake(pace, pick.target.lesson.id) : !pace.finalOpen)) continue;
    due.push({ learner: l, pick, refund: pace.refund === "on-track" && pace.refundable, midnight: midnightOf(pace) });
  }

  let sent = 0, failed = 0, suppressed = 0;
  const send = async ({ learner: l, pick, refund, midnight }: (typeof due)[number]) => {
    const { today } = l;
    const { data: claimed } = await sql.row<{ id: string }>`
      update course.enrollments set reminded_on = ${today}::date, reminder_streak = ${pick.streak}
       where id = ${l.id} and (reminded_on is null or reminded_on < ${today}::date)
      returning id
    `;
    if (!claimed) return;

    const lesson = pick.target.kind === "lesson" ? pick.target.lesson : null;
    const unsubscribeUrl = `${site.url}/api/sd/unsubscribe?t=${unsubscribeToken(l.email, secret)}`;
    const mail = sdReminderEmail({
      name: String(l.name ?? "").split(" ")[0] || "there",
      target: lesson ? { kind: "lesson", title: lesson.title, minutes: lesson.minutes, position: lesson.position } : { kind: "assessment" },
      refund,
      midnight,
      url: `${site.url}/learn/system-design${lesson ? `?lesson=${lesson.id}` : ""}`,
      unsubscribeUrl,
      siteUrl: site.url,
      supportEmail: MAIL_SUPPORT,
    });
    const result = await sendMail({
      to: { email: l.email, name: l.name ?? undefined },
      ...mail,
      kind: lesson ? "sd.reminder.lesson" : "sd.reminder.assessment",
      // Once a day per learner. A local ?only= test gets a fresh key each run, or ABT-Mailer would drop the repeat as a duplicate.
      idempotencyKey: only ? `test:${l.email}:${Date.now()}` : `${l.email}:${today}`,
      // One-click unsubscribe (RFC 8058), which Gmail and Yahoo expect on recurring mail.
      headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    if (result.ok) { sent++; return; }
    if (result.skipped) { suppressed++; return; }
    failed++;
    console.error("sd reminder failed:", l.id, result.reason);
    // Release the claim so a re-run tonight can try again.
    await sql.run`
      update course.enrollments set reminded_on = ${l.reminded_on}::date, reminder_streak = ${l.reminder_streak}
       where id = ${l.id} and reminded_on = ${today}::date
    `;
  };
  for (let i = 0; i < due.length; i += CONCURRENCY) await Promise.all(due.slice(i, i + CONCURRENCY).map(send));

  return NextResponse.json({ checked: learners.length, due: due.length, sent, suppressed, failed });
}
