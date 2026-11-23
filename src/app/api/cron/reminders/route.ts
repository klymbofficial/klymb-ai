import { isCronRequest } from "@/lib/cron-auth";
import { NextResponse } from "next/server";
import { getCurriculum } from "@/data/curricula";
import { cohortDayDate } from "@/lib/learn";
import { pushReady, sendPush } from "@/lib/push";
import { db } from "@/lib/db/client";
import { buildReminder, slotAtHour, streakEnding } from "@/lib/reminders";
import { IST, dayIn, hourIn, timeZoneOf } from "@/lib/timezone";

/**
 * Run every hour (GitHub Actions, .github/workflows/reminders.yml). Each
 * learner is reminded at 09:00, 14:00 and 20:00 on their own clock (India
 * time unless their time zone is kept). For every learner with a device
 * subscribed: "Day N is open" in the morning, then, only while today's day is
 * unsubmitted, a streak-aware nudge that grows more urgent toward the night
 * (copy in lib/reminders). Requires CRON_SECRET as a bearer token.
 */
export async function GET(req: Request) {
  if (!isCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sql = db();
  if (!sql || !pushReady()) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { data: subs } = await sql.rows<{
    id: string; endpoint: string; p256dh: string; auth: string; learner_id: string;
  }>`
    select id, endpoint, p256dh, auth, learner_id from course.push_subscriptions
  `;
  if (!subs?.length) return NextResponse.json({ sent: 0 });

  const ids = [...new Set(subs.map((s) => s.learner_id))];
  const { data: learners } = await sql.rows<{ id: string; name: string | null; track: string; cohort_start: string }>`
    select id, name, track, cohort_start from course.learners where id = any(${ids}::uuid[])
  `;
  // Their time zones, read on their own so a database without 0048 still reminds everyone on India time.
  const { data: zones } = await sql.rows<{ id: string; timezone: string }>`select id, timezone from course.learners where id = any(${ids}::uuid[])`;
  const zoneOf = new Map((zones ?? []).map((z) => [z.id, timeZoneOf(z.timezone) ?? IST]));
  const { data: done } = await sql.rows<{ learner_id: string; day: number }>`
    select learner_id, day from course.day_submissions where learner_id = any(${ids}::uuid[])
  `;

  const now = Date.now();
  let sent = 0, removed = 0, skippedDone = 0;

  for (const l of learners ?? []) {
    // Now where they are: the date, and which of the three slots this hour is, if any.
    const zone = zoneOf.get(l.id) ?? IST;
    const slot = slotAtHour(hourIn(now, zone));
    if (!slot) continue;
    const today = dayIn(now, zone);
    const course = getCurriculum(l.track);
    if (!course) continue;
    const day = course.days.find((d) => cohortDayDate(l.cohort_start, d.day) === today);
    if (!day) continue; // cohort not started, or finished

    const submitted = new Set((done ?? []).filter((d) => d.learner_id === l.id).map((d) => d.day));
    const msg = buildReminder({
      slot,
      track: l.track,
      name: String(l.name ?? "").split(" ")[0] || "there",
      day: day.day,
      title: day.title,
      minutes: day.estimateMinutes,
      kind: day.kind,
      streak: streakEnding(submitted, day.day - 1),
      doneToday: submitted.has(day.day),
      behind: day.day > 1 && !submitted.has(day.day - 1),
      behindTitle: course.days.find((d) => d.day === day.day - 1)?.title,
      behindMinutes: course.days.find((d) => d.day === day.day - 1)?.estimateMinutes,
      seed: Number(today.replaceAll("-", "")) + day.day,
    });
    if (!msg) { skippedDone++; continue; }

    for (const s of subs.filter((x) => x.learner_id === l.id)) {
      const r = await sendPush(s, msg);
      if (r === "ok") sent++;
      if (r === "gone") {
        await sql.run`delete from course.push_subscriptions where id = ${s.id}`;
        removed++;
      }
    }
  }
  return NextResponse.json({ sent, removed, skippedDone });
}
