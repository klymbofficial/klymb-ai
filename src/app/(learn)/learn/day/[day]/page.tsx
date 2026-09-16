import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DaySubmission } from "@/components/learner/DaySubmission";
import { Appear } from "@/components/motion/Appear";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Tag } from "@/components/ui/Tag";
import { assessmentRubric, dailyChecklist } from "@/data/demo";
import { mockInterviewPhase, weekPhases } from "@/data/program";
import { getTrack } from "@/data/tracks";
import { thirtyDays } from "@/lib/learn";
import { requireLearner } from "@/lib/learner/data";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function LearnDayPage({ params }: { params: Promise<{ day: string }> }) {
  const state = await requireLearner();
  if (state.state === "not-enrolled") notFound();

  const dayNumber = Number((await params).day);
  const track = getTrack(state.learner.track)!;
  const days = thirtyDays(track);
  const entry = days.find((d) => d.day === dayNumber);
  if (!entry) notFound();

  const submission = state.submissions.find((s) => s.day === dayNumber) ?? null;
  const week = entry.kind === "interview" ? null : track.weeks.find((w) => w.week === entry.week)!;
  const phase = week ? weekPhases.find((p) => p.week === week.week)! : null;
  const prev = days.find((d) => d.day === dayNumber - 1);
  const next = days.find((d) => d.day === dayNumber + 1);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/learn" className="text-sm font-bold underline underline-offset-4 hover:text-red-deep">← All 30 days</Link>

      <Appear className="mt-6">
        <div className="flex flex-wrap gap-2">
          <Tag tone="red">Day {entry.day} of 30</Tag>
          {phase && <Tag>Week {week!.week} · {phase.name}</Tag>}
          {submission && <Tag tone="ink">Submitted</Tag>}
        </div>

        {entry.kind === "challenge" && (
          <>
            <Eyebrow className="mt-6">{track.name} · {week!.title}</Eyebrow>
            <h1 className="display mt-3 text-4xl text-balance sm:text-5xl">{entry.challenge.title}</h1>
            <div className="mt-6 border-2 border-line bg-paper p-5">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">The workplace problem</p>
              <p className="mt-2 text-lg font-semibold">{entry.challenge.problem}</p>
              <p className="mt-4 text-sm text-muted">
                Builds towards <strong className="text-ink">{week!.assessment.title}</strong> on Day {week!.assessment.afterDay}.
              </p>
            </div>
          </>
        )}

        {entry.kind === "assessment" && (
          <>
            <Eyebrow className="mt-6">Week {entry.week} assessment</Eyebrow>
            <h1 className="display mt-3 text-4xl text-balance sm:text-5xl">{entry.title}</h1>
            <p className="mt-5 text-lg font-semibold">{entry.task}</p>
            <div className="mt-6 overflow-x-auto border-2 border-line bg-paper">
              <table className="w-full min-w-[420px] text-left text-sm">
                <caption className="border-b-2 border-line bg-surface p-3 text-left text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">
                  How it is scored
                </caption>
                <tbody>
                  {assessmentRubric.map((r) => (
                    <tr key={r.criterion} className="border-b border-line last:border-0">
                      <th scope="row" className="p-3 font-extrabold">{r.criterion}</th>
                      <td className="p-3 text-muted">{r.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {entry.kind === "interview" && (
          <>
            <Eyebrow className="mt-6">{mockInterviewPhase.days}</Eyebrow>
            <h1 className="display mt-3 text-4xl text-balance sm:text-5xl">
              {entry.day === 29 ? "Mock interview: technical & scenario" : "Mock interview: behavioural & portfolio"}
            </h1>
            <p className="mt-5 text-muted">{mockInterviewPhase.summary}</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {track.interviewTopics.map((t) => <li key={t} className="border-2 border-ink px-3 py-1.5 text-sm font-bold">{t}</li>)}
            </ul>
          </>
        )}
      </Appear>

      <Appear delay={0.05} className="mt-8">
        <DaySubmission
          day={entry.day}
          checklist={entry.kind === "challenge" ? dailyChecklist : undefined}
          submission={submission}
        />
      </Appear>

      <nav aria-label="Other days" className="mt-8 flex justify-between gap-4 border-t-2 border-line pt-6 font-bold">
        {prev ? <Link href={`/learn/day/${prev.day}`} className="hover:text-red-deep">← Day {prev.day}</Link> : <span />}
        {next ? <Link href={`/learn/day/${next.day}`} className="hover:text-red-deep">Day {next.day} →</Link> : <span />}
      </nav>
    </div>
  );
}
