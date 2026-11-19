import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CourseLibrary } from "@/components/catalog/CourseLibrary";
import { LearnerTopBar } from "@/components/learner/LearnerTopBar";
import { getLearnerState, getLearnerTracks } from "@/lib/learner/data";

export const metadata: Metadata = { title: "Library", robots: { index: false, follow: false } };

/**
 * The course library for a signed-in learner, inside the dashboard's frame:
 * the same search, filters and cards as the public /courses, with the
 * learner's sidebar instead of the site's header. Signed out, the public
 * library is the one to see.
 */
export default async function DashboardLibraryPage() {
  const state = await getLearnerState();
  if (state.state === "signed-out") redirect("/courses");
  if (state.state === "other-device") redirect("/learn/login?error=device");
  if (state.state === "unavailable") throw new Error("Learner data is unavailable");

  const session = await auth();
  const email = state.state === "enrolled" ? state.learner.email : state.email;
  const places = await getLearnerTracks();
  const name = places[0]?.learner.name || session?.user?.name || email.split("@")[0];

  return (
    <>
      <LearnerTopBar name={name} image={session?.user?.image} />
      <main id="library">
        <CourseLibrary frame="learner" />
      </main>
    </>
  );
}
