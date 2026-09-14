"use client";

import clsx from "clsx";
import { useState } from "react";
import { mockInterviewPhase, weekPhases } from "@/data/program";
import { tracks } from "@/data/tracks";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function FourWeekJourney() {
  const [slug, setSlug] = useState(tracks[0].slug);
  const track = tracks.find((t) => t.slug === slug) ?? tracks[0];

  return (
    <section id="journey" aria-labelledby="journey-title" className="border-b-2 border-line bg-surface py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader id="journey-title" eyebrow="Four-week journey" title="Same structure. Different problems for every role." intro="Pick a track to see example daily challenges for each week." />

        <div role="group" aria-label="Choose a track to preview" className="mt-8 flex flex-wrap gap-2">
          {tracks.map((t) => (
            <button
              key={t.slug}
              type="button"
              aria-pressed={t.slug === slug}
              onClick={() => setSlug(t.slug)}
              className={clsx("border-2 px-3 py-2 text-sm font-bold", t.slug === slug ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-ink")}
            >
              {t.name}
            </button>
          ))}
        </div>

        <ol className="mt-6 grid gap-0.5 border-2 border-line bg-line md:grid-cols-2 lg:grid-cols-4" aria-live="polite">
          {weekPhases.map((phase) => {
            const week = track.weeks.find((w) => w.week === phase.week)!;
            return (
              <li key={phase.week} className="flex flex-col gap-4 bg-paper p-6">
                <div>
                  <p className="display text-3xl text-red">Week {phase.week}</p>
                  <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.14em] text-muted">{phase.days} · {phase.name}</p>
                </div>
                <p className="text-lg font-extrabold leading-tight">{week.title}</p>
                <ul className="space-y-2 text-sm">
                  {week.challenges.slice(0, 3).map((c) => (
                    <li key={c.day} className="flex gap-2">
                      <span className="w-12 shrink-0 font-bold text-muted">Day {c.day}</span>
                      <span>{c.title}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-auto border-t-2 border-line pt-3 text-sm">
                  <span className="font-extrabold">Day {week.assessment.afterDay} assessment:</span> {week.assessment.task}
                </p>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-t-0 border-line bg-ink px-6 py-5 text-paper">
          <p><span className="display text-2xl text-red">{mockInterviewPhase.days}</span> <span className="ml-2 font-extrabold">{mockInterviewPhase.name}</span></p>
          <p className="text-sm text-white/75">{mockInterviewPhase.summary}</p>
        </div>
      </div>
    </section>
  );
}
