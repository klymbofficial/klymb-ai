import { HIDE_MONEY } from "@/lib/site-status";
import { AiFoundations } from "@/components/home/AiFoundations";
import { CareerTracks } from "@/components/home/CareerTracks";
import { FaqJoin } from "@/components/home/FaqJoin";
import { Hero } from "@/components/home/Hero";
import { LearningApproach } from "@/components/home/LearningApproach";
import { Paths } from "@/components/home/Paths";
import { Pricing } from "@/components/home/Pricing";
import { StatementBand } from "@/components/home/StatementBand";
import { StickyEnrolBar } from "@/components/home/StickyEnrolBar";
import { StoryLinks } from "@/components/home/StoryLinks";
import { SystemDesignFeature } from "@/components/home/SystemDesignFeature";
import { WhyRefund } from "@/components/home/WhyRefund";
import { allFree } from "@/data/tracks";
import { redirect } from "next/navigation";
import { statement } from "@/data/program";
import { getLearnerState, redirectCourseBuyer } from "@/lib/learner/data";

export default async function HomePage() {
  // A signed-in learner wants their course or cohort, not the sales page.
  await redirectCourseBuyer();
  const learner = await getLearnerState();
  if (learner.state === "enrolled") redirect("/learn");

  // One story, top to bottom: who it is for, how learning works, what you can
  // study, then the questions. Proof is only what the project can show.
  return (
    <>
      <Hero />
      <Paths />
      <StatementBand>{statement}</StatementBand>
      <LearningApproach />
      <CareerTracks />
      <SystemDesignFeature />
      <AiFoundations />
      <StoryLinks />
      {!HIDE_MONEY && <Pricing />}
      {!allFree && <WhyRefund />}
      <FaqJoin />
      <StickyEnrolBar />
    </>
  );
}
