import { redirect } from "next/navigation";

/**
 * The dashboard moved to /dashboard. Old bookmarks, emails and the installed
 * app's start page land here and go straight on; the learner pages under
 * /learn (tracks, days, the course reader, profile, login) stay where they are.
 */
export default function OldDashboard() {
  redirect("/dashboard");
}
