import { sectionCopy } from "@/data/program";
import { trackCount } from "@/data/public-story";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { TrackGrid } from "@/components/track/TrackGrid";

const COUNT_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

/**
 * All the tracks at once, as cards: the same grid as /tracks. Each card
 * leads to the track's own page, which carries the full 30 days.
 */
export function CareerTracks() {
  const { eyebrow, intro } = sectionCopy.tracks;
  const title = `${COUNT_WORDS[trackCount] ?? trackCount} roles. Pick the one you want next.`;

  return (
    <section id="tracks" aria-labelledby="tracks-title" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 id="tracks-title" className="display mt-3 text-[clamp(1.85rem,4vw,2.75rem)] text-balance">{title}</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted text-pretty">{intro}</p>
        </div>
        <ButtonLink href="/tracks#compare" variant="secondary" soft className="border-line px-5 py-2.5 text-xs hover:bg-ink">
          Compare all tracks
        </ButtonLink>
      </div>
      <div className="mt-10"><TrackGrid compareHref="/tracks#compare" /></div>
    </section>
  );
}
