import type { Metadata } from "next";
import Link from "next/link";
import { TrackSwitcher } from "@/components/learn/TrackSwitcher";
import { WorkSubmission } from "@/components/learn/WorkSubmission";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Tag } from "@/components/ui/Tag";
import { dailyChecklist, demoLearner } from "@/data/demo";
import { weekPhases } from "@/data/program";
import { resolveTrack, thirtyDays } from "@/lib/learn";

export const metadata: Metadata = { title: "Daily Challenge (Demo)", robots: { index: false } };

export default async function DailyChallengePage({ searchParams }: { searchParams: Promise<{ track?: string; day?: string }> }) {
  const sp = await searchParams;
  const track = resolveTrack(sp.track);
  const days = thirtyDays(track);
  const challengeDays = days.filter((d) => d.kind === "challenge");
  const requested = Number(sp.day) || demoLearner.currentDay;
  const entry = challengeDays.find((d) => d.day === requested) ?? challengeDays.find((d) => d.day === demoLearner.currentDay)!;
  if (entry.kind !== "challenge") return null;
  const idx = challengeDays.indexOf(entry);
  const prev = challengeDays[idx - 1];
  const next = challengeDays[idx + 1];
  const week = track.weeks.find((w) => w.week === entry.week)!;
  const phase = weekPhases.find((p) => p.week === entry.week)!;

  return (
    <>
      <DemoNotice>Submissions are not saved</DemoNotice>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <TrackSwitcher basePath="/daily-challenge" current={track.slug} extra={`&day=${entry.day}`} />
        <div className="mt-10 flex flex-wrap gap-2">
          <Tag tone="red">Day {entry.day} of 30</Tag>
          <Tag>Week {entry.week} · {phase.name}</Tag>
        </div>
        <Eyebrow className="mt-6">{track.name} · {week.title}</Eyebrow>
        <h1 className="display mt-3 text-5xl text-balance">{entry.challenge.title}</h1>

        <div className="mt-8 grid gap-0.5 border-2 border-line bg-line md:grid-cols-2">
          <div className="bg-paper p-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">The workplace problem</p>
            <p className="mt-2 text-lg font-semibold">{entry.challenge.problem}</p>
          </div>
          <div className="bg-paper p-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Why it matters this week</p>
            <p className="mt-2">{week.focus}</p>
            <p className="mt-3 text-sm text-muted">Builds towards: <strong className="text-ink">{week.assessment.title}</strong> (Day {week.assessment.afterDay})</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">Full problem brief, files and sample data will be provided in the live program.</p>

        <div className="mt-8"><WorkSubmission label="Your solution" checklist={dailyChecklist} submitLabel="Mark day complete" /></div>

        <nav aria-label="Other days" className="mt-8 flex justify-between gap-4 border-t-2 border-line pt-6 font-bold">
          {prev ? <Link href={`/daily-challenge?track=${track.slug}&day=${prev.day}`} className="hover:text-red-deep">← Day {prev.day}</Link> : <span />}
          {next ? <Link href={`/daily-challenge?track=${track.slug}&day=${next.day}`} className="hover:text-red-deep">Day {next.day} →</Link> : <span />}
        </nav>
      </div>
    </>
  );
}
