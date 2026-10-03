import { NextResponse } from "next/server";
import { getCurriculum } from "@/data/curricula";
import { cohortDayDate } from "@/lib/learn";
import { pushReady, sendPush } from "@/lib/push";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Daily at 09:00 IST (Vercel Cron, vercel.json). For every learner with a
 * device subscribed: "Day N is open" on each cohort day, and a gentle nudge
 * when yesterday is still unsubmitted. Vercel sends CRON_SECRET as a bearer
 * token; anything else is refused.
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

  // Today's date in India, as YYYY-MM-DD.
  const today = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  let sent = 0, removed = 0;

  for (const l of learners ?? []) {
    const course = getCurriculum(l.track as string);
    if (!course) continue;
    const day = course.days.find((d) => cohortDayDate(l.cohort_start as string, d.day) === today);
    if (!day) continue; // cohort not started, or finished

    const submitted = new Set((done ?? []).filter((d) => d.learner_id === l.id).map((d) => d.day as number));
    const behind = day.day > 1 && !submitted.has(day.day - 1);
    const first = String(l.name ?? "").split(" ")[0] || "there";
    const msg = {
      title: `Day ${day.day} is open: ${day.title}`,
      body: behind
        ? `Morning ${first}. Day ${day.day - 1} is still waiting too, so start there. About ${Math.round(day.estimateMinutes / 15) * 15} minutes each.`
        : `Morning ${first}. About ${Math.round(day.estimateMinutes / 15) * 15} minutes today. ${day.kind === "assessment" ? "It's a checkpoint." : day.kind === "interview" ? "Mock interview day." : "One real problem."}`,
      url: `/learn/day/${behind ? day.day - 1 : day.day}`,
      tag: `day-${day.day}`,
    };

    for (const s of subs.filter((x) => x.learner_id === l.id)) {
      const r = await sendPush(s as { endpoint: string; p256dh: string; auth: string }, msg);
      if (r === "ok") sent++;
      if (r === "gone") {
        await supabase.from("push_subscriptions").delete().eq("id", s.id);
        removed++;
      }
    }
  }
  return NextResponse.json({ sent, removed, today });
}
