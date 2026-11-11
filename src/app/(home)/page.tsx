import { redirect } from "next/navigation";
import { Landing } from "@/components/landing/Landing";
import { getLearnerState, redirectCourseBuyer } from "@/lib/learner/data";

export default async function HomePage() {
  // A signed-in learner wants their course or cohort, not the sales page.
  await redirectCourseBuyer();
  const learner = await getLearnerState();
  if (learner.state === "enrolled") redirect("/learn");

  return <Landing />;
}
