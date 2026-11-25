import Link from "next/link";
import { PageTitle } from "@/components/admin/PageTitle";
import { StatTile } from "@/components/admin/StatTile";
import { B2BStageBadge, B2BTabs, DealTable, docNames, personName, shortDay, when } from "@/components/admin/b2b/parts";
import { requireSalesAdmin } from "@/lib/admin/auth";
import { getB2BOverview, getB2BPeople, type DealRow } from "@/lib/admin/b2b";
import { ACTIVITY_KINDS, B2B_STAGES, inr } from "@/lib/b2b";
import { labelOf } from "@/lib/sales";

export const metadata = { title: "B2B · Sales" };

function Attention({ title, hint, deals, render, href }: { title: string; hint: string; deals: DealRow[]; render: (d: DealRow) => React.ReactNode; href?: string }) {
  return (
    <section className="card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-extrabold">{title} <span className="nums text-muted">{deals.length}</span></h3>
        {href && deals.length > 0 && <Link href={href} className="text-xs font-bold underline">See all</Link>}
      </div>
      <p className="text-xs text-muted">{hint}</p>
      {deals.length === 0 ? (
        <p className="mt-3 text-xs font-bold text-emerald-800">All clear.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line/15">
          {deals.slice(0, 6).map((d) => (
            <li key={d.id} className="py-1.5 text-sm">
              <Link href={`/admin/sales/b2b/deals/${d.id}`} className="font-bold hover:underline">{d.company_name}</Link>
              <span className="text-xs text-muted"> · {render(d)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function B2BOverviewPage() {
  const admin = await requireSalesAdmin();
  const [o, people] = await Promise.all([getB2BOverview(), getB2BPeople()]);
  if (!o) return null;
  const who = (e: string | null) => personName(people, e, admin.email);

  return (
    <>
      <PageTitle
        eyebrow="Sales · B2B"
        title="Company deals"
        intro="Every company we are selling to: the pipeline in rupees, what will close this month and quarter, and what needs a push today."
      />
      <B2BTabs current="overview" />

      {!o.ready && (
        <p className="card mb-6 border-l-4 border-red-strong p-4 text-sm">
          B2B isn&apos;t set up in the database yet. Run <code>db/migrations/0069_b2b_deals.sql</code> in Neon, then reload.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Open pipeline" value={inr(o.openValue, true)} hint={`${o.openDeals} open deal${o.openDeals === 1 ? "" : "s"}`} />
        <StatTile label="Weighted pipeline" value={inr(o.weightedValue, true)} hint="Each deal × its stage's win chance" />
        <StatTile
          label="Signed this month"
          value={o.month.target ? `${o.month.signed} / ${o.month.target}` : o.month.signed}
          hint={`${inr(o.month.signedValue)} signed${o.month.target ? " · target from the Sales report" : ""}`}
          tone={o.month.target && o.month.signed >= o.month.target ? "ink" : "red"}
        />
        <StatTile
          label="Win rate"
          value={o.winRate === null ? "—" : `${o.winRate}%`}
          hint={o.avgCycleDays === null ? "Signed ÷ (signed + lost)" : `Signed ÷ (signed + lost) · ${o.avgCycleDays} days to sign on average`}
          tone="muted"
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <section className="card p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Forecast · this month</p>
          <p className="display nums mt-1 text-3xl">{inr(o.month.signedValue + o.month.forecast, true)}</p>
          <p className="text-xs text-muted">{inr(o.month.signedValue)} signed + {inr(o.month.forecast)} weighted from {o.month.forecastDeals} deal{o.month.forecastDeals === 1 ? "" : "s"} expected to sign by month end</p>
        </section>
        <section className="card p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Forecast · quarter {o.quarter.label}</p>
          <p className="display nums mt-1 text-3xl">{inr(o.quarter.signedValue + o.quarter.forecast, true)}</p>
          <p className="text-xs text-muted">{o.quarter.signed} signed ({inr(o.quarter.signedValue)}) + {inr(o.quarter.forecast)} weighted from {o.quarter.forecastDeals} deal{o.quarter.forecastDeals === 1 ? "" : "s"} expected this quarter</p>
        </section>
      </div>

      <h2 className="display mb-3 mt-10 text-2xl">Needs attention</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Attention title="Next step overdue" hint="The date has passed and nothing was logged." deals={o.overdue} href="/admin/sales/b2b/deals?due=1"
          render={(d) => <>{d.next_step} · due {d.next_step_date && shortDay(d.next_step_date)} · {who(d.owner_email)}</>} />
        <Attention title="Going stale" hint="No call, message or meeting in 14 days." deals={o.stale} href="/admin/sales/b2b/deals?flag=stale"
          render={(d) => <>last touch {d.last_activity_at ? when(d.last_activity_at) : "never"} · {who(d.owner_email)}</>} />
        <Attention title="Waiting on documents" hint="In Document needed, with what is still open." deals={o.docsPending} href="/admin/sales/b2b/deals?stage=document_needed"
          render={(d) => <>{d.pending_docs.length ? `needs ${docNames(d.pending_docs)}` : "all signed, ready to mark Signed"}</>} />
        <Attention title="No next step" hint="Every open deal should have one, with a date." deals={o.noNextStep} href="/admin/sales/b2b/deals?flag=no_next"
          render={(d) => <>{labelOf(B2B_STAGES, d.stage)} · {who(d.owner_email)}</>} />
        <Attention title="Expected to sign this month" hint="By their expected signing date." deals={o.closingSoon}
          render={(d) => <>{inr(d.value_inr)} · {d.expected_close && shortDay(d.expected_close)} · {labelOf(B2B_STAGES, d.stage)}</>} />
        <section className="card p-4">
          <h3 className="text-sm font-extrabold">Tasks due <span className="nums text-muted">{o.tasksDue.length}</span></h3>
          <p className="text-xs text-muted">Open tasks due today or earlier.</p>
          {o.tasksDue.length === 0 ? <p className="mt-3 text-xs font-bold text-emerald-800">All clear.</p> : (
            <ul className="mt-2 divide-y divide-line/15">
              {o.tasksDue.slice(0, 6).map((t) => (
                <li key={t.id} className="py-1.5 text-sm">
                  <Link href={`/admin/sales/b2b/deals/${t.deal_id}`} className="font-bold hover:underline">{t.title}</Link>
                  <span className="text-xs text-muted"> · {t.deal_title} · {t.due < o.today ? `overdue since ${shortDay(t.due)}` : "today"} · {who(t.assignee_email)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <h2 className="display mb-3 mt-10 text-2xl">Pipeline by stage</h2>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-line/25 text-[11px] font-extrabold uppercase tracking-wider text-muted">
            <tr><th className="px-3 py-2">Stage</th><th className="px-3 py-2 text-right">Deals</th><th className="px-3 py-2 text-right">Value</th><th className="px-3 py-2 text-right">Win chance</th><th className="px-3 py-2 text-right">Weighted</th></tr>
          </thead>
          <tbody className="divide-y divide-line/15">
            {o.stages.map((s) => (
              <tr key={s.stage}>
                <td className="px-3 py-2"><Link href={`/admin/sales/b2b/deals?stage=${s.stage}`}><B2BStageBadge stage={s.stage} /></Link></td>
                <td className="px-3 py-2 text-right nums">{s.deals}</td>
                <td className="px-3 py-2 text-right nums font-bold">{inr(s.value)}</td>
                <td className="px-3 py-2 text-right nums text-muted">{B2B_STAGES.find((x) => x.key === s.stage)?.win}%</td>
                <td className="px-3 py-2 text-right nums">{inr(s.weighted)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="display mb-3 mt-10 text-2xl">By person</h2>
      {o.owners.length === 0 ? <p className="card p-5 text-sm text-muted">No deals have an owner yet.</p> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line/25 text-[11px] font-extrabold uppercase tracking-wider text-muted">
              <tr><th className="px-3 py-2">Owner</th><th className="px-3 py-2 text-right">Open</th><th className="px-3 py-2 text-right">Open value</th><th className="px-3 py-2 text-right">Weighted</th><th className="px-3 py-2 text-right">Signed</th><th className="px-3 py-2 text-right">Lost</th><th className="px-3 py-2 text-right">Win rate</th><th className="px-3 py-2 text-right">Days to sign</th></tr>
            </thead>
            <tbody className="divide-y divide-line/15">
              {o.owners.map((r) => (
                <tr key={r.email}>
                  <td className="px-3 py-2 font-bold"><Link href={`/admin/sales/b2b/deals?owner=${encodeURIComponent(r.email)}`} className="hover:underline">{who(r.email)}</Link></td>
                  <td className="px-3 py-2 text-right nums">{r.open}</td>
                  <td className="px-3 py-2 text-right nums">{inr(r.openValue)}</td>
                  <td className="px-3 py-2 text-right nums">{inr(r.weighted)}</td>
                  <td className="px-3 py-2 text-right nums">{r.won} · {inr(r.wonValue, true)}</td>
                  <td className="px-3 py-2 text-right nums">{r.lost}</td>
                  <td className="px-3 py-2 text-right nums">{r.winRate === null ? "—" : `${r.winRate}%`}</td>
                  <td className="px-3 py-2 text-right nums">{r.avgCycleDays ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="display mb-3 mt-10 text-2xl">Latest activity</h2>
      {o.recent.length === 0 ? <p className="card p-5 text-sm text-muted">Nothing logged yet.</p> : (
        <ol className="card divide-y divide-line/15 p-2">
          {o.recent.map((a, i) => (
            <li key={i} className="px-2 py-2 text-sm">
              <p className="text-xs text-muted nums"><b className="text-ink">{labelOf(ACTIVITY_KINDS, a.kind)}</b> · {when(a.at)} · {who(a.by_email)} · <Link href={`/admin/sales/b2b/deals/${a.deal_id}`} className="font-bold text-ink hover:underline">{a.company_name}</Link></p>
              {a.note && <p className="mt-0.5 line-clamp-2">{a.note}</p>}
            </li>
          ))}
        </ol>
      )}

      {o.ready && o.openDeals > 0 && (
        <>
          <h2 className="display mb-3 mt-10 text-2xl">Biggest open deals</h2>
          <DealTable deals={o.biggest} people={people} me={admin.email} today={o.today} compact />
        </>
      )}
    </>
  );
}
