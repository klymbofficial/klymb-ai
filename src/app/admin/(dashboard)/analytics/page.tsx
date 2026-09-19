import { EmptyState } from "@/components/admin/EmptyState";
import { KpiTile } from "@/components/admin/KpiTile";
import { PageTitle } from "@/components/admin/PageTitle";
import { RangeTabs } from "@/components/admin/RangeTabs";
import { AreaLineChart } from "@/components/charts/AreaLineChart";
import { BarList } from "@/components/charts/BarList";
import { getAnalyticsDashboard, RANGES, rangeDays } from "@/lib/admin/analytics";
import { getRegistrations, summariseRegistrations } from "@/lib/admin/data";

function Panel({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="border-2 border-line bg-paper p-5">
      <h2 className="display text-xl">{title}</h2>
      <p className="mt-1 mb-4 text-xs text-muted">{note}</p>
      {children}
    </section>
  );
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const days = rangeDays(range);

  const [analytics, registrations] = await Promise.all([getAnalyticsDashboard(days), getRegistrations()]);
  const stats = summariseRegistrations(registrations);
  const visitors = analytics.kpis.find((k) => k.label === "Total users")?.value ?? 0;
  const conversion = visitors > 0 ? ((stats.total / visitors) * 100).toFixed(1) : null;

  return (
    <>
      <PageTitle
        eyebrow="Google Analytics"
        title="Traffic & audience"
        intro="Live GA4 data. Every panel respects the range below; the change on each tile compares this window with the one before it."
        actions={<RangeTabs param="range" current={range ?? "30d"} options={RANGES.map((r) => ({ key: r.key, label: r.label }))} />}
      />

      {!analytics.configured ? (
        <EmptyState
          title="Analytics is not connected yet"
          body="Add GA_PROPERTY_ID and GA_SERVICE_ACCOUNT_KEY in Vercel, and add that service account as a Viewer on the GA property."
        />
      ) : analytics.error ? (
        <EmptyState title="Analytics could not be read" body={analytics.error} />
      ) : (
        <>
          <div className="grid gap-0.5 border-2 border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {analytics.kpis.map((kpi) => <KpiTile key={kpi.label} kpi={kpi} />)}
          </div>

          <div className="mt-8">
            <Panel
              title="Sessions & new users over time"
              note="Sessions is every visit; new users is first-timers only. A widening gap means people are coming back."
            >
              <AreaLineChart
                points={analytics.series}
                caption={`Last ${days} days`}
                series={[
                  { label: "Sessions", color: "var(--color-ink)", fill: "color-mix(in srgb, var(--color-ink) 10%, transparent)", get: (p) => p.sessions },
                  { label: "New users", color: "var(--color-red)", get: (p) => p.newUsers },
                ]}
              />
            </Panel>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Panel title="Where they come from" note="Channel behind each visit — search, social, direct or referral.">
              <BarList rows={analytics.channels} unit="sessions" />
            </Panel>
            <Panel title="Most-read pages" note="Which pages people actually open.">
              <BarList rows={analytics.pages} unit="views" />
            </Panel>
            <Panel title="Devices" note="Phone or laptop. The build tasks need a laptop, so this matters.">
              <BarList rows={analytics.devices} unit="sessions" />
            </Panel>
            <Panel title="Countries" note="Where visitors are.">
              <BarList rows={analytics.countries} unit="people" />
            </Panel>
          </div>

          <div className="mt-6 grid gap-0.5 border-2 border-line bg-line sm:grid-cols-3">
            <div className="bg-paper p-5">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Visitors</p>
              <p className="display nums mt-1 text-3xl">{visitors.toLocaleString("en-IN")}</p>
            </div>
            <div className="bg-paper p-5">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Registrations (all time)</p>
              <p className="display nums mt-1 text-3xl">{stats.total}</p>
            </div>
            <div className="bg-paper p-5">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Visitor → registration</p>
              <p className="display nums mt-1 text-3xl text-red">{conversion ? `${conversion}%` : "—"}</p>
            </div>
          </div>

          <p className="mt-6 text-xs text-muted">
            Analytics counts only visitors whose browser ran the script, so it undercounts anyone using a blocker.
            Registration numbers come from your own database and are exact.
          </p>
        </>
      )}
    </>
  );
}
