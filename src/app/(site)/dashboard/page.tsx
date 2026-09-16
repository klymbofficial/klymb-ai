import type { Metadata } from "next";
import clsx from "clsx";
import Link from "next/link";
import { ProgressBar } from "@/components/learn/ProgressBar";
import { TrackSwitcher } from "@/components/learn/TrackSwitcher";
import { ButtonLink } from "@/components/ui/Button";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { demoLearner } from "@/data/demo";
import { resolveTrack, thirtyDays } from "@/lib/learn";

export const metadata: Metadata = { title: "Learner Dashboard (Demo)", robots: { index: false } };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  const track = resolveTrack((await searchParams).track);
  const days = thirtyDays(track);
  const today = days.find((d) => d.day === demoLearner.currentDay)!;
  const done = new Set(demoLearner.completedDays);
  const assessmentsDone = demoLearner.assessments.length;

  return (
    <>
      <DemoNotice />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow>Learner dashboard · {track.name}</Eyebrow>
            <h1 className="display mt-3 text-5xl">Day {demoLearner.currentDay} of 30</h1>
          </div>
          <TrackSwitcher basePath="/dashboard" current={track.slug} />
        </div>

        <div className="mt-10 grid gap-0.5 border-2 border-line bg-line lg:grid-cols-3">
          <div className="bg-paper p-6 lg:col-span-2">
            <Eyebrow tone="muted">Up next</Eyebrow>
            {today.kind === "challenge" && (
              <>
                <p className="display mt-2 text-3xl">{today.challenge.title}</p>
                <p className="mt-2 text-muted">{today.challenge.problem}</p>
              </>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href={`/daily-challenge?track=${track.slug}&day=${demoLearner.currentDay}`} arrow>Open today&apos;s challenge</ButtonLink>
              <ButtonLink href={`/tracks/${track.slug}#curriculum`} variant="secondary">Full curriculum</ButtonLink>
            </div>
          </div>
          <div className="flex flex-col gap-6 bg-paper p-6">
            <ProgressBar label="Days complete" value={done.size} max={30} />
            <ProgressBar label="Assessments submitted" value={assessmentsDone} max={4} />
            <ProgressBar label="Mock interviews" value={0} max={2} />
          </div>
        </div>

        <section aria-labelledby="calendar-title" className="mt-10">
          <h2 id="calendar-title" className="display text-3xl">Your 30 days</h2>
          <ol className="mt-5 grid grid-cols-5 gap-0.5 border-2 border-line bg-line sm:grid-cols-10">
            {days.map((d) => {
              const isDone = done.has(d.day);
              const isToday = d.day === demoLearner.currentDay;
              const href =
                d.kind === "challenge" ? `/daily-challenge?track=${track.slug}&day=${d.day}`
                : d.kind === "assessment" ? `/weekly-assessment?track=${track.slug}&week=${d.week}`
                : `/mock-interview?track=${track.slug}`;
              const label = d.kind === "challenge" ? d.challenge.title : d.kind === "assessment" ? `Assessment: ${d.title}` : "Mock interview";
              return (
                <li key={d.day}>
                  <Link
                    href={href}
                    title={label}
                    aria-label={`Day ${d.day}: ${label}${isDone ? " (complete)" : isToday ? " (today)" : ""}`}
                    className={clsx(
                      "flex aspect-square flex-col items-center justify-center text-sm font-extrabold",
                      isDone ? "bg-ink text-paper" : isToday ? "bg-red-strong text-white" : "bg-paper hover:bg-red-tint",
                    )}
                  >
                    {d.day}
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">
                      {d.kind === "assessment" ? "Test" : d.kind === "interview" ? "Mock" : isDone ? "Done" : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="scores-title" className="mt-10">
          <h2 id="scores-title" className="display text-3xl">Assessments & feedback</h2>
          <ul className="mt-5 border-t-2 border-line">
            {track.weeks.map((w) => {
              const result = demoLearner.assessments.find((a) => a.afterDay === w.assessment.afterDay);
              return (
                <li key={w.week} className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-line py-4">
                  <span><span className="font-extrabold">Week {w.week}: {w.assessment.title}</span> <span className="text-muted">· after Day {w.assessment.afterDay}</span></span>
                  <span className={clsx("text-sm font-bold", result ? "text-red-deep" : "text-muted")}>{result ? result.status : "Not yet open"}</span>
                </li>
              );
            })}
          </ul>
          {/* TODO(Assessment scoring): show real scores and reviewer feedback. */}
        </section>
      </div>
    </>
  );
}
