import { CareerTracks } from "@/components/home/CareerTracks";
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
import { statement } from "@/data/program";

export default function HomePage() {
  return (
    <>
      <Hero />
      <StatementBand>{statement}</StatementBand>
      <Evidence />
      <Inclusions />
      <CareerTracks />
      <HowItWorks />
      <FourWeekJourney />
      <Outcomes />
      <Pricing />
      <Faq />
      <RegisterSection />
    </>
  );
}
