"use client";

import clsx from "clsx";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Spotlight } from "@/components/effects/Spotlight";
import type { TrackWeek } from "@/types/program";

export interface ExplorerTrack {
  slug: string;
  name: string;
  image: StaticImageData;
  weeks: Pick<TrackWeek, "week" | "title" | "challenges" | "assessment">[];
}

/**
 * Every day of every track, laid out like vgpu.sh's examples page: a sticky
 * sidebar to pick a track and jump to a week, and a grid of day cards.
 */
export function DayExplorer({ tracks }: { tracks: ExplorerTrack[] }) {
  const [slug, setSlug] = useState(tracks[0].slug);
  const track = tracks.find((t) => t.slug === slug)!;

  return (
    <section id="journey" aria-labelledby="journey-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-red-deep">Day by day</p>
      <h2 id="journey-title" className="display mt-3 text-[clamp(1.75rem,3.6vw,2.6rem)]">Explore all 30 days.</h2>

      <div className="mt-10 grid gap-8 lg:grid-cols-[15rem_1fr]">
        <nav aria-label="Tracks and weeks" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
            {tracks.map((t) => (
              <li key={t.slug} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={t.slug === slug}
                  onClick={() => setSlug(t.slug)}
                  className={clsx(
                    "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition-colors",
                    t.slug === slug ? "bg-card font-extrabold shadow-card" : "text-muted hover:bg-card/70 hover:text-ink",
                  )}
                >
                  <Image src={t.image} alt="" width={28} height={28} className="size-7 rounded-md object-cover" />
                  <span className="whitespace-nowrap">{t.name}</span>
                </button>
              </li>
            ))}
          </ul>
          <ul className="mt-5 hidden space-y-1 border-t border-line/25 pt-4 lg:block">
            {track.weeks.map((w) => (
              <li key={w.week}>
                <a href={`#week-${w.week}`} className="block rounded-md px-2.5 py-1.5 text-[13px] text-muted hover:bg-card/70 hover:text-ink">
                  <span className="font-bold text-ink">Week {w.week}</span> · {w.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-12">
          {track.weeks.map((w) => (
            <div key={w.week} id={`week-${w.week}`} className="scroll-mt-24">
              <div className="flex items-baseline gap-3">
                <span className="display text-2xl text-red-strong">Week {w.week}</span>
                <span className="text-sm font-bold text-muted">{w.title}</span>
              </div>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {w.challenges.map((c) => (
                  <li key={c.day}>
                    <Spotlight className="h-full rounded-card">
                      <article className="card flex h-full flex-col gap-2 p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-float">
                        <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted nums">Day {c.day}</span>
                        <h3 className="font-extrabold leading-snug">{c.title}</h3>
                        <p className="line-clamp-3 text-[13px] leading-relaxed text-muted">{c.problem}</p>
                      </article>
                    </Spotlight>
                  </li>
                ))}
                <li>
                  <article className="flex h-full flex-col gap-2 rounded-card bg-night p-5 text-paper shadow-card">
                    <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-red nums">Day {w.assessment.afterDay} · Checkpoint</span>
                    <h3 className="font-extrabold leading-snug">{w.assessment.title}</h3>
                    <p className="line-clamp-3 text-[13px] leading-relaxed text-white/70">{w.assessment.task}</p>
                  </article>
                </li>
              </ul>
            </div>
          ))}
          <Link href={`/tracks/${track.slug}`} className="inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-3 text-sm font-bold text-paper hover:bg-red-strong">
            See the full {track.name} track <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
