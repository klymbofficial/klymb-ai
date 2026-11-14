import { Landing } from "@/components/landing/Landing";
import { redirectToDashboard } from "@/lib/learner/courses";

export default async function HomePage() {
  // A signed-in learner wants their courses, not the sales page.
  await redirectToDashboard();

  return <Landing />;
}
