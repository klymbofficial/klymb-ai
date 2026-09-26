import { tracks } from "@/data/tracks";
import { Appear } from "@/components/motion/Appear";
import { TrackCard } from "./TrackCard";

/** `compareHref` points at the comparison table: in-page on /tracks, cross-page elsewhere. */
export function TrackGrid({ compareHref = "#compare" }: { compareHref?: string }) {
  return (
    <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {tracks.map((t, i) => (
        <li key={t.slug}>
          <Appear delay={(i % 3) * 0.06} className="h-full"><TrackCard track={t} index={i} /></Appear>
        </li>
      ))}
      <li>
        <Appear delay={0.12} className="flex h-full flex-col justify-center gap-3 rounded-card bg-night p-7 text-paper shadow-float">
          <p className="display text-2xl">Not sure which track?</p>
          <p className="text-[15px] leading-relaxed text-white/70">
            Pick the role closest to the work you already do: your experience carries over. See all five side by side.
          </p>
          <a href={compareHref} className="mt-2 inline-flex items-center gap-2 self-start rounded-lg bg-red-strong px-5 py-3 text-sm font-bold text-white hover:bg-red-press">
            Compare the tracks <span aria-hidden="true">↓</span>
          </a>
        </Appear>
      </li>
    </ul>
  );
}
