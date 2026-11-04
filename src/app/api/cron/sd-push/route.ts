import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/cron-auth";
import { db } from "@/lib/db/client";
import { todayInIndia } from "@/lib/learn";
import { pushReady, sendPush, type PushTarget } from "@/lib/push";
import { SD_COURSE } from "@/lib/sd-offer";
import { canTake, paceOf } from "@/lib/sd-pace";
import { SD_FINAL_ASSESSMENT, SD_PUSH_SLOTS, pickSdReminder, sdReminderPush, type SdPushSlot } from "@/lib/sd-reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * 08:00, 17:00 and 21:00 IST (.github/workflows/sd-push.yml, with ?slot=).
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

  const { data: learners, error } = await sql.rows<{ email: string; enrolled_on: string; refundable: boolean }>`
    select e.email, to_char(e.created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD') as enrolled_on,
           (e.source = 'payment' and pay.status = 'paid') as refundable
      from course.enrollments e
      left join course.payments pay on pay.id = e.payment_id
     where e.course = ${SD_COURSE} and e.status = 'active' and e.finished_at is null and e.reminders_off_at is null
       and exists (select 1 from course.sd_push_subscriptions d where d.email = e.email)
  `;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!learners?.length) return NextResponse.json({ slot, checked: 0, sent: 0 });
  const emails = learners.map((l) => l.email);

  const [{ data: devices, error: e1 }, { data: checks, error: e2 }, { data: finals, error: e3 }] = await Promise.all([
    sql.rows<PushTarget & { email: string }>`select endpoint, email, p256dh, auth from course.sd_push_subscriptions where email = any(${emails}::text[])`,
    sql.rows<{ email: string; lesson: string; passed_on: string }>`
      select email, lesson, to_char(passed_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD') as passed_on
        from course.lesson_checks where course = ${SD_COURSE} and passed_at is not null and email = any(${emails}::text[])
    `,
    sql.rows<{ email: string; attempt: number; score: number; at: string }>`
      select email, attempt, score, taken_at as at from course.final_attempts where course = ${SD_COURSE} and email = any(${emails}::text[])
    `,
  ]);
  const failed = e1 ?? e2 ?? e3;
  if (failed) return NextResponse.json({ error: failed.message }, { status: 500 });

  let sent = 0, removed = 0, due = 0;
  for (const l of learners) {
    const passed = new Map((checks ?? []).filter((c) => c.email === l.email).map((c) => [c.lesson, c.passed_on]));
    const pace = paceOf({ passes: [...passed].map(([lesson, at]) => ({ lesson, at })), finals: (finals ?? []).filter((f) => f.email === l.email), refundable: l.refundable });
    if (pace.state === "finished") passed.set(SD_FINAL_ASSESSMENT, today);
    // Who's due and what for, as the email decides it, without its back-off: these go daily.
    const pick = pickSdReminder({ enrolledOn: l.enrolled_on, passes: passed, remindedOn: null, streak: 0 }, today);
    if (!pick || (pick.target.kind === "lesson" ? !canTake(pace, pick.target.lesson.id) : !pace.finalOpen)) continue;
    due++;
    const message = sdReminderPush(pick.target.kind === "lesson" ? pick.target.lesson : null, slot);
    for (const device of (devices ?? []).filter((d) => d.email === l.email)) {
      const res = await sendPush(device, message);
      if (res === "ok") sent++;
      if (res === "gone") {
        await sql.run`delete from course.sd_push_subscriptions where endpoint = ${device.endpoint}`;
        removed++;
      }
    }
  }
  return NextResponse.json({ slot, checked: learners.length, due, sent, removed, today });
}
