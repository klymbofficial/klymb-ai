import Image from "next/image";
import { cohort } from "@/data/config";
import { tracks } from "@/data/tracks";
import { formatDate } from "@/lib/format";
import type { Track } from "@/types/program";
import { Appear } from "@/components/motion/Appear";
import { Pricing } from "@/components/home/Pricing";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import trackAccent from "@/assets/track-accent.jpg";
import { TrackCurriculum } from "./TrackCurriculum";

function Check({ className = "text-red-strong" }: { className?: string }) {
  return (
    <svg className={`mt-0.5 size-4 shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <path d="m4 12 5 5L20 6" />
    </svg>
  );
}

/** A section heading in the landing page's voice: red eyebrow, heavy title, muted intro. */
function Heading({ id, eyebrow, title, intro, light }: { id?: string; eyebrow: string; title: string; intro?: string; light?: boolean }) {
  return (
    <div className="max-w-2xl">
      <Eyebrow tone={light ? "light" : "red"}>{eyebrow}</Eyebrow>
      <h2 id={id} className="display mt-3 text-[clamp(1.75rem,3.6vw,2.6rem)] text-balance">{title}</h2>
      {intro && <p className={`mt-3 text-[15px] leading-relaxed ${light ? "text-white/70" : "text-muted"}`}>{intro}</p>}
    </div>
  );
}

export function TrackDetail({ track }: { track: Track }) {
  const number = String(tracks.findIndex((t) => t.slug === track.slug) + 1).padStart(2, "0");
  const enrolHref = `/register?track=${track.slug}`;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section aria-labelledby="track-title" className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
        <div className="card overflow-hidden rounded-slab shadow-float">
          <div className="grid lg:grid-cols-[1.15fr_1fr]">
            <div className="p-8 sm:p-12 lg:p-14">
              <Appear>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-red-deep">Career track {number}</span>
                  <span className="rounded-full bg-red-tint px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-red-deep">Enrolling now</span>
                </div>
              </Appear>
              <Appear delay={0.08} y={24}>
                <h1 id="track-title" className="display mt-5 text-[clamp(2.5rem,6vw,4.25rem)] text-balance">{track.name}</h1>
              </Appear>
              <Appear delay={0.16}>
                <p className="mt-3 text-sm font-extrabold uppercase tracking-[0.14em] text-red-strong">→ {track.becomes}</p>
                <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base">{track.description}</p>
              </Appear>
              <Appear delay={0.24} className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href={enrolHref} soft arrow>Choose this track</ButtonLink>
                <ButtonLink href="#curriculum" variant="secondary" soft className="border-line hover:bg-ink">See the 30 days</ButtonLink>
              </Appear>
              {!track.contentLive && (
                <Appear delay={0.3}>
                  <p className="mt-6 max-w-xl rounded-card bg-surface/70 px-4 py-3 text-sm text-muted">
                    Registration is open now. The {track.name} course is being finished for this cohort — your place is
                    reserved the moment you register, and we email you when Day 1 opens.
                  </p>
                </Appear>
              )}
            </div>

            {/* The same facade photograph as the landing page's track card. */}
            <div className="relative min-h-[18rem] overflow-hidden bg-night lg:min-h-full">
              <Image src={trackAccent} alt="" aria-hidden="true" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover opacity-90" priority />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-night via-night/40 to-transparent" />
              <Appear delay={0.35} className="absolute inset-x-6 bottom-6 sm:inset-x-8 sm:bottom-8">
                <dl className="grid grid-cols-3 gap-3 rounded-card bg-white/95 p-4 text-center shadow-float backdrop-blur">
                  {[
                    ["30", "days"],
                    ["4", "checkpoints"],
                    ["2", "mock interviews"],
                  ].map(([n, label]) => (
                    <div key={label}>
                      <dt className="sr-only">{label}</dt>
                      <dd>
                        <span className="display block text-3xl text-red-strong nums">{n}</span>
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">{label}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </Appear>
            </div>
          </div>
        </div>
      </section>

      {/* ── What is changing: the red statement band ────────── */}
      <section aria-labelledby="changing-title" className="bg-gradient-to-b from-red to-red-strong text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-14 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <Appear>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/80">What&apos;s changing in this role</p>
            <h2 id="changing-title" className="display mt-3 text-[clamp(1.35rem,2.6vw,2rem)] leading-snug">{track.whatsChanging}</h2>
          </Appear>
          <Appear delay={0.1}>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/80">What you carry over</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {track.carryOver.map((c) => (
                <li key={c} className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold backdrop-blur">+ {c}</li>
              ))}
            </ul>
          </Appear>
        </div>
      </section>

      {/* ── Who it is for · skills ──────────────────────────── */}
      <section aria-labelledby="who-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-6 lg:grid-cols-2">
          <Appear className="card h-full p-8 sm:p-10">
            <Heading id="who-title" eyebrow="Who it is for" title="Built for people like you." />
            <ul className="mt-7 space-y-3">
              {track.whoItsFor.map((w) => (
                <li key={w} className="flex gap-3 rounded-xl bg-surface/60 px-4 py-3 text-[15px] font-semibold">
                  <span aria-hidden="true" className="text-red-strong">→</span>{w}
                </li>
              ))}
            </ul>
          </Appear>
          <Appear delay={0.08} className="card h-full p-8 sm:p-10">
            <Heading eyebrow="Skills covered" title="What you will practise." />
            <ul className="mt-7 flex flex-wrap gap-2">
              {track.skills.map((s) => (
                <li key={s} className="rounded-lg border border-line/40 bg-card px-3.5 py-2 text-sm font-bold shadow-card">{s}</li>
              ))}
            </ul>
          </Appear>
        </div>
      </section>

      {/* ── The 30 days ─────────────────────────────────────── */}
      <section id="curriculum" aria-labelledby="curriculum-title" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="card rounded-slab p-6 sm:p-10 lg:p-14">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <Heading
              id="curriculum-title"
              eyebrow="30-day overview"
              title="Every day, planned."
              intro="Four weekly phases of daily problems, an assessment after each week, and mock interviews on Days 29–30. Open a week to see every day."
            />
            <ButtonLink href={enrolHref} soft arrow className="px-5 py-2.5 text-xs">Enrol now</ButtonLink>
          </div>
          <div className="mt-10"><TrackCurriculum track={track} /></div>
        </div>
      </section>

      {/* ── Checkpoints ─────────────────────────────────────── */}
      <section aria-labelledby="assess-title" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20">
        <Heading id="assess-title" eyebrow="Weekly checkpoints" title="Four checkpoints. Real feedback." intro="Each one is marked on your reasoning, not just the output — and you defend it." />
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {track.weeks.map((w, i) => (
            <li key={w.week}>
              <Appear delay={i * 0.06} className="card flex h-full flex-col p-6">
                <span className="grid size-11 place-items-center rounded-full bg-red-strong text-sm font-extrabold text-white nums">{w.assessment.afterDay}</span>
                <span className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">After Day {w.assessment.afterDay}</span>
                <span className="display mt-1 text-xl leading-tight">{w.assessment.title}</span>
                <span className="mt-2 text-sm leading-relaxed text-muted">{w.assessment.task}</span>
              </Appear>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Outcomes · projects ─────────────────────────────── */}
      <section aria-labelledby="outcomes-title" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="grid gap-6 lg:grid-cols-2">
          <Appear className="card h-full p-8 sm:p-10">
            <Heading id="outcomes-title" eyebrow="Expected outcomes" title="What you will be able to do." />
            <ul className="mt-7 divide-y divide-line/25 border-t border-line/25">
              {track.outcomes.map((o) => (
                <li key={o} className="flex gap-3 py-3.5 text-[15px]"><Check />{o}</li>
              ))}
            </ul>
          </Appear>
          <Appear delay={0.08} className="card h-full p-8 sm:p-10">
            <Heading eyebrow="Role-specific projects" title="Evidence you can show." />
            <ol className="mt-7 space-y-3">
              {track.projects.map((p, i) => (
                <li key={p} className="flex gap-4 rounded-xl bg-surface/60 px-4 py-3.5">
                  <span className="display text-lg text-red-strong nums">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[15px] font-semibold">{p}</span>
                </li>
              ))}
            </ol>
          </Appear>
        </div>
      </section>

      {/* ── Interviews: the dark card ───────────────────────── */}
      <section aria-labelledby="interview-title" className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
        <Appear className="overflow-hidden rounded-slab bg-night text-paper shadow-float">
          <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-[1fr_1.4fr] lg:p-14">
            <div>
              <Heading
                id="interview-title"
                eyebrow="Interview preparation & mock interviews"
                title={`Practise the questions ${track.name} interviews actually ask.`}
                intro="Preparation runs through Week 4. Mock interviews happen on Days 29 and 30, with written feedback."
                light
              />
              <ul className="mt-6 flex flex-wrap gap-2">
                {track.interviewTopics.map((t) => (
                  <li key={t} className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/85">{t}</li>
                ))}
              </ul>
            </div>
            <ul className="space-y-3">
              {track.interviewQuestions.slice(0, 4).map((q) => (
                <li key={q.question} className="rounded-card bg-white/[0.06] p-5">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-red">{q.category}</span>
                  <p className="mt-1.5 text-base font-bold leading-snug">{q.question}</p>
                </li>
              ))}
            </ul>
          </div>
        </Appear>
      </section>

      {/* ── Pricing: the same pair as the landing page ──────── */}
      <Pricing
        ctaHref={enrolHref}
        ctaLabel={`Choose ${track.name}`}
        subtitle={`${track.name} track · cohort starts ${formatDate(cohort.startDate)}. Everything below is included.`}
      />
    </>
  );
}
