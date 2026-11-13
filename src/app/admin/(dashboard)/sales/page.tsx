import Link from "next/link";
import { PageTitle } from "@/components/admin/PageTitle";
import { RangeTabs } from "@/components/admin/RangeTabs";
import { StatTile } from "@/components/admin/StatTile";
import { TargetEditor } from "@/components/admin/sales/SalesForms";
import { SalesTabs, StageBadge } from "@/components/admin/sales/SalesTabs";
import { getOwners, getSalesReport } from "@/lib/admin/sales";
import { formatINR } from "@/lib/format";
import { CHANNELS, labelOf, pace, SOURCES, STAGES } from "@/lib/sales";

const vs = (cur: number, prev: number, what: string) => {
  if (!prev) return cur ? `New this ${what}` : `Nothing yet this ${what}`;
  const d = Math.round(((cur - prev) / prev) * 100);
  return `${d >= 0 ? "+" : ""}${d}% vs same days last ${what} (${prev})`;
};
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

export default async function SalesReportPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const key = (await searchParams).range === "ytd" ? "ytd" : "mtd";
  const [r, owners] = await Promise.all([getSalesReport(key), getOwners()]);
  if (!r) return null;
  const p = r.period;
  const unit = key === "mtd" ? "month" : "year";
  const who = (email: string) => owners.find((o) => o.email === email)?.name ?? email.split("@")[0];
  const t = r.target;
  const enrolPace = t && key === "mtd" ? pace(r.enrolments.total, t.enrolments, p.dayOfMonth, p.daysInMonth) : null;
  const maxChannel = Math.max(1, ...Object.values(r.outreach.byChannel));

  return (
    <>
      <PageTitle
        eyebrow="Sales"
        title={`${key === "mtd" ? "Month to date" : "Year to date"} · ${p.label}`}
        intro={key === "mtd"
          ? `Day ${p.dayOfMonth} of ${p.daysInMonth}. Compared with the same ${p.dayOfMonth} days of last month.`
          : "Financial year from 1 April, compared with the same stretch of the year before."}
        actions={<RangeTabs param="range" current={key} options={[{ key: "mtd", label: "MTD" }, { key: "ytd", label: "YTD" }]} />}
      />
      <SalesTabs current="report" />

      {!r.ready && (
        <p role="alert" className="mb-6 border border-error/40 bg-error-tint p-4 text-sm font-semibold text-error">
          The sales tables aren&apos;t in this database yet. Run <code>npm run db:migrate</code> to apply db/migrations/0031_sales.sql.
        </p>
      )}

      {/* Target vs actual */}
      <section aria-labelledby="target" className="card mb-6 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="target" className="display text-xl">Target</h2>
          {key === "mtd" && <TargetEditor month={p.month} label={p.label} initial={t} />}
        </div>
        {t ? (
          <div className="mt-4 grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Paid enrolments</p>
              <p className="display nums mt-1 text-4xl">{r.enrolments.total}<span className="text-xl text-muted"> / {t.enrolments}</span></p>
              <div className="mt-3 h-3 w-full bg-surface" role="img" aria-label={`${r.enrolments.total} of ${t.enrolments}`}>
                <div className="relative h-full bg-ink" style={{ width: `${Math.min(100, (r.enrolments.total / Math.max(1, t.enrolments)) * 100)}%` }} />
              </div>
              {enrolPace && (
                <p className={`mt-2 text-sm font-semibold ${enrolPace.onPace ? "text-emerald-800" : "text-red-deep"}`}>
                  {enrolPace.onPace ? "On pace" : "Behind pace"}: {enrolPace.expected} expected by today.
                  {r.enrolments.total < t.enrolments && ` Need ${enrolPace.needPerDay} a day from here.`}
                </p>
              )}
              <p className="mt-1 text-xs text-muted">{formatINR(r.enrolments.revenue)} collected · {vs(r.enrolments.total, r.enrolments.prev, unit)}</p>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <p><span className="display nums text-2xl">{r.b2bSigned.total}</span><span className="text-muted"> / {t.b2b} B2B deals signed</span></p>
              <p className="text-muted">Events planned: {t.hackathons} hackathon{t.hackathons === 1 ? "" : "s"}, {t.webinars} webinar{t.webinars === 1 ? "" : "s"}</p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">No target set for {p.label}.</p>
        )}
      </section>

      {/* Funnel */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label="Total outreach" value={r.outreach.total} hint={vs(r.outreach.total, r.outreach.prev, unit)} />
        <StatTile label="Conversations" value={r.conversations.total} hint={`${pct(r.conversations.total, r.outreach.total)} of outreach`} />
        <StatTile label="Potential conversions" value={r.hotNow} hint="Potential, positive or almost won, right now" tone="red" />
        <StatTile label="New leads" value={r.newLeads.total} hint={vs(r.newLeads.total, r.newLeads.prev, unit)} />
        <Link href="/admin/sales/leads?due=1&owner=" className="contents">
          <StatTile label="Follow-ups due" value={r.dueToday} hint="Today or overdue, whole team" tone={r.dueToday ? "red" : "muted"} />
        </Link>
      </div>
      <p className="mt-2 text-xs text-muted">
        Conversation to paid: {pct(r.enrolments.total, r.conversations.total)} (the plan assumes 1 in 10). Paid counts every enrolment, including ones that came straight from the website.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="channels" className="card p-5">
          <h2 id="channels" className="display text-xl">Outreach by channel</h2>
          <ul className="mt-4 flex flex-col gap-2.5">
            {CHANNELS.map((c) => {
              const v = r.outreach.byChannel[c.key] ?? 0;
              return (
                <li key={c.key} className="grid grid-cols-[6rem_1fr_3rem] items-center gap-3 text-sm">
                  <span className="font-semibold">{c.label}</span>
                  <span className="h-2.5 bg-surface"><span className="block h-full bg-ink" style={{ width: `${(v / maxChannel) * 100}%` }} /></span>
                  <span className="nums text-right font-bold">{v}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="pipeline" className="card p-5">
          <h2 id="pipeline" className="display text-xl">Pipeline now</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
            {STAGES.map((s) => (
              <li key={s.key}>
                <Link href={`/admin/sales/leads?stage=${s.key}`} className="flex items-center justify-between gap-2 text-sm hover:underline">
                  <StageBadge stage={s.key} label={s.label} />
                  <span className="nums font-bold">{r.stages[s.key] ?? 0}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="sources" className="mt-8">
        <h2 id="sources" className="display mb-3 text-2xl">By source</h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-b border-line/30 text-xs uppercase tracking-wider text-muted">
              <tr><th className="px-4 py-3">Source</th><th className="px-4 py-3 text-right">New leads</th><th className="px-4 py-3 text-right">Contacted</th><th className="px-4 py-3 text-right">Conversations</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Conv. → paid</th></tr>
            </thead>
            <tbody className="divide-y divide-line/20 nums">
              {SOURCES.map((s) => {
                const row = r.bySource.find((x) => x.source === s.key);
                if (!row) return null;
                return (
                  <tr key={s.key}>
                    <td className="px-4 py-3 font-semibold">{labelOf(SOURCES, s.key)}</td>
                    <td className="px-4 py-3 text-right">{row.leads}</td>
                    <td className="px-4 py-3 text-right">{row.contacted}</td>
                    <td className="px-4 py-3 text-right">{row.conversations}</td>
                    <td className="px-4 py-3 text-right font-bold">{row.paid}</td>
                    <td className="px-4 py-3 text-right">{pct(row.paid, row.conversations)}</td>
                  </tr>
                );
              })}
              {r.bySource.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted">No leads yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="people" className="mt-8">
        <h2 id="people" className="display mb-3 text-2xl">By person</h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-line/30 text-xs uppercase tracking-wider text-muted">
              <tr><th className="px-4 py-3">Who</th><th className="px-4 py-3 text-right">Outreach</th><th className="px-4 py-3 text-right">Conversations</th><th className="px-4 py-3 text-right">Hot leads owned</th><th className="px-4 py-3 text-right">Due</th></tr>
            </thead>
            <tbody className="divide-y divide-line/20 nums">
              {r.byOwner.map((o) => (
                <tr key={o.email}>
                  <td className="px-4 py-3 font-semibold">{who(o.email)}</td>
                  <td className="px-4 py-3 text-right">{o.touches}</td>
                  <td className="px-4 py-3 text-right">{o.conversations}</td>
                  <td className="px-4 py-3 text-right">{o.hot}</td>
                  <td className="px-4 py-3 text-right">
                    {o.due ? <Link href={`/admin/sales/leads?due=1&owner=${encodeURIComponent(o.email)}`} className="font-bold text-red-deep underline">{o.due}</Link> : 0}
                  </td>
                </tr>
              ))}
              {r.byOwner.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">No outreach logged yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
