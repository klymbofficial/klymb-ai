"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { mockInterviewPhase, sectionCopy, weekPhases } from "@/data/program";
import { tracks } from "@/data/tracks";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import trackAccent from "@/assets/track-accent.jpg";

function Check() {
  return (
    <svg className="mt-0.5 size-4 shrink-0 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <path d="m4 12 5 5L20 6" />
    </svg>
  );
}

export function CareerTracks() {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const track = tracks[active];
  const { eyebrow, title, intro } = sectionCopy.tracks;

  return (
    <section id="tracks" aria-labelledby="tracks-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 id="tracks-title" className="display mt-3 text-[clamp(1.85rem,4vw,2.75rem)] text-balance">{title}</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted text-pretty">{intro}</p>
        </div>
        <ButtonLink href="/tracks" variant="secondary" soft className="border-line px-5 py-2.5 text-xs hover:bg-ink">
          Compare all tracks
        </ButtonLink>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-0">
        {/* Track picker */}
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
          <div className="card overflow-hidden lg:rounded-r-none">
            <ul role="tablist" aria-label="Career tracks" className="flex overflow-x-auto lg:flex-col lg:overflow-visible">
              {tracks.map((t, i) => {
                const isActive = i === active;
                return (
                  <li key={t.slug} role="presentation" className="min-w-max flex-1 lg:min-w-0">
                    <button
                      type="button"
                      role="tab"
                      id={`track-tab-${t.slug}`}
                      aria-selected={isActive}
                      aria-controls="track-panel"
                      onClick={() => setActive(i)}
                      className={clsx(
                        "relative flex w-full items-center gap-3 px-5 py-4 text-left transition-colors",
                        isActive ? "bg-white" : "text-muted hover:bg-surface/40 hover:text-ink",
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="track-tab-indicator"
                          aria-hidden="true"
                          className="absolute inset-x-0 bottom-0 h-0.5 bg-red-strong lg:inset-x-auto lg:inset-y-0 lg:left-0 lg:h-auto lg:w-1"
                          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
                        />
                      )}
                      <span className={clsx("text-sm font-extrabold nums", isActive ? "text-red-strong" : "text-muted/70")}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-xs font-extrabold uppercase tracking-[0.1em]">{t.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="order-3 rounded-card bg-surface p-6 lg:order-none">
            <p className="text-lg font-extrabold leading-tight">Not sure which track?</p>
            <p className="mt-2 text-sm text-muted">Compare all five side by side — who each one is for, what changes in it, and what you build.</p>
            <ButtonLink href="/tracks" soft arrow className="mt-4 px-4 py-2 text-xs">Compare tracks</ButtonLink>
          </div>
        </div>

        {/* Track detail */}
        <div id="track-panel" role="tabpanel" aria-labelledby={`track-tab-${track.slug}`} className="order-2 card min-w-0 overflow-hidden lg:order-none lg:rounded-l-none">
          <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={track.slug}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 1 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.2, 0.7, 0.3, 1] }}
          >
          <div className="relative overflow-hidden bg-night px-8 py-10 text-paper sm:px-10 sm:py-12">
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 lg:block">
              <Image src={trackAccent} alt="" sizes="33vw" className="size-full object-cover" />
              <span className="absolute inset-0 bg-gradient-to-r from-night via-night/45 to-transparent" />
            </div>
            <div className="relative">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/45">
                {String(active + 1).padStart(2, "0")} / Career track
              </p>
              <h3 className="display mt-3 text-3xl sm:text-4xl">{track.name}</h3>
              <p className="mt-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-red">→ {track.becomes}</p>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">{track.description}</p>
              {!track.available && (
                <p className="mt-4 inline-block rounded-full border border-white/25 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white/70">
                  Opening in a later cohort
                </p>
              )}
            </div>
          </div>

          <div className="bg-night px-8 pb-10 text-paper sm:px-10">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/45">What you learn:</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {track.skills.slice(0, 6).map((skill, si) => (
                <motion.li
                  key={skill}
                  className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/85"
                  initial={reduced ? false : { opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.22, delay: 0.08 + si * 0.035 }}
                >
                  {skill}
                </motion.li>
              ))}
            </ul>
            <ul className="mt-8 space-y-3 border-t border-white/12 pt-7 text-sm text-white/85">
              {track.outcomes.slice(0, 3).map((o) => (
                <li key={o} className="flex gap-3"><Check />{o}</li>
              ))}
            </ul>
          </div>

          <div className="grid gap-px bg-line/25 sm:grid-cols-2 xl:grid-cols-4">
            {track.weeks.map((w, wi) => {
              const phase = weekPhases[w.week - 1];
              return (
                <motion.div
                  key={w.week}
                  className="bg-card p-6"
                  initial={reduced ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.1 + wi * 0.06, ease: [0.2, 0.7, 0.3, 1] }}
                >
                  <p className="display text-2xl text-red-strong">Week {w.week}</p>
                  <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">
                    {phase.days} • {phase.name}
                  </p>
                  <p className="mt-3 text-base font-extrabold leading-snug">{w.title}</p>
                  <ul className="mt-4 space-y-2.5 text-xs">
                    {w.challenges.slice(0, 3).map((c) => (
                      <li key={c.day} className="flex gap-3">
                        <span className="w-11 shrink-0 font-semibold text-muted nums">Day {c.day}</span>
                        <span className="text-ink/85">{c.title}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 border-t border-line/25 pt-4 text-xs leading-relaxed text-muted">
                    <strong className="font-extrabold text-ink">Day {w.assessment.afterDay} assessment:</strong> {w.assessment.task}
                  </p>
                </motion.div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 bg-night px-8 py-5 text-paper sm:px-10">
            <p className="display text-lg text-red">Days 29–30</p>
            <p className="text-base font-extrabold">{mockInterviewPhase.name}</p>
            <p className="ml-auto text-xs text-white/60">{mockInterviewPhase.summary}</p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-4 p-6 sm:p-8">
            <Link href={`/tracks/${track.slug}`} className="text-sm font-bold text-red-deep underline-offset-4 hover:underline">
              Syllabus &amp; projects →
            </Link>
            <ButtonLink href={track.available ? `/register?track=${track.slug}` : "/register"} soft className="px-7">
              {track.available ? "Enrol now" : "Join the waitlist"}
            </ButtonLink>
          </div>
          </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
