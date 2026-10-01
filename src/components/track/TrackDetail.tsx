import Image from "next/image";
import Link from "next/link";
import * as motion from "motion/react-client";
import { tracks } from "@/data/tracks";
import type { Track } from "@/types/program";
import { Appear } from "@/components/motion/Appear";
import { StrikeReveal } from "@/components/motion/StrikeReveal";
import { Pricing } from "@/components/home/Pricing";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { aiConcepts } from "@/data/ai-foundations";
import { trackImages } from "@/data/track-images";
// Photographs used only on the track pages; sources in src/assets/track-page/CREDITS.md.
import teamPhoto from "@/assets/track-page/team-laptop.jpg";
import presentingPhoto from "@/assets/track-page/presenting.jpg";
import { InterviewPrep } from "./InterviewPrep";
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
      <h2 id={id} className="display display-soft mt-3 text-[clamp(1.75rem,3.6vw,2.6rem)] text-balance">{title}</h2>
      {intro && <p className={`mt-3 text-[15px] leading-relaxed ${light ? "text-white/70" : "text-muted"}`}>{intro}</p>}
    </div>
  );
}

export function TrackDetail({ track }: { track: Track }) {
  const number = String(tracks.findIndex((t) => t.slug === track.slug) + 1).padStart(2, "0");
  const enrolHref = `/register?track=${track.slug}`;
  const image = trackImages[track.slug];

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
                  <span className="rounded-full bg-red-tint px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-deep">This job is changing</span>
                </div>
              </Appear>
              <Appear delay={0.08} y={24}>
                <StrikeReveal as="h1" id="track-title" from={track.name} to={track.becomes} delay={0.2} className="mt-5" fromClassName="display display-soft text-[clamp(2.5rem,6vw,4.25rem)]" toClassName="mt-2 text-[clamp(1.1rem,2.2vw,1.5rem)] font-extrabold text-ink" />
              </Appear>
              <Appear delay={0.16}>
                <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base">{track.description}</p>
              </Appear>
              <Appear delay={0.24} className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href={enrolHref} soft arrow>Choose this track</ButtonLink>
                <ButtonLink href="#curriculum" variant="secondary" soft className="border-line hover:bg-ink">See the 30 days</ButtonLink>
              </Appear>
              <Appear delay={0.28}>
                <div className="mt-6 flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs font-extrabold uppercase tracking-[0.14em] text-muted">AI skills</span>
                  {aiConcepts.map((c) => (
                    <Link key={c.name} href="/#ai-foundations" className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-red-tint hover:text-red-deep">
                      {c.name}
                    </Link>
                  ))}
                </div>
              </Appear>
              {!track.contentLive && (
                <Appear delay={0.3}>
                  <p className="mt-6 max-w-xl rounded-card bg-surface/70 px-4 py-3 text-sm text-muted">
                    Registration is open now. The {track.name} course is being finished for this cohort: your place is
                    reserved the moment you register, and we email you when Day 1 opens.
                  </p>
                </Appear>
              )}
            </div>

            {/* This track's own photograph: the same one as its card. */}
            <div className="relative min-h-[18rem] overflow-hidden bg-night lg:min-h-full">
              <Image src={image.src} alt={image.alt} fill sizes="(min-width: 1024px) 45vw, 100vw" placeholder="blur" className="object-cover" priority />
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
                        <span className="display display-soft block text-3xl text-red-strong nums">{n}</span>
                        <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted">{label}</span>
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
      <section aria-labelledby="changing-title" className="bg-linear-to-b from-red to-red-press text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-14 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <Appear>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/80">What&apos;s changing in this role</p>
            <h2 id="changing-title" className="mt-3 text-[clamp(1.15rem,2vw,1.5rem)] leading-snug font-semibold tracking-tight">{track.whatsChanging}</h2>
          </Appear>
          <Appear delay={0.1}>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/80">What you carry over</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {track.carryOver.map((c) => (
                <li key={c} className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium backdrop-blur">+ {c}</li>
              ))}
            </ul>
          </Appear>
        </div>
      </section>

      {/* ── Who it is for · skills: on the page ground, beside the cohort ── */}
      <section aria-labelledby="who-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Appear><Heading id="who-title" eyebrow="Who it is for" title="Built for people like you." /></Appear>
            <ul className="mt-7 divide-y divide-line/25 border-y border-line/25">
              {track.whoItsFor.map((w, i) => (
                <li key={w}>
                  <Appear delay={0.06 * i} y={8} className="flex items-center gap-3 py-3.5 text-[15px] font-medium">
                    <span aria-hidden="true" className="text-red-strong">→</span>{w}
                  </Appear>
                </li>
              ))}
            </ul>

            <Appear delay={0.1} className="mt-10">
              <Eyebrow>Skills covered</Eyebrow>
              <h3 className="mt-2 text-xl font-bold">What you will practise.</h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {track.skills.map((sk) => (
                  <li key={sk} className="rounded-full border border-line/40 bg-card/70 px-3.5 py-1.5 text-sm font-medium transition-colors hover:border-red-strong/50">{sk}</li>
                ))}
              </ul>
            </Appear>
          </div>

          <Appear delay={0.15} y={24} className="relative">
            <span aria-hidden="true" className="absolute -right-3 -bottom-3 hidden h-full w-full rounded-slab bg-red-tint lg:block" />
            <Image
              src={teamPhoto}
              alt="A team gathered around a laptop, talking through a piece of work"
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="relative aspect-[4/3] w-full rounded-slab object-cover shadow-float"
            />
          </Appear>
        </div>
      </section>

      {/* ── The 30 days ─────────────────────────────────────── */}
      <section id="curriculum" aria-labelledby="curriculum-title" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-16 sm:px-6 sm:pb-20">
        {/* No backing card: the week cards sit straight on the page. */}
        <div>
          <Appear className="flex flex-wrap items-end justify-between gap-6">
            <Heading
              id="curriculum-title"
              eyebrow="30-day overview"
              title="Every day, planned."
              intro="Four weekly phases of daily problems, an assessment after each week, and mock interviews on Days 29–30. Open a week to see every day."
            />
            <ButtonLink href={enrolHref} soft arrow className="px-5 py-2.5 text-xs">Enroll now</ButtonLink>
          </Appear>
          <div className="mt-10"><TrackCurriculum track={track} /></div>
        </div>
      </section>

      {/* ── Checkpoints: a timeline on the page, no boxes ───── */}
      <section aria-labelledby="assess-title" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24">
        <Appear>
          <Heading id="assess-title" eyebrow="Weekly checkpoints" title="Four checkpoints. Real feedback." intro="Each one is marked on your reasoning, not just the output: and you defend it." />
        </Appear>
        <ol className="relative mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* The rail the four checkpoints sit on; it draws itself across once in view. */}
          <motion.span
            aria-hidden="true"
            className="absolute top-[1.375rem] right-[12.5%] left-[12.5%] hidden h-0.5 origin-left bg-red/20 lg:block"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.1, ease: [0.2, 0.7, 0.3, 1] }}
          />
          {track.weeks.map((w, i) => (
            <li key={w.week} className="relative flex flex-col lg:items-center lg:text-center">
              <Appear delay={0.2 + i * 0.15} y={10} className="flex flex-col lg:items-center">
                <span className="grid size-11 place-items-center rounded-full bg-red-strong text-sm font-bold text-white ring-8 ring-paper nums">{w.assessment.afterDay}</span>
                <span className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-muted">After Day {w.assessment.afterDay}</span>
                <span className="mt-1 text-lg font-bold leading-tight">{w.assessment.title}</span>
                <span className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{w.assessment.task}</span>
              </Appear>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Outcomes · projects: on the page, beside the desk ── */}
      <section aria-labelledby="outcomes-title" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Appear y={24} className="order-last lg:order-first">
            <div className="relative">
              <span aria-hidden="true" className="absolute -bottom-3 -left-3 hidden h-full w-full rounded-slab bg-red-tint lg:block" />
              <Image
                src={presentingPhoto}
                alt="A woman presenting her work to colleagues in a meeting room"
                sizes="(min-width: 1024px) 40vw, 90vw"
                className="relative aspect-[4/3] w-full rounded-slab object-cover object-[70%_50%] shadow-float"
              />
            </div>
          </Appear>
          <div>
            <Appear><Heading id="outcomes-title" eyebrow="Expected outcomes" title="What you will be able to do." /></Appear>
            <ul className="mt-6 divide-y divide-line/25 border-y border-line/25">
              {track.outcomes.map((o, i) => (
                <li key={o}>
                  <Appear delay={0.05 * i} y={8} className="flex gap-3 py-3 text-[15px]"><Check />{o}</Appear>
                </li>
              ))}
            </ul>

            <Appear delay={0.1} className="mt-10">
              <Eyebrow>Role-specific projects</Eyebrow>
              <h3 className="mt-2 text-xl font-bold">Evidence you can show.</h3>
              <ol className="mt-4 space-y-3">
                {track.projects.map((pr, i) => (
                  <li key={pr} className="flex items-baseline gap-4">
                    <span className="text-sm font-bold text-red-strong nums">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-[15px] font-medium">{pr}</span>
                  </li>
                ))}
              </ol>
            </Appear>
          </div>
        </div>
      </section>

      {/* ── Interviews: questions to practise, and what good looks like ── */}
      <section aria-labelledby="interview-title" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24">
        <InterviewPrep track={track} enrolHref={enrolHref} />
      </section>

      {/* ── Pricing: the same pair as the landing page ──────── */}
      <Pricing track={track} />
    </>
  );
}
