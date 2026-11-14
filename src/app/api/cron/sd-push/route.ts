import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/cron-auth";
import { db } from "@/lib/db/client";
import { todayInIndia } from "@/lib/learn";
import { pushReady, sendPush, type PushTarget } from "@/lib/push";
import { SD_COURSE } from "@/lib/sd-offer";
import { canTake, paceOf } from "@/lib/sd-pace";
import { SD_FINAL_ASSESSMENT, SD_PUSH_SLOTS, pickSdReminder, pushStanding, sdReminderPush, type SdPushSlot } from "@/lib/sd-reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Sends in parallel, this many at a time. */
const CONCURRENCY = 25;

/**
 * 08:00, 17:00 and 21:00 IST, called by cron-job.org with ?slot=. GitHub Actions
 * ran hours late, too late for a reminder.
 * Notifies the devices of each System Design learner who passed no lesson check
 * today and has a lesson open to take. A pass stops the rest of that day's. A
 * re-run is harmless: the notification replaces itself on the device.
 * Requires CRON_SECRET as a bearer token.
 */
export async function GET(req: Request) {
  if (!isCronRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slot = new URL(req.url).searchParams.get("slot") as SdPushSlot | null;
  if (!slot || !SD_PUSH_SLOTS.includes(slot)) return NextResponse.json({ error: "Unknown slot" }, { status: 400 });
  const sql = db();
  if (!sql || !pushReady()) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const today = todayInIndia();

  const { data: learners, error } = await sql.rows<{ email: string; name: string | null; enrolled_on: string; refundable: boolean }>`
    select e.email, lead.name, to_char(e.created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD') as enrolled_on,
           (e.source = 'payment' and pay.status = 'paid') as refundable
      from course.enrollments e
      left join course.payments pay on pay.id = e.payment_id
      left join course.sd_preregistrations lead on lead.email = e.email
     where e.course = ${SD_COURSE} and e.status = 'active' and e.finished_at is null and e.reminders_off_at is null
       and exists (select 1 from course.sd_push_subscriptions d where d.email = e.email)
  `;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!learners?.length) return NextResponse.json({ slot, checked: 0, sent: 0 });
  const emails = learners.map((l) => l.email);

  const [{ data: devices, error: e1 }, { data: checks, error: e2 }, { data: finals, error: e3 }, { data: activity }] = await Promise.all([
    sql.rows<PushTarget & { email: string }>`select endpoint, email, p256dh, auth from course.sd_push_subscriptions where email = any(${emails}::text[])`,
    sql.rows<{ email: string; lesson: string; passed_on: string }>`
      select email, lesson, to_char(passed_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD') as passed_on
        from course.lesson_checks where course = ${SD_COURSE} and passed_at is not null and email = any(${emails}::text[])
    `,
    sql.rows<{ email: string; attempt: number; score: number; at: string }>`
      select email, attempt, score, taken_at as at from course.final_attempts where course = ${SD_COURSE} and email = any(${emails}::text[])
    `,
    // What they've been working on lately. Only changes the wording, so a failure here doesn't stop anything.
    sql.rows<{ email: string; lesson: string }>`
      select distinct email, lesson from course.sd_events
       where email = any(${emails}::text[]) and lesson is not null and event in ('video_play', 'step_done')
         and created_at > now() - interval '14 days'
    `,
  ]);
  const startedOn = new Set((activity ?? []).map((a) => `${a.email}|${a.lesson}`));
  const failed = e1 ?? e2 ?? e3;
  if (failed) return NextResponse.json({ error: failed.message }, { status: 500 });

  const byEmail = <T extends { email: string }>(rows: T[] | null | undefined) => {
    const map = new Map<string, T[]>();
    for (const row of rows ?? []) map.set(row.email, [...(map.get(row.email) ?? []), row]);
    return map;
  };
  const devicesOf = byEmail(devices);
  const checksOf = byEmail(checks);
  const finalsOf = byEmail(finals);

  let due = 0;
  const outgoing: { device: PushTarget; message: ReturnType<typeof sdReminderPush> }[] = [];
  for (const l of learners) {
    const passed = new Map((checksOf.get(l.email) ?? []).map((c) => [c.lesson, c.passed_on]));
    const pace = paceOf({ passes: [...passed].map(([lesson, at]) => ({ lesson, at })), finals: finalsOf.get(l.email) ?? [], refundable: l.refundable });
    if (pace.state === "finished") passed.set(SD_FINAL_ASSESSMENT, today);
    // Who's due and what for, as the email decides it, without its back-off: these go daily.
    const pick = pickSdReminder({ enrolledOn: l.enrolled_on, passes: passed, remindedOn: null, streak: 0 }, today);
    if (!pick || (pick.target.kind === "lesson" ? !canTake(pace, pick.target.lesson.id) : !pace.finalOpen)) continue;
    due++;
    const lesson = pick.target.kind === "lesson" ? pick.target.lesson : null;
    const passDates = [...passed].filter(([id]) => id !== SD_FINAL_ASSESSMENT).map(([, on]) => on);
    const message = sdReminderPush(lesson, slot, l.name, pushStanding(passDates, !!lesson && startedOn.has(`${l.email}|${lesson.id}`), today));
    for (const device of devicesOf.get(l.email) ?? []) outgoing.push({ device, message });
  }

  let sent = 0, removed = 0;
  const send = async ({ device, message }: (typeof outgoing)[number]) => {
    const res = await sendPush(device, message);
    if (res === "ok") sent++;
    if (res === "gone") {
      await sql.run`delete from course.sd_push_subscriptions where endpoint = ${device.endpoint}`;
      removed++;
    }
  };
  for (let i = 0; i < outgoing.length; i += CONCURRENCY) await Promise.all(outgoing.slice(i, i + CONCURRENCY).map(send));
  return NextResponse.json({ slot, checked: learners.length, due, sent, removed, today });
}
