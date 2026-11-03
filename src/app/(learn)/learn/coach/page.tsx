import { redirect } from "next/navigation";
import { getLearnerState } from "@/lib/learner/data";

/** The coach's address from before several tracks: their most recent track's coach. */
export default async function OldCoachPage() {
  const state = await getLearnerState();
  if (state.state === "signed-out") redirect("/learn/login");
  if (state.state === "other-device") redirect("/learn/login?error=device");
  if (state.state !== "enrolled") redirect("/learn");
  redirect(`/learn/tracks/${state.learner.track}/coach`);
}
