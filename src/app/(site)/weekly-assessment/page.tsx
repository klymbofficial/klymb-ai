import type { Metadata } from "next";
import clsx from "clsx";
import Link from "next/link";
import { TrackSwitcher } from "@/components/learn/TrackSwitcher";
import { WorkSubmission } from "@/components/learn/WorkSubmission";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Tag } from "@/components/ui/Tag";
import { assessmentRubric } from "@/data/demo";
import { resolveTrack } from "@/lib/learn";

export const metadata: Metadata = { title: "Weekly Assessment (Demo)", robots: { index: false } };

export default async function WeeklyAssessmentPage({ searchParams }: { searchParams: Promise<{ track?: string; week?: string }> }) {
  const sp = await searchParams;
  const track = resolveTrack(sp.track);
  const week = track.weeks.find((w) => w.week === Number(sp.week)) ?? track.weeks[0];

  return (
    <>
      <DemoNotice>No scoring yet</DemoNotice>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <TrackSwitcher basePath="/weekly-assessment" current={track.slug} extra={`&week=${week.week}`} />
        <nav aria-label="Weeks" className="mt-6 flex gap-2">
          {track.weeks.map((w) => (
            <Link key={w.week} href={`/weekly-assessment?track=${track.slug}&week=${w.week}`} aria-current={w.week === week.week ? "page" : undefined}
              className={clsx("border-2 px-3 py-1.5 text-sm font-bold", w.week === week.week ? "border-red-strong bg-red-strong text-white" : "border-line hover:border-ink")}>
              Week {w.week}
            </Link>
          ))}
        </nav>

        <div className="mt-10 flex flex-wrap gap-2"><Tag tone="red">After Day {week.assessment.afterDay}</Tag><Tag>{track.name}</Tag></div>
        <Eyebrow className="mt-6">Week {week.week} assessment · {week.title}</Eyebrow>
        <h1 className="display mt-3 text-5xl text-balance">{week.assessment.title}</h1>
        <p className="mt-5 text-xl font-semibold">{week.assessment.task}</p>
        <p className="mt-2 text-muted">Format: {week.assessment.format}</p>

        <section aria-labelledby="covers-title" className="mt-10">
          <h2 id="covers-title" className="display text-2xl">What this assessment covers</h2>
          <ul className="mt-4 grid gap-0.5 border-2 border-line bg-line sm:grid-cols-2">
            {week.challenges.map((c) => <li key={c.day} className="bg-paper p-4"><span className="text-sm font-extrabold text-muted">Day {c.day}</span> <span className="font-semibold">{c.title}</span></li>)}
          </ul>
        </section>

        <section aria-labelledby="rubric-title" className="mt-10">
          <h2 id="rubric-title" className="display text-2xl">How it will be scored</h2>
          <div className="mt-4 overflow-x-auto border-2 border-line">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-ink text-paper"><tr><th scope="col" className="p-3">Criterion</th><th scope="col" className="p-3">What reviewers look for</th></tr></thead>
              <tbody>
                {assessmentRubric.map((r) => <tr key={r.criterion} className="border-t-2 border-line"><th scope="row" className="p-3 font-extrabold">{r.criterion}</th><td className="p-3">{r.description}</td></tr>)}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm text-muted">Placeholder rubric. Final weighting and pass marks are to be confirmed.</p>
        </section>

        <div className="mt-10">
          {/* TODO(Assessment scoring): submit to reviewers and return a score with feedback. */}
          <WorkSubmission label="Your submission" submitLabel="Submit for review" />
        </div>
      </div>
    </>
  );
}
