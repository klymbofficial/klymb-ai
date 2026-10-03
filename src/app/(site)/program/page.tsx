import type { Metadata } from "next";
import { Inclusions } from "@/components/home/Inclusions";
import { Pricing } from "@/components/home/Pricing";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgramTimeline } from "@/components/program/ProgramTimeline";
import { DayExplorer } from "@/components/program/DayExplorer";
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
      <ProgramTimeline />
      <Inclusions />
      <DayExplorer tracks={explorer} />
      <Pricing />
    </>
  );
}
