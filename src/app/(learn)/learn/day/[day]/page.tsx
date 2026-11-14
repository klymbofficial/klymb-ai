import { redirect } from "next/navigation";
import { getLearnerState } from "@/lib/learner/data";

/**
 * The day address from before a person could hold several tracks, still in
 * sent emails, reminders and offline copies. It opens that day on their most
 * recent track; the admin preview's ?track= is carried to the track's own page.
 */
export default async function OldDayPage({ params, searchParams }: { params: Promise<{ day: string }>; searchParams: Promise<{ track?: string }> }) {
  const { day } = await params;
  const { track: preview } = await searchParams;
  if (preview) redirect(`/learn/tracks/${encodeURIComponent(preview)}/day/${encodeURIComponent(day)}?preview=1`);
  const state = await getLearnerState();
  if (state.state === "signed-out") redirect("/learn/login");
  if (state.state === "other-device") redirect("/learn/login?error=device");
  // Rendered by the learner error page (retry), never mistaken for a missing enrolment.
  if (state.state === "unavailable") throw new Error("Learner data is unavailable");
  if (state.state !== "enrolled") redirect("/learn");
  redirect(`/learn/tracks/${state.learner.track}/day/${encodeURIComponent(day)}`);
}
