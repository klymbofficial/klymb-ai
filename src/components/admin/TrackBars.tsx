import { allTracks as tracks } from "@/data/tracks";

/** Registrations per track, as a share of the largest track. */
export function TrackBars({ counts }: { counts: Record<string, number> }) {
  const max = Math.max(1, ...Object.values(counts));
  return (
    <ul className="flex flex-col gap-3">
      {tracks.map((t) => {
        const n = counts[t.slug] ?? 0;
        return (
          <li key={t.slug} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5">
            <span className="text-sm font-bold">{t.name}</span>
            <span className="text-sm font-extrabold tabular-nums">{n}</span>
            <span className="col-span-2 h-2 bg-surface">
              <span className="block h-2 bg-red-strong" style={{ width: `${(n / max) * 100}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
