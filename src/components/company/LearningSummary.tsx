import Link from "next/link";
import { Stat } from "@/components/company/OrgPanels";
import type { MemberProgress } from "@/lib/company/progress-data";
import { summariseProgress, type TeamProgressSummary } from "@/lib/company/progress-summary";

/**
 * HR's summary of System Design across the company, above the assignment bar
 * and the people table. Every number and every group comes from
 * summariseProgress (src/lib/company/progress-summary.ts); this file only lays
 * them out. It reads the rows loadProgress already scoped to the signed-in HR
 * person, and no URL, form or client value decides who is counted.
 * Server-rendered, no state.
 *
 * Progress state and the final assessment stay separate: the four progress
 * groups are about lessons only, and "Final assessment attempted" is its own
 * count, never part of them. Own paid access is shown apart from Assigned.
 */

const th = "px-3 py-2 text-left text-xs font-extrabold uppercase tracking-[0.1em] text-muted";
const thNum = "px-3 py-2 text-right text-xs font-extrabold uppercase tracking-[0.1em] text-muted";

/** Own paid access sits apart (dashed, like the page's empty states) so it is never read as part of Assigned. */
function SeparateTile({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="border-2 border-dashed border-line/40 p-5">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="display mt-2 text-3xl">{value}</p>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </div>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function LearningSummary({ rows, totalLessons, teamsHref }: { rows: MemberProgress[]; totalLessons: number; teamsHref: string }) {
  const { total: c, byTeam } = summariseProgress(rows, totalLessons);

  return (
    <section aria-labelledby="summary-title" className="flex flex-col gap-8">
      <div>
        <h2 id="summary-title" className="display text-2xl">System Design at a glance</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          A head count of what Klymb has recorded for the {plural(c.people, "person", "people")} in your company, under their work emails.
        </p>
      </div>

      {/* Who can open the course. */}
      <section aria-labelledby="access-title">
        <h3 id="access-title" className="text-sm font-extrabold uppercase tracking-[0.14em] text-muted">Course access</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <Stat label="Assigned by your company" value={c.assigned} note="HR assigned System Design and hasn't taken it back" />
          <SeparateTile label="Own paid access" value={c.ownAccess} note="Bought it themselves. Counted apart from Assigned; someone with both is in both." />
          <Stat label="No course access" value={c.noAccess} note="Can't open the course yet" />
        </div>
      </section>

      {/* Where people with access are on lessons, then the final assessment on its own. */}
      <section aria-labelledby="activity-title">
        <h3 id="activity-title" className="text-sm font-extrabold uppercase tracking-[0.14em] text-muted">What is recorded for people with access</h3>
        {c.withAccess === 0 ? (
          <p className="mt-3 border-2 border-dashed border-line/40 p-5 text-sm text-muted">
            Nobody has the course yet, so there is nothing to count here. Assign it below and what people do will appear.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">{plural(c.withAccess, "person has", "people have")} access. On lessons, each of them is in exactly one of these four.</p>
            <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat label="Access, no recorded activity" value={c.accessNoActivity} />
              <Stat label="Activity recorded, no lessons passed" value={c.activityNoLessons} />
              <Stat label="In progress" value={c.inProgress} />
              <Stat label="All lessons passed" value={c.allLessonsPassed} />
            </div>
            <div className="mt-4 max-w-sm">
              <Stat label="Final assessment attempted" value={c.finalAttempted} note="Counted on its own: it doesn't change anyone's lesson status. Scores are in the table below and aren't judged here." />
            </div>
          </>
        )}
      </section>

      <TeamRollupSection teams={byTeam} teamsHref={teamsHref} />

      <div className="border-l-4 border-line/40 pl-4">
        <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-muted">How to read these counts</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>They come from what Klymb has recorded in System Design under each work email, and they are live.</li>
          <li>Recorded activity can predate your company&apos;s assignment. A count here doesn&apos;t show that the assignment led to it.</li>
          <li>&ldquo;No recorded activity&rdquo; means nothing is recorded under that email. The person may have used another one.</li>
        </ul>
      </div>
    </section>
  );
}

/** The same counts per team. A table once it fits (desktop width), a card per team on phones and tablets; only one is shown at a time. */
function TeamRollupSection({ teams, teamsHref }: { teams: TeamProgressSummary[]; teamsHref: string }) {
  if (teams.length < 2) {
    return (
      <section aria-labelledby="team-title">
        <h3 id="team-title" className="text-sm font-extrabold uppercase tracking-[0.14em] text-muted">By team</h3>
        <p className="mt-3 text-sm text-muted">
          There is one group so far, so a roll-up would repeat the numbers above. Once people are on teams, each team appears here.{" "}
          <Link href={teamsHref} className="font-semibold text-ink underline underline-offset-2">Go to Teams</Link>
        </p>
      </section>
    );
  }
  return (
    <section aria-labelledby="team-title">
      <h3 id="team-title" className="text-sm font-extrabold uppercase tracking-[0.14em] text-muted">By team</h3>

      <div className="card mt-3 hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[44rem] text-sm">
          <caption className="sr-only">System Design counts by team</caption>
          <thead>
            <tr className="border-b border-line/15">
              <th scope="col" rowSpan={2} className={th}>Team</th>
              <th scope="col" rowSpan={2} className={thNum}>People</th>
              <th scope="colgroup" colSpan={3} className={`${th} border-l border-line/15 text-center`}>Course access</th>
              <th scope="colgroup" colSpan={4} className={`${th} border-l border-line/15 text-center`}>People with access: lessons</th>
              <th scope="col" rowSpan={2} className={`${thNum} border-l border-line/15`}>Final attempted</th>
            </tr>
            <tr className="border-b border-line/25">
              <th scope="col" className={`${thNum} border-l border-line/15`}>Assigned</th>
              <th scope="col" className={thNum}>Own paid</th>
              <th scope="col" className={thNum}>None</th>
              <th scope="col" className={`${thNum} border-l border-line/15`}>No activity</th>
              <th scope="col" className={thNum}>None passed</th>
              <th scope="col" className={thNum}>In progress</th>
              <th scope="col" className={thNum}>All passed</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.team ?? "__none"} className="border-b border-line/15 last:border-0">
                <th scope="row" className="px-3 py-3 text-left font-semibold">{t.label}</th>
                <Num n={t.counts.people} />
                <Num n={t.counts.assigned} edge />
                <Num n={t.counts.ownAccess} />
                <Num n={t.counts.noAccess} />
                <Num n={t.counts.accessNoActivity} edge />
                <Num n={t.counts.activityNoLessons} />
                <Num n={t.counts.inProgress} />
                <Num n={t.counts.allLessonsPassed} />
                <Num n={t.counts.finalAttempted} edge />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:hidden">
        {teams.map((t) => (
          <li key={t.team ?? "__none"} className="card p-4">
            <h4 className="font-semibold">{t.label} <span className="font-normal text-muted">· {plural(t.counts.people, "person", "people")}</span></h4>
            <CardGroup title="Course access" items={[["Assigned", t.counts.assigned], ["Own paid access", t.counts.ownAccess], ["No access", t.counts.noAccess]]} />
            <CardGroup title="People with access: lessons" items={[["No recorded activity", t.counts.accessNoActivity], ["Activity, none passed", t.counts.activityNoLessons], ["In progress", t.counts.inProgress], ["All lessons passed", t.counts.allLessonsPassed]]} />
            <CardGroup title="Final assessment" items={[["Attempted", t.counts.finalAttempted]]} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Num({ n, edge }: { n: number; edge?: boolean }) {
  return <td className={`px-3 py-3 text-right tabular-nums ${edge ? "border-l border-line/15" : ""}`}>{n}</td>;
}

function CardGroup({ title, items }: { title: string; items: [string, number][] }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted">{title}</p>
      {/* Numbers sit right next to their labels, not at the card's right edge, where the floating help button is. */}
      <dl className="mt-1 grid grid-cols-1 gap-y-0 text-sm">
        {items.map(([label, n]) => (
          <div key={label} className="grid grid-cols-[11rem_minmax(0,1fr)] items-baseline gap-2 border-b border-line/15 py-1">
            <dt className="text-muted">{label}</dt>
            <dd className="font-semibold tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
