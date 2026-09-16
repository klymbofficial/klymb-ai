import Link from "next/link";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageTitle } from "@/components/admin/PageTitle";
import { StatTile } from "@/components/admin/StatTile";
import { TrackBars } from "@/components/admin/TrackBars";
import { cohort } from "@/data/config";
import { tracks } from "@/data/tracks";
import { formatDate } from "@/lib/format";
import { getLearnerProgress, getRegistrations, summariseRegistrations } from "@/lib/admin/data";

const trackName = (slug: string) => tracks.find((t) => t.slug === slug)?.name ?? slug;

export default async function AdminOverviewPage() {
  const [registrations, learners] = await Promise.all([getRegistrations(), getLearnerProgress()]);

  const stats = summariseRegistrations(registrations);
  const seatsLeft = Math.max(0, cohort.cohortCapacity - stats.total);

  return (
    <>
      <PageTitle
        eyebrow={`Cohort starting ${formatDate(cohort.startDate)}`}
        title="Overview"
        intro="Live numbers from the registration form and the learner progress tables."
      />

      <div className="grid gap-0.5 border-2 border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Registrations" value={stats.total} hint="All time" />
        <StatTile label="Last 7 days" value={stats.last7d} hint={`${stats.last24h} in the last 24 hours`} tone="red" />
        <StatTile label="Active learners" value={learners.filter((l) => l.status === "active").length} hint="Enrolled and in progress" />
        <StatTile
          label="Seats remaining"
          value={seatsLeft}
          hint={cohort.cohortCapacityIsPlaceholder ? `of ${cohort.cohortCapacity} — placeholder cap` : `of ${cohort.cohortCapacity}`}
          tone={seatsLeft === 0 ? "red" : "ink"}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section aria-labelledby="by-track" className="border-2 border-line bg-paper p-5">
          <h2 id="by-track" className="display text-xl">Interest by track</h2>
          <p className="mt-1 mb-4 text-xs text-muted">Which roles people are actually registering for.</p>
          <TrackBars counts={stats.byTrack} />
        </section>

        <section aria-labelledby="recent" className="border-2 border-line bg-paper">
          <div className="flex items-baseline justify-between gap-4 border-b-2 border-line p-5">
            <h2 id="recent" className="display text-xl">Latest registrations</h2>
            <Link href="/admin/registrations" className="text-xs font-bold uppercase tracking-wider underline underline-offset-4 hover:text-red-deep">
              See all
            </Link>
          </div>
          {registrations.length === 0 ? (
            <p className="p-5 text-sm text-muted">No registrations yet. They appear here the moment someone submits the form.</p>
          ) : (
            <ul className="divide-y divide-line">
              {registrations.slice(0, 6).map((r) => (
                <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3">
                  <span className="font-bold">{r.name}</span>
                  <span className="text-xs text-muted">{r.email}</span>
                  <span className="w-full text-xs text-muted sm:w-auto">
                    {trackName(r.track)} · {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {learners.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title="No learner progress yet"
            body="Progress fills in once learners have accounts and start submitting their daily deliverables. The tables, rules and admin views are already in place, waiting for that step."
          />
        </div>
      )}
    </>
  );
}
