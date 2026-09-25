import Image from "next/image";
import Link from "next/link";
import { trackImages } from "@/data/track-images";
import type { Track } from "@/types/program";

export function TrackCard({ track, index }: { track: Track; index: number }) {
  const image = trackImages[track.slug];

  return (
    <article className="card group flex h-full flex-col overflow-hidden transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-float">
      <div className="relative aspect-[16/9] overflow-hidden bg-surface">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(min-width: 1024px) 380px, (min-width: 768px) 50vw, 100vw"
          placeholder="blur"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        <span className="display absolute bottom-3 left-5 text-4xl text-white nums drop-shadow-sm">{String(index + 1).padStart(2, "0")}</span>
        <span className="absolute top-4 right-4 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-red-deep shadow-card">
          {track.contentLive ? "Day 1 open now" : "Enrolling now"}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-5 p-7 pt-6">
      <div>
        <h3 className="display text-2xl">{track.name}</h3>
        <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.12em] text-red-strong">→ {track.becomes}</p>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{track.description}</p>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {track.skills.slice(0, 5).map((s) => (
          <li key={s} className="rounded-md border border-line/40 px-2.5 py-1 text-xs font-semibold">{s}</li>
        ))}
      </ul>
      <Link
        href={`/tracks/${track.slug}`}
        className="mt-auto inline-flex items-center gap-2 self-start rounded-lg bg-ink px-5 py-3 text-sm font-bold text-paper transition-colors group-hover:bg-red-strong"
      >
        Explore this track<span className="sr-only">: {track.name}</span>
        <svg className="transition-transform group-hover:translate-x-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
      </Link>
      </div>
    </article>
  );
}
