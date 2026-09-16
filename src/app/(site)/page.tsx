import { CareerTracks } from "@/components/home/CareerTracks";
import { Designers } from "@/components/home/Designers";
import { Evidence } from "@/components/home/Evidence";
import { Faq } from "@/components/home/Faq";
import { FourWeekJourney } from "@/components/home/FourWeekJourney";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Inclusions } from "@/components/home/Inclusions";
import { Outcomes } from "@/components/home/Outcomes";
import { Pricing } from "@/components/home/Pricing";
import { RegisterSection } from "@/components/home/RegisterSection";
import { StatementBand } from "@/components/home/StatementBand";
import { redirect } from "next/navigation";
import { statement } from "@/data/program";
import { getLearnerState } from "@/lib/learner/data";

export default async function HomePage() {
  // A signed-in learner wants their cohort, not the sales page.
  const learner = await getLearnerState();
  if (learner.state === "enrolled") redirect("/learn");

  return (
    <>
      <Hero />
      <StatementBand>{statement}</StatementBand>
      <Evidence />
      <Inclusions />
      <CareerTracks />
      <HowItWorks />
      <FourWeekJourney />
      <Designers />
      <Outcomes />
      <Pricing />
      <Faq />
      <RegisterSection />
    </>
  );
}
