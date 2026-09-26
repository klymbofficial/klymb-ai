import {
  Activity, BarChart3, Clock, FileText, MousePointerClick, Radio, Sparkles, TrendingDown, UserPlus, Users,
} from "lucide-react";
import { Suspense } from "react";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageTitle } from "@/components/admin/PageTitle";
import { RangeTabs } from "@/components/admin/RangeTabs";
import { Composition } from "@/components/admin/ga/Composition";
import { GaFilters } from "@/components/admin/ga/GaFilters";
import { GaKpiTile } from "@/components/admin/ga/GaKpiTile";
import { GaTabs } from "@/components/admin/ga/GaTabs";
import { Panel } from "@/components/admin/ga/Panel";
import { ShareTable } from "@/components/admin/ga/ShareTable";
import { AreaLineChart } from "@/components/charts/AreaLineChart";
import { BarList } from "@/components/charts/BarList";
import { FunnelBars } from "@/components/charts/FunnelBars";
import { getAnalyticsDashboard, getRealtime, RANGES, rangeDays, readFilters, type SparkKey } from "@/lib/admin/analytics";
import { getRegistrations, summariseRegistrations } from "@/lib/admin/data";
import { formatDuration } from "@/lib/chart";

const ICONS = {
  "Total users": Users,
  "New users": UserPlus,
  "Active users": Activity,
  Sessions: BarChart3,
  "Page views": MousePointerClick,
  "Avg. session": Clock,
  "Engagement rate": Sparkles,
  "Bounce rate": TrendingDown,
} as const;

type Params = { range?: string; country?: string; device?: string; tab?: string };

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  return (
    <>
      <PageTitle
        eyebrow="Google Analytics"
        title="Traffic & audience"
        intro="Live GA4 data, refreshed every five minutes. Tiles compare this window with the one before it; the filters re-cut every panel."
        actions={<RangeTabs param="range" current={params.range ?? "30d"} options={RANGES.map((r) => ({ key: r.key, label: r.label }))} />}
      />
      {/* The header answers instantly; GA streams in beneath it. Keyed on the
          query so a new range or filter shows the skeleton instead of stale data. */}
      <Suspense key={`${params.range}|${params.country}|${params.device}`} fallback={<AnalyticsSkeleton />}>
        <AnalyticsBody params={params} />
      </Suspense>
    </>
  );
}

function AnalyticsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading analytics" className="flex flex-col gap-6">
      <div className="h-12 w-80 animate-pulse rounded-card bg-surface" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-40 animate-pulse rounded-card bg-surface/70" />)}
      </div>
      <div className="h-72 animate-pulse rounded-card bg-surface/70" />
    </div>
  );
}

async function AnalyticsBody({ params }: { params: Params }) {
  const days = rangeDays(params.range);
  const filters = readFilters(params);

  const [analytics, realtime, registrations] = await Promise.all([
    getAnalyticsDashboard(days, filters),
    getRealtime(),
    getRegistrations(),
  ]);
  const stats = summariseRegistrations(registrations);
  const spark = (key?: SparkKey) => (key ? analytics.series.map((p) => p[key]) : undefined);
  const visitors = analytics.kpis.find((k) => k.label === "Total users")?.value ?? 0;
  const filtered = Boolean(filters.country || filters.device);

  return (
    <>
      {!analytics.configured ? (
        <EmptyState
          title="Analytics is not connected yet"
          body="Add GA_PROPERTY_ID and GA_SERVICE_ACCOUNT_KEY in Vercel, and add that service account as a Viewer on the GA property."
        />
      ) : analytics.error ? (
        <EmptyState title="Analytics could not be read" body={analytics.error} />
      ) : (
        <div className="flex flex-col gap-6">
          {/* ── Live strip and filters ─────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="card flex items-center gap-3 px-4 py-3">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-green-600" />
              </span>
              <Radio size={15} aria-hidden="true" className="text-muted" />
              <p className="text-sm">
                <strong className="nums text-lg">{realtime?.active ?? "-"}</strong>{" "}
                <span className="text-muted">on the site in the last 30 minutes</span>
                {realtime && realtime.byCountry.length > 0 && (
                  <span className="text-muted"> · {realtime.byCountry.slice(0, 3).map((c) => `${c.label} ${c.value}`).join(", ")}</span>
                )}
              </p>
            </div>
            <GaFilters countries={analytics.options.countries} devices={analytics.options.devices} />
          </div>
          {filtered && (
            <p className="-mt-3 text-xs font-semibold text-red-deep">
              Filtered to {[filters.country, filters.device].filter(Boolean).join(" · ")}. Every number below reflects only those visits.
            </p>
          )}

          {/* ── KPI tiles ─────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {analytics.kpis.map((kpi) => (
              <GaKpiTile key={kpi.label} kpi={kpi} icon={ICONS[kpi.label as keyof typeof ICONS]} spark={spark(kpi.spark)} />
            ))}
          </div>

          {/* ── Klymb conversions ─────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ConversionTile label="Registrations (GA)" value={analytics.conversions.registrations} hint="register_submit events in range" />
            <ConversionTile
              label="Visitor → registration"
              value={visitors ? `${((analytics.conversions.registrations / visitors) * 100).toFixed(1)}%` : "-"}
              hint={`${analytics.conversions.registrations} of ${visitors.toLocaleString("en-IN")} visitors`}
              accent
            />
            <ConversionTile label="Day submissions" value={analytics.conversions.daySubmissions} hint="day_submit events in range" />
            <ConversionTile label="Registrations (database)" value={stats.total} hint={`${stats.last7d} in the last 7 days · exact`} />
          </div>

          <Panel title="Sessions & new users over time" note="Sessions is every visit; new users is first-timers only. A widening gap means people are coming back.">
            <AreaLineChart
              points={analytics.series}
              caption={`Last ${days} days`}
              series={[
                { label: "Sessions", color: "var(--color-ink)", fill: "color-mix(in srgb, var(--color-ink) 10%, transparent)", get: (p) => p.sessions },
                { label: "New users", color: "var(--color-red)", get: (p) => p.newUsers },
              ]}
            />
          </Panel>

          {/* ── Tabs ──────────────────────────────────────────── */}
          <GaTabs
            initial={params.tab}
            tabs={[
              {
                key: "audience",
                label: "Audience",
                content: (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Panel title="Users by country" note="Where visitors are coming from. Use the country filter to drill into one.">
                      <BarList rows={analytics.countries.slice(0, 9).map((c) => ({ label: c.country, value: c.users }))} unit="users" />
                    </Panel>
                    <Panel title="Sessions by city" note="Top cities in the current window (respects the filters).">
                      <BarList rows={analytics.cities} unit="sessions" />
                    </Panel>
                    <Panel title="Countries in detail" note="Users and sessions per country, with each country's share of users in the range." className="lg:col-span-2">
                      <ShareTable
                        columns={["Country", "Users", "Sessions"]}
                        shareOf={0}
                        rows={analytics.countries.map((c) => ({ label: c.country, values: [c.users, c.sessions] }))}
                      />
                    </Panel>
                  </div>
                ),
              },
              {
                key: "acquisition",
                label: "Acquisition",
                content: (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Panel title="Channels" note="The channel behind each visit: search, social, direct or referral.">
                      <BarList rows={analytics.channels} unit="sessions" />
                    </Panel>
                    <Panel title="Source / medium" note="Exactly where a visit came from. UTM-tagged links show up here by name.">
                      <BarList rows={analytics.sourceMedium} unit="sessions" />
                    </Panel>
                    <Panel title="Landing pages" note="The first page of each visit: what brought people in." className="lg:col-span-2">
                      <ShareTable columns={["Landing page", "Sessions"]} shareOf={0} rows={analytics.landingPages.map((r) => ({ label: r.label, values: [r.value] }))} />
                    </Panel>
                  </div>
                ),
              },
              {
                key: "demographics",
                label: "Demographics",
                content: (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Panel title="Device category" note="The build tasks need a laptop, so a phone-heavy audience matters.">
                      <Composition rows={analytics.devices} unit="sessions" />
                    </Panel>
                    <Panel title="New vs returning" note="Returning visitors are the ones weighing it up.">
                      <Composition rows={analytics.newVsReturning} unit="active users" />
                    </Panel>
                    <Panel title="Browser">
                      <BarList rows={analytics.browsers} unit="sessions" />
                    </Panel>
                    <Panel title="Operating system">
                      <BarList rows={analytics.os} unit="sessions" />
                    </Panel>
                    <Panel title="Language" className="lg:col-span-2">
                      <BarList rows={analytics.languages} unit="sessions" />
                    </Panel>
                  </div>
                ),
              },
              {
                key: "behavior",
                label: "Behavior",
                content: (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Panel title="Registration funnel" note="Distinct people reaching each stage in this window. The drop between stages is where to look.">
                      <FunnelBars steps={analytics.funnel} />
                    </Panel>
                    <Panel title="Events" note="Everything GA recorded, including Klymb's own register, day and knowledge-check events.">
                      <BarList rows={analytics.events} unit="events" />
                    </Panel>
                    <Panel title="Top pages" note="Where attention lands, and how long people stay on it." className="lg:col-span-2">
                      <div className="overflow-x-auto rounded-xl border border-line/25">
                        <table className="w-full min-w-[34rem] text-sm">
                          <thead className="bg-surface/60 text-left text-xs font-bold text-muted">
                            <tr>
                              <th scope="col" className="px-4 py-3">Page</th>
                              <th scope="col" className="px-4 py-3 text-right">Views</th>
                              <th scope="col" className="px-4 py-3 text-right">Users</th>
                              <th scope="col" className="px-4 py-3 text-right">Engaged time / user</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line/20">
                            {analytics.pages.map((p) => (
                              <tr key={p.path}>
                                <th scope="row" className="max-w-[20rem] truncate px-4 py-3 text-left font-semibold" title={p.path}>
                                  <FileText size={13} aria-hidden="true" className="mr-2 inline text-muted" />{p.path}
                                </th>
                                <td className="nums px-4 py-3 text-right">{p.views.toLocaleString("en-IN")}</td>
                                <td className="nums px-4 py-3 text-right">{p.users.toLocaleString("en-IN")}</td>
                                <td className="nums px-4 py-3 text-right">{formatDuration(p.engagedSeconds)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Panel>
                  </div>
                ),
              },
            ]}
          />

          <p className="text-xs text-muted">
            GA counts only visitors whose browser ran the script, so it undercounts anyone using a blocker: which is why
            registrations are shown both from GA and from your own database. The database number is exact.
          </p>
        </div>
      )}
    </>
  );
}

function ConversionTile({ label, value, hint, accent }: { label: string; value: number | string; hint: string; accent?: boolean }) {
  return (
    <div className={`rounded-card p-5 shadow-card ${accent ? "bg-red-strong text-white" : "bg-card"}`}>
      <p className={`text-[11px] font-extrabold uppercase tracking-[0.14em] ${accent ? "text-white/80" : "text-muted"}`}>{label}</p>
      <p className="display nums mt-2 text-[2rem] leading-none">{typeof value === "number" ? value.toLocaleString("en-IN") : value}</p>
      <p className={`mt-2 text-xs ${accent ? "text-white/80" : "text-muted"}`}>{hint}</p>
    </div>
  );
}
