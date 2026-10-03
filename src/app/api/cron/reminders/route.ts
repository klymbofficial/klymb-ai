import { NextResponse } from "next/server";
import { getCurriculum } from "@/data/curricula";
import { cohortDayDate } from "@/lib/learn";
import { pushReady, sendPush } from "@/lib/push";
import { buildReminder, slotForIstHour, streakEnding } from "@/lib/reminders";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Run at 09:00, 13:00, 17:00 and 21:00 IST (GitHub Actions,
 * .github/workflows/reminders.yml). For every learner with a device
 * subscribed: "Day N is open" in the morning, then, only while today's day is
 * unsubmitted, a streak-aware nudge that grows more urgent toward the night
 * (copy in lib/reminders). Requires CRON_SECRET as a bearer token.
 */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServiceClient();
  if (!supabase || !pushReady()) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { data: subs } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth, learner_id");
  if (!subs?.length) return NextResponse.json({ sent: 0 });

  const ids = [...new Set(subs.map((s) => s.learner_id as string))];
  const { data: learners } = await supabase.from("learners").select("id, name, track, cohort_start").in("id", ids);
  const { data: done } = await supabase.from("day_submissions").select("learner_id, day").in("learner_id", ids);

  // Now in India: the date, and which of the four slots this run is.
  const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
  const today = ist.toISOString().slice(0, 10);
  const slot = slotForIstHour(ist.getUTCHours());
  if (!slot) return NextResponse.json({ sent: 0, skipped: "outside 08:00–23:59 IST" });
  let sent = 0, removed = 0, skippedDone = 0;

  for (const l of learners ?? []) {
    const course = getCurriculum(l.track as string);
    if (!course) continue;
    const day = course.days.find((d) => cohortDayDate(l.cohort_start as string, d.day) === today);
    if (!day) continue; // cohort not started, or finished

    const submitted = new Set((done ?? []).filter((d) => d.learner_id === l.id).map((d) => d.day as number));
    const msg = buildReminder({
      slot,
      name: String(l.name ?? "").split(" ")[0] || "there",
      day: day.day,
      title: day.title,
      minutes: day.estimateMinutes,
      kind: day.kind,
      streak: streakEnding(submitted, day.day - 1),
      doneToday: submitted.has(day.day),
      behind: day.day > 1 && !submitted.has(day.day - 1),
      seed: Number(today.replaceAll("-", "")) + day.day,
    });
    if (!msg) { skippedDone++; continue; }

    for (const s of subs.filter((x) => x.learner_id === l.id)) {
      const r = await sendPush(s as { endpoint: string; p256dh: string; auth: string }, msg);
      if (r === "ok") sent++;
      if (r === "gone") {
        await supabase.from("push_subscriptions").delete().eq("id", s.id);
        removed++;
      }
    }
  }
  return NextResponse.json({ sent, removed, skippedDone, slot, today });
}
