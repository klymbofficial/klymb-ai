import Link from "next/link";
import type { Track } from "@/types/program";

export function TrackCard({ track, index }: { track: Track; index: number }) {
  const open = track.available;

  return (
    <article className={`group flex h-full flex-col gap-5 p-6 transition-colors ${open ? "bg-paper hover:bg-red-tint" : "bg-paper/60"}`}>
      <div className="flex items-start justify-between gap-3">
        <span className={`display text-4xl ${open ? "text-red" : "text-muted"}`}>{String(index + 1).padStart(2, "0")}</span>
        <span className={`border px-2 py-0.5 text-right text-[11px] font-bold uppercase tracking-wider ${open ? "border-red-deep bg-red-tint text-red-deep" : "border-line text-muted"}`}>
          {open ? "Enrolling now" : "Opening later"}
        </span>
      </div>
      <div>
        <h3 className="display text-3xl">{track.name}</h3>
        <p className="mt-1 text-sm font-bold text-red-deep">Heading to: {track.becomes}</p>
        <p className="mt-3 text-base text-muted">{track.description}</p>
      </div>
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Skills covered</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {track.skills.map((s) => (
            <li key={s} className="border border-ink/40 px-2 py-0.5 text-xs font-semibold">{s}</li>
          ))}
        </ul>
      </div>
      <Link
        href={`/tracks/${track.slug}`}
        className={`mt-auto inline-flex items-center gap-2 self-start border-2 px-4 py-2.5 text-sm font-bold uppercase tracking-wider ${
          open ? "border-ink group-hover:bg-ink group-hover:text-paper" : "border-line text-muted hover:border-ink hover:text-ink"
        }`}
      >
        {open ? "Explore This Track" : "Preview The Track"}<span className="sr-only">: {track.name}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
      </Link>
    </article>
  );
}
