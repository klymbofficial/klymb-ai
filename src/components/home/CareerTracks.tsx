import { ButtonLink } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TrackGrid } from "@/components/track/TrackGrid";

export function CareerTracks() {
  return (
    <section id="tracks" aria-labelledby="tracks-title" className="border-b-2 border-line py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader
          id="tracks-title"
          eyebrow="Career tracks"
          title="Five roles. Pick the one you want next."
          intro="Every track has its own daily problems, assessments, projects and interview questions."
          aside={<ButtonLink href="/tracks" variant="secondary">Compare tracks</ButtonLink>}
        />
        <div className="mt-10"><TrackGrid /></div>
      </div>
    </section>
  );
}
