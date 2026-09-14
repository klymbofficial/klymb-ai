import { tracks } from "@/data/tracks";
import { TrackCard } from "./TrackCard";

export function TrackGrid() {
  return (
    <ul className="grid gap-0.5 border-2 border-line bg-line md:grid-cols-2 lg:grid-cols-3">
      {tracks.map((t, i) => (
        <li key={t.slug}><TrackCard track={t} index={i} /></li>
      ))}
      <li className="flex flex-col justify-center gap-3 bg-ink p-6 text-paper">
        <p className="display text-3xl">Not sure which track?</p>
        <p className="text-white/70">Pick the role closest to the work you already do. Your existing experience carries over.</p>
      </li>
    </ul>
  );
}
