import { cohort, pricing } from "@/data/config";
import { formatDate, formatINR } from "@/lib/format";
import type { Track } from "@/types/program";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Tag } from "@/components/ui/Tag";
import { TrackCurriculum } from "./TrackCurriculum";

function Block({ id, children, className = "" }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={`border-b-2 border-line py-14 sm:py-16 ${className}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">{children}</div>
    </section>
  );
}

function List({ items, marker = "✓" }: { items: string[]; marker?: string }) {
  return (
    <ul className="border-t-2 border-line">
      {items.map((i) => (
        <li key={i} className="flex gap-3 border-b-2 border-line py-3.5">
          <span aria-hidden="true" className="font-black text-red-deep">{marker}</span>
          <span className="font-semibold">{i}</span>
        </li>
      ))}
    </ul>
  );
}

export function TrackDetail({ track }: { track: Track }) {
  return (
    <>
      <header className="border-b-2 border-line">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-[1.4fr_1fr]">
          <div className="px-4 py-14 sm:px-6 sm:py-20">
            <div className="flex flex-wrap gap-2">
              <Tag tone="red">Career track</Tag>
              <Tag>30 days · 4 assessments · mock interviews</Tag>
            </div>
            <h1 className="display mt-6 text-[clamp(2.75rem,7vw,5.5rem)]">
              {track.name}
              <span className="block text-red">→ {track.becomes}</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted">{track.description}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={`/register?track=${track.slug}`} arrow>Choose This Track</ButtonLink>
              <ButtonLink href="#curriculum" variant="secondary">See the 30 days</ButtonLink>
            </div>
          </div>
          <div className="border-t-2 border-line bg-surface px-4 py-10 sm:px-6 lg:border-t-0 lg:border-l-2">
            <Eyebrow>What&apos;s changing in this role</Eyebrow>
            <p className="mt-3 text-lg">{track.whatsChanging}</p>
            <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.14em] text-muted">What you carry over</p>
            <ul className="mt-2 space-y-2">
              {track.carryOver.map((c) => <li key={c} className="font-semibold">+ {c}</li>)}
            </ul>
          </div>
        </div>
      </header>

      <Block id="who-title">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeader id="who-title" eyebrow="Who it is for" title="Built for people like you." />
            <div className="mt-8"><List items={track.whoItsFor} marker="→" /></div>
          </div>
          <div>
            <SectionHeader eyebrow="Skills covered" title="What you will practise." />
            <ul className="mt-8 flex flex-wrap gap-2">
              {track.skills.map((s) => <li key={s} className="border-2 border-ink px-3 py-2 font-bold">{s}</li>)}
            </ul>
          </div>
        </div>
      </Block>

      <Block id="curriculum-title" className="bg-surface">
        <div id="curriculum" className="scroll-mt-24">
          <SectionHeader id="curriculum-title" eyebrow="30-day overview" title="Every day, planned." intro="Four weekly phases of daily problems, an assessment after each week, and mock interviews on Days 29–30. Open a week to see what is covered." />
          <div className="mt-10"><TrackCurriculum track={track} /></div>
        </div>
      </Block>

      <Block id="assess-title">
        <SectionHeader id="assess-title" eyebrow="Weekly assessment previews" title="Four checkpoints. Real feedback." />
        <ol className="mt-10 grid gap-0.5 border-2 border-line bg-line md:grid-cols-2 lg:grid-cols-4">
          {track.weeks.map((w) => (
            <li key={w.week} className="flex flex-col gap-2 bg-paper p-6">
              <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">After Day {w.assessment.afterDay}</span>
              <span className="display text-2xl">{w.assessment.title}</span>
              <span className="text-sm">{w.assessment.task}</span>
            </li>
          ))}
        </ol>
      </Block>

      <Block id="outcomes-title">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeader id="outcomes-title" eyebrow="Expected outcomes" title="What you will be able to do." />
            <div className="mt-8"><List items={track.outcomes} /></div>
          </div>
          <div>
            <SectionHeader eyebrow="Role-specific projects" title="Evidence you can show." />
            <div className="mt-8"><List items={track.projects} marker="■" /></div>
          </div>
        </div>
      </Block>

      <Block id="interview-title" className="bg-ink text-paper">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <Eyebrow tone="light">Interview preparation & mock interviews</Eyebrow>
            <h2 id="interview-title" className="display mt-3 text-4xl sm:text-5xl">Practise the questions {track.name} interviews actually ask.</h2>
            <p className="mt-4 text-white/75">Preparation runs through Week 4. Mock interviews happen on Days 29 and 30, with written feedback.</p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {track.interviewTopics.map((t) => <li key={t} className="border border-white/40 px-2.5 py-1 text-sm font-semibold">{t}</li>)}
            </ul>
          </div>
          <ul className="border-t border-white/25">
            {track.interviewQuestions.slice(0, 4).map((q) => (
              <li key={q.question} className="border-b border-white/25 py-5">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-red">{q.category}</span>
                <p className="mt-1 text-lg font-bold">{q.question}</p>
              </li>
            ))}
          </ul>
        </div>
      </Block>

      <section aria-label="Pricing" className="bg-red-strong text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-6 px-4 py-14 sm:px-6">
          <div>
            <Eyebrow tone="light">{pricing.programName} · {track.name}</Eyebrow>
            <p className="display mt-2 text-6xl">{formatINR(pricing.launchPrice)}</p>
            <p className="mt-2 text-sm text-white/90">Cohort starts {formatDate(cohort.startDate)}. {cohort.capacityReason}</p>
          </div>
          <ButtonLink href={`/register?track=${track.slug}`} variant="inverse" arrow>Choose This Track</ButtonLink>
        </div>
      </section>
    </>
  );
}
