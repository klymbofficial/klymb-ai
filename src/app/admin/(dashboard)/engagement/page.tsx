import { PageTitle } from "@/components/admin/PageTitle";
import { RangeTabs } from "@/components/admin/RangeTabs";
import { StatTile } from "@/components/admin/StatTile";
import { AreaLineChart } from "@/components/charts/AreaLineChart";
import { BarList } from "@/components/charts/BarList";
import { FunnelBars } from "@/components/charts/FunnelBars";
import { ExportCsv } from "@/components/admin/ExportCsv";
import { getEngagement, type Granularity } from "@/lib/admin/engagement";
import { rangeDays, RANGES } from "@/lib/admin/analytics";

function Panel({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="display text-xl">{title}</h2>
      <p className="mt-1 mb-4 text-xs text-muted">{note}</p>
      {children}
    </section>
  );
}

export default async function AdminEngagementPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; grain?: string }>;
}) {
  const { range, grain } = await searchParams;
  const days = rangeDays(range);
  const granularity = (["daily", "weekly", "monthly"].includes(grain ?? "") ? grain : "daily") as Granularity;

  const data = await getEngagement(days, granularity);

  return (
    <>
      <PageTitle
        eyebrow="Your own data"
        title="Platform engagement"
        intro="Registrations, submissions, track split and where learners stop: measured from the database, not from Google."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <RangeTabs param="range" current={range ?? "30d"} options={RANGES.map((r) => ({ key: r.key, label: r.label }))} />
            <RangeTabs
              param="grain"
              current={granularity}
              options={[
                { key: "daily", label: "Daily" },
                { key: "weekly", label: "Weekly" },
                { key: "monthly", label: "Monthly" },
              ]}
            />
            <ExportCsv rows={data.series} filename={`klymb-engagement-${days}d`} />
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Registrations" value={data.totals.registrations} hint={`Last ${days} days`} />
        <StatTile label="Enrolled learners" value={data.totals.learners} hint="All time" />
        <StatTile label="Submissions" value={data.totals.submissions} hint={`Last ${days} days`} tone="red" />
        <StatTile label="Completed 30 days" value={data.totals.completed} hint="Eligible for the refund" />
      </div>

      <div className="mt-8 flex flex-col gap-6">
        <Panel
          title="Registrations & submissions"
          note="Registrations are new interest; submissions are learners doing the work. The second line is the one that predicts refunds."
        >
          <AreaLineChart
            points={data.series}
            caption={`Last ${days} days, ${granularity}`}
            series={[
              { label: "Submissions", color: "var(--color-ink)", fill: "color-mix(in srgb, var(--color-ink) 10%, transparent)", get: (p) => p.submissions },
              { label: "Registrations", color: "var(--color-red)", get: (p) => p.registrations },
            ]}
          />
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Interest by track" note="Which roles people are registering for.">
            <BarList rows={data.byTrack} unit="registrations" emptyLabel="No registrations in this window." />
          </Panel>
          <Panel
            title="Drop-off by milestone"
            note="How far learners actually get. Each bar is measured against the number enrolled."
          >
            <FunnelBars steps={data.milestones} />
          </Panel>
        </div>
      </div>
    </>
  );
}
