import Link from "next/link";
import { Stat } from "@/components/company/OrgPanels";
import { BarChart, ChartLegend, ChartPanel, CHART_COLOR, ProgressRing, StackedBar } from "@/components/company/OrgCharts";
import type { MemberProgress } from "@/lib/company/progress-data";
import { summariseProgress, type ProgressCounts } from "@/lib/company/progress-summary";

// Lesson states are exclusive. Final attempts and personal access can overlap them.
const lessonItems = (c: ProgressCounts) => [
  { label: "No recorded activity", value: c.accessNoActivity, color: CHART_COLOR.slate },
  { label: "Activity, no lessons passed", value: c.activityNoLessons, color: CHART_COLOR.amber },
  { label: "In progress", value: c.inProgress, color: CHART_COLOR.blue },
  { label: "All lessons passed", value: c.allLessonsPassed, color: CHART_COLOR.green },
];

/** Uses only the rows already scoped by loadProgress to this viewer. */
export function LearningSummary({ rows, totalLessons, teamsHref, compact = false }: { rows: MemberProgress[]; totalLessons: number; teamsHref?: string; compact?: boolean }) {
  const { total: c, byTeam } = summariseProgress(rows, totalLessons);
  const lessons = lessonItems(c);
  return (
    <section aria-label="Upskill summary" className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Company assigned" value={c.assigned} note={`of ${c.people} people`} />
        <Stat label="In progress" value={c.inProgress} note="Some lessons passed" />
        <Stat label="All lessons passed" value={c.allLessonsPassed} note={`${totalLessons} lessons in the course`} />
        <Stat label="Final attempted" value={c.finalAttempted} note="Separate from lesson progress" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <ChartPanel title="Lesson progress" note={`System Design · ${c.withAccess} people`}>
          {c.withAccess > 0 ? <BarChart items={lessons} label="People by lesson status" total={c.withAccess} /> : (
            <p className="rounded-md border border-dashed border-line/40 p-6 text-sm text-muted">No course activity to show yet.</p>
          )}
        </ChartPanel>
        <ChartPanel title="Assignment coverage" note="Company assignments across this view">
          <div className="flex flex-wrap items-center justify-center gap-6 py-1">
            <ProgressRing value={c.assigned} total={c.people} label="assigned" />
            <dl className="space-y-4 text-sm">
              <div><dt className="text-muted">Assigned</dt><dd className="text-2xl font-bold tabular-nums">{c.assigned}</dd></div>
              <div><dt className="text-muted">Not assigned</dt><dd className="text-2xl font-bold tabular-nums">{c.people - c.assigned}</dd></div>
            </dl>
          </div>
          {c.ownAccess > 0 && <p className="mt-4 border-t border-line/20 pt-3 text-sm text-muted">{c.ownAccess} {c.ownAccess === 1 ? "person holds" : "people hold"} personal access. Counted separately.</p>}
        </ChartPanel>
      </div>
      {!compact && byTeam.length > 1 && (
        <ChartPanel title="Progress by team" note="Share of people in each lesson state" action={teamsHref && <Link href={teamsHref} className="text-sm font-semibold underline underline-offset-4">Manage teams</Link>}>
          <div className="space-y-5">
            {byTeam.map((team) => (
              <div key={team.team ?? "__none"}>
                <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
                  <h3 className="font-semibold">{team.label}</h3>
                  <span className="text-muted">{team.counts.people} people · {team.counts.allLessonsPassed} all lessons passed</span>
                </div>
                <StackedBar label={team.label} items={[...lessonItems(team.counts), { label: "Not assigned / private", value: team.counts.noAccess, color: CHART_COLOR.light }]} />
              </div>
            ))}
          </div>
          <ChartLegend items={[...lessons, { label: "Not assigned / private", value: c.noAccess, color: CHART_COLOR.light }]} />
        </ChartPanel>
      )}
      <details className="text-sm text-muted">
        <summary className="w-fit cursor-pointer font-semibold underline-offset-4 hover:underline">About these numbers</summary>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Activity is recorded under each work email and may predate the assignment. It does not measure improvement caused by the program.</li>
          <li>No recorded activity means none under that email; someone may have used another account.</li>
          <li>The lesson chart includes company assignments and your own course access. Other people&apos;s personal course progress stays private.</li>
          <li>Personal access may overlap company assignments. Final attempts are counted separately and do not mean the assessment was passed.</li>
        </ul>
      </details>
    </section>
  );
}
