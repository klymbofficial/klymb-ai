import type { Metadata } from "next";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Inclusions } from "@/components/home/Inclusions";
import { Pricing } from "@/components/home/Pricing";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { DayExplorer } from "@/components/program/DayExplorer";
import { mockInterviewPhase, weekPhases } from "@/data/program";
import { trackImages } from "@/data/track-images";
import { tracks } from "@/data/tracks";

export const metadata: Metadata = { title: "The 30-Day Program" };

export default function ProgramPage() {
  // Only what the explorer draws crosses to the client, not whole tracks.
  const explorer = tracks.map((t) => ({
    slug: t.slug,
    name: t.name,
    image: trackImages[t.slug].src,
    weeks: t.weeks.map(({ week, title, challenges, assessment }) => ({ week, title, challenges, assessment })),
  }));

  return (
    <>
      <PageHeader eyebrow="The program" title="A structured 30-day career transformation." intro="Not a video course. A daily rhythm of workplace problems, weekly checkpoints and interview practice for one chosen role.">
        <ButtonLink href="/tracks" arrow>Choose My Career Track</ButtonLink>
      </PageHeader>
      <section aria-label="Program timeline" className="border-b-2 border-line">
        <ol className="mx-auto grid max-w-7xl md:grid-cols-5">
          {weekPhases.map((p) => (
            <li key={p.week} className="border-b-2 border-line px-4 py-8 sm:px-6 md:border-r-2 md:border-b-0">
              <p className="display text-4xl text-red">W{p.week}</p>
              <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.14em] text-muted">{p.days}</p>
              <p className="mt-1 text-lg font-extrabold">{p.name}</p>
              <p className="mt-2 text-sm text-muted">{p.summary}</p>
            </li>
          ))}
          <li className="bg-ink px-4 py-8 text-paper sm:px-6">
            <p className="display text-4xl text-red-soft">MI</p>
            <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.14em] text-white/70">{mockInterviewPhase.days}</p>
            <p className="mt-1 text-lg font-extrabold">{mockInterviewPhase.name}</p>
            <p className="mt-2 text-sm text-white/75">{mockInterviewPhase.summary}</p>
          </li>
        </ol>
      </section>
      <Inclusions />
      <HowItWorks />
      <DayExplorer tracks={explorer} />
      <Pricing />
    </>
  );
}
