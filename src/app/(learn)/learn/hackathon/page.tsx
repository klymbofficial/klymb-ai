import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HackathonLanding } from "@/components/hackathon/landing/HackathonLanding";
import { HackathonMine } from "@/components/hackathon/landing/HackathonMine";
import { loadHackathonPage } from "@/components/hackathon/landing/load";
import { LearnerTopBar } from "@/components/learner/LearnerTopBar";

export const metadata: Metadata = { title: "Hackathon", robots: { index: false, follow: false } };

/**
 * The hackathon inside the learner app: the same designed page as the public
 * /hackathons, under the sidebar, with the person's own part under the hero.
 */
export default async function MyHackathonPage() {
  const { session, email, name, landing, mine } = await loadHackathonPage();
  // Signed out, the public page has the sign-in and comes back to registration.
  if (!email) redirect("/hackathons#register");
  return (
    <>
      <LearnerTopBar name={name} image={session?.user?.image} />
      <HackathonLanding {...landing} inApp middle={<HackathonMine {...mine} />} />
    </>
  );
}
