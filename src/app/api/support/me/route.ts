import { NextResponse } from "next/server";
import { getLearnerState } from "@/lib/learner/data";
import { dayLock } from "@/lib/access";
import { getTrack } from "@/data/tracks";
import { streakEnding } from "@/lib/reminders";

export const dynamic = "force-dynamic";

/** What Kamran knows about the signed-in learner, for personal answers. Nothing for visitors. */
export async function GET() {
  const s = await getLearnerState();
  if (s.state !== "enrolled") return NextResponse.json({ state: s.state, email: s.state === "not-enrolled" ? s.email : undefined });

  const { learner, submissions } = s;
  const track = getTrack(learner.track);
  const done = submissions.map((x) => x.day);
  const doneSet = new Set(done);
  let day = 1;
  while (day < 30 && doneSet.has(day)) day++;
  const lock = await dayLock({ email: learner.email, price: track?.price ?? 0, day, submittedDays: done });
  const rework = submissions.filter((x) => x.status === "needs_rework").map((x) => x.day);

  return NextResponse.json({
    state: "enrolled",
    name: learner.name.split(" ")[0],
    email: learner.email,
    track: track?.name ?? learner.track,
    day,
    submitted: doneSet.size,
    streak: streakEnding(doneSet, Math.max(...done, 0)),
    lock,
    rework,
    missing: [!learner.github_username && "GitHub", !learner.linkedin_slug && "LinkedIn"].filter(Boolean),
  });
}
