import type { Metadata } from "next";
import { currentEmail } from "@/auth";
import { HackathonLanding } from "@/components/hackathon/landing/HackathonLanding";
import { HACKATHON, hackathonPhase } from "@/data/hackathon";
import { hasInterest, myTeam, publishedResults } from "@/lib/hackathon";

export const metadata: Metadata = { title: "Hackathons", description: HACKATHON.tagline };

/** The hackathon's public page. Signed-in learners get the same page inside their app at /learn/hackathon. */
export default async function HackathonsPage() {
  const results = await publishedResults();
  const phase = hackathonPhase(results.length > 0);
  const email = await currentEmail();
  const [team, interested] = email ? await Promise.all([myTeam(email), hasInterest(email)]) : [null, false];
  return <HackathonLanding phase={phase} results={results} team={team} email={email} interested={interested} />;
}
