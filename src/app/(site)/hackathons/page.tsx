import type { Metadata } from "next";
import { HackathonLanding } from "@/components/hackathon/landing/HackathonLanding";
import { HackathonMine } from "@/components/hackathon/landing/HackathonMine";
import { loadHackathonPage } from "@/components/hackathon/landing/load";
import { HACKATHON } from "@/data/hackathon";

export const metadata: Metadata = { title: "Hackathons", description: HACKATHON.tagline };

/**
 * The hackathon's public page, where anyone registers: sign in with Google
 * under the hero, then the form, then their team. No course is needed.
 * Learners get the same page inside their app at /learn/hackathon.
 */
export default async function HackathonsPage({ searchParams }: { searchParams: Promise<{ signin?: string }> }) {
  const { landing, mine } = await loadHackathonPage((await searchParams).signin);
  return <HackathonLanding {...landing} middle={<HackathonMine {...mine} />} />;
}
