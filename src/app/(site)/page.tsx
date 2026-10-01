import { AiFoundations } from "@/components/home/AiFoundations";
import { ForYouIf } from "@/components/home/ForYouIf";
import { PromoFilm } from "@/components/home/PromoFilm";
import { CareerTracks } from "@/components/home/CareerTracks";
import { Evidence } from "@/components/home/Evidence";
import { FaqJoin } from "@/components/home/FaqJoin";
import { StickyEnrolBar } from "@/components/home/StickyEnrolBar";
import { WhyRefund } from "@/components/home/WhyRefund";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Pricing } from "@/components/home/Pricing";
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
      <PromoFilm />
      <ForYouIf />
      <AiFoundations />
      <Evidence />
      <HowItWorks />
      <CareerTracks />
      <Pricing />
      <WhyRefund />
      <FaqJoin />
      <StickyEnrolBar />
    </>
  );
}
