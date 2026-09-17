import { EmptyState } from "@/components/admin/EmptyState";
import { PageTitle } from "@/components/admin/PageTitle";
import { StatTile } from "@/components/admin/StatTile";
import { getAnalytics } from "@/lib/admin/analytics";
import { getRegistrations, summariseRegistrations } from "@/lib/admin/data";

function Bars({ rows, unit }: { rows: { label: string; value: number; secondary?: string }[]; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5">
          <span className="truncate text-sm font-bold" title={r.label}>{r.label}</span>
          <span className="nums text-sm font-extrabold">
            {r.value}
            <span className="ml-1 font-normal text-muted">{unit}</span>
          </span>
          <span className="col-span-2 h-2 bg-surface">
            <span className="block h-2 bg-red-strong" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          {r.secondary && <span className="col-span-2 -mt-1 text-xs text-muted">{r.secondary}</span>}
        </li>
      ))}
    </ul>
  );
}

export default async function AdminAnalyticsPage() {
  const [analytics, registrations] = await Promise.all([getAnalytics(28), getRegistrations()]);
  const stats = summariseRegistrations(registrations);

  // The number neither system knows on its own.
  const conversion = analytics.activeUsers > 0 ? ((stats.total / analytics.activeUsers) * 100).toFixed(1) : null;

  return (
    <>
      <PageTitle
        eyebrow="Last 28 days"
        title="Traffic & conversion"
        intro="Google Analytics for who visits and which pages they read, alongside your own registration data."
      />

      {!analytics.configured ? (
        <EmptyState
          title="Analytics is not connected yet"
          body="Add GA_PROPERTY_ID (the numeric property id from GA Admin → Property details) and GA_SERVICE_ACCOUNT_KEY (a service account JSON key, on one line) in Vercel, and add that service account as a Viewer on the GA property. This page then fills in."
        />
      ) : analytics.error ? (
        <EmptyState title="Analytics could not be read" body={analytics.error} />
      ) : (
        <>
          <div className="grid gap-0.5 border-2 border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="People" value={analytics.activeUsers} hint="Active users, 28 days" />
            <StatTile label="Sessions" value={analytics.sessions} hint="Visits" />
            <StatTile label="Page views" value={analytics.pageViews} />
            <StatTile
              label="Visitor → registration"
              value={conversion ? `${conversion}%` : "—"}
              hint={`${stats.total} registrations all time`}
              tone="red"
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section aria-labelledby="pages" className="border-2 border-line bg-paper p-5">
              <h2 id="pages" className="display text-xl">Most-read pages</h2>
              <p className="mt-1 mb-4 text-xs text-muted">Which pages people actually open, by views.</p>
              {analytics.topPages.length ? <Bars rows={analytics.topPages} unit="views" /> : <p className="text-sm text-muted">No page data yet.</p>}
            </section>

            <section aria-labelledby="sources" className="border-2 border-line bg-paper p-5">
              <h2 id="sources" className="display text-xl">Where they come from</h2>
              <p className="mt-1 mb-4 text-xs text-muted">Channel behind each visit — search, social, direct, referral.</p>
              {analytics.sources.length ? <Bars rows={analytics.sources} unit="sessions" /> : <p className="text-sm text-muted">No source data yet.</p>}
            </section>
          </div>

          <p className="mt-6 text-xs text-muted">
            Analytics counts only visitors who accepted analytics cookies, so it undercounts real traffic. Your
            registration numbers are exact — they come from your own database.
          </p>
        </>
      )}
    </>
  );
}
