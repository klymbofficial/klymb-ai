import clsx from "clsx";
import Link from "next/link";
import { CopyText } from "@/components/admin/CopyText";
import { EmptyState } from "@/components/admin/EmptyState";
import { ExportCsv } from "@/components/admin/ExportCsv";
import { MakeLink, PayoutForm } from "@/components/admin/InternActions";
import { InternTabs } from "@/components/admin/InternTabs";
import { PageTitle } from "@/components/admin/PageTitle";
import { StatTile } from "@/components/admin/StatTile";
import { site } from "@/data/config";
import { requireSalesAdmin } from "@/lib/admin/auth";
import { getInternBoard, getRepsWithoutLink } from "@/lib/admin/interns";
import { formatINR } from "@/lib/format";
import { commissionOf, INTERNSHIP, internLink, internTotals, monthLabel, monthOf } from "@/lib/internship";

export const dynamic = "force-dynamic";

const rupees = (paise: number) => formatINR(paise / 100);
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

/** Each intern's link, visits, sales and commission for a month, and what's been paid. Owners and sales managers. */
export default async function InternCommissionsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireSalesAdmin();
  const [board, noLink] = await Promise.all([getInternBoard(), getRepsWithoutLink()]);
  const now = monthOf(new Date());
  const months = [...new Set([now, ...(board?.sales ?? []).map((s) => monthOf(s.created_at))])].sort().reverse();
  const asked = (await searchParams).month;
  const month = asked && /^\d{4}-\d{2}$/.test(asked) ? asked : now;

  const rows = (board?.interns ?? []).map((i) => {
    const sales = board!.sales.filter((s) => s.intern_code === i.code);
    const payouts = board!.payouts.filter((p) => p.email === i.email);
    return { ...i, t: internTotals(sales, payouts, month) };
  });
  const total = rows.reduce((a, r) => ({ sales: a.sales + r.t.monthSales, revenue: a.revenue + r.t.monthRevenue, commission: a.commission + r.t.monthCommission, paid: a.paid + r.t.monthPaid }), { sales: 0, revenue: 0, commission: 0, paid: 0 });
  const csv = rows.map((r) => ({
    month, intern: r.name ?? "", email: r.email, code: r.code, link: internLink(site.url, r.code), link_visits: r.visits,
    sales: r.t.monthSales, revenue_inr: r.t.monthRevenue / 100, commission_inr: r.t.monthCommission / 100, paid_for_month_inr: r.t.monthPaid / 100, owed_overall_inr: r.t.owed / 100,
  }));

  return (
    <>
      <PageTitle
        eyebrow="BDE internship"
        title="Interns & commissions"
        intro={`${INTERNSHIP.commissionPct}% of what each buyer pays through an intern's link, rounded to the rupee, by the month of the order. Refunds don't reduce it. Pay after the month ends, then mark it paid here.`}
        actions={<ExportCsv rows={csv} filename={`klymb-intern-commissions-${month}`} />}
      />
      <InternTabs current="commissions" />
      {board === null ? (
        <EmptyState title="Commissions aren't set up yet" body="Run db/migrations/0045_intern_commissions.sql in the Neon SQL editor, then reload." />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            {months.map((m) => (
              <Link key={m} href={`/admin/internship/commissions?month=${m}`} className={clsx("border px-2.5 py-1 text-xs font-bold", m === month ? "border-ink bg-ink text-paper" : "border-line/40 hover:bg-surface")}>{monthLabel(m)}</Link>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label={`Sales, ${monthLabel(month)}`} value={total.sales} />
            <StatTile label="Revenue" value={rupees(total.revenue)} />
            <StatTile label="Commission" value={rupees(total.commission)} tone="ink" />
            <StatTile label="Paid for this month" value={rupees(total.paid)} hint={total.commission > total.paid ? `${rupees(total.commission - total.paid)} left to pay` : "All paid"} tone={total.commission > total.paid ? "red" : "ink"} />
          </div>

          {rows.length === 0 ? (
            <EmptyState title="No interns with links yet" body="Accepting an application makes their link. Reps already working can get one below." />
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-line/30 text-xs uppercase tracking-wider text-muted">
                  <tr><th className="px-4 py-3">Intern</th><th className="px-4 py-3">Link</th><th className="px-4 py-3">Opened by</th><th className="px-4 py-3">Sales</th><th className="px-4 py-3">Commission</th><th className="px-4 py-3">Paid</th><th className="px-4 py-3">Mark paid for {monthLabel(month)}</th></tr>
                </thead>
                <tbody className="divide-y divide-line/20">
                  {rows.map((r) => (
                    <tr key={r.code} className={clsx("align-top", !r.active && "text-muted")}>
                      <td className="px-4 py-3"><div className="font-bold">{r.name ?? r.email.split("@")[0]}</div><div className="text-xs text-muted">{r.email}</div></td>
                      <td className="px-4 py-3"><div className="font-mono text-xs font-bold">/i/{r.code}</div><CopyText text={internLink(site.url, r.code)} className="mt-1 text-xs underline underline-offset-2" /></td>
                      <td className="px-4 py-3">{r.visits} {r.visits === 1 ? "person" : "people"}</td>
                      <td className="px-4 py-3">{r.t.monthSales}<span className="block text-xs text-muted">{rupees(r.t.monthRevenue)}</span></td>
                      <td className="px-4 py-3 font-bold">{rupees(r.t.monthCommission)}<span className="block text-xs font-normal text-muted">{rupees(r.t.earned)} all time</span></td>
                      <td className="px-4 py-3">{rupees(r.t.monthPaid)}<span className={clsx("block text-xs", r.t.owed ? "font-bold text-red-deep" : "text-muted")}>{r.t.owed ? `${rupees(r.t.owed)} owed overall` : "Nothing owed"}</span></td>
                      <td className="px-4 py-3"><PayoutForm email={r.email} month={month} suggested={Math.max(0, r.t.monthCommission - r.t.monthPaid)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {rows.length > 0 && (
            <section aria-labelledby="by-intern" className="flex flex-col gap-2">
              <h2 id="by-intern" className="text-sm font-extrabold">Each intern&apos;s sales and payouts</h2>
              <p className="text-xs text-muted">Every sale credited to them, all months, and what they&apos;ve been paid. Refunded sales still count.</p>
              {rows.map((r) => {
                const sales = board!.sales.filter((x) => x.intern_code === r.code);
                const payouts = board!.payouts.filter((x) => x.email === r.email);
                return (
                  <details key={r.code} className="card px-4 py-3 text-sm">
                    <summary className="cursor-pointer font-bold">
                      {r.name ?? r.email} <span className="font-normal text-muted">· {sales.filter((x) => x.status === "paid" || x.status === "refunded").length} sales · {rupees(r.t.earned)} earned · {rupees(r.t.paid)} paid · {r.visits} opened the link</span>
                    </summary>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[560px] text-left text-xs">
                        <thead className="uppercase tracking-wider text-muted"><tr><th className="py-1.5 pr-3">Ordered</th><th className="py-1.5 pr-3">Buyer</th><th className="py-1.5 pr-3">Amount</th><th className="py-1.5 pr-3">Status</th><th className="py-1.5 pr-3">Commission</th></tr></thead>
                        <tbody className="divide-y divide-line/20">
                          {sales.length === 0 && <tr><td colSpan={5} className="py-2 text-muted">No orders through this link yet.</td></tr>}
                          {sales.map((x, n) => {
                            const counts = x.status === "paid" || x.status === "refunded";
                            return (
                              <tr key={n} className={counts ? "" : "text-muted"}>
                                <td className="py-1.5 pr-3">{when(x.created_at)}</td>
                                <td className="py-1.5 pr-3">{x.email}</td>
                                <td className="py-1.5 pr-3">{rupees(x.amount)}</td>
                                <td className="py-1.5 pr-3">{x.status === "created" ? "Not paid" : x.status}</td>
                                <td className="py-1.5 pr-3 font-bold">{counts ? rupees(commissionOf(x.amount)) : "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {payouts.length > 0 && (
                        <p className="mt-3 text-xs"><span className="font-bold">Paid:</span> {payouts.map((p) => `${rupees(p.amount)} for ${monthLabel(p.month.slice(0, 7))} on ${when(p.paid_at)} (${p.method.toUpperCase()}${p.reference ? ` ${p.reference}` : ""})`).join(" · ")}</p>
                      )}
                    </div>
                  </details>
                );
              })}
            </section>
          )}

          {noLink.length > 0 && (
            <section className="card p-4">
              <h2 className="text-sm font-extrabold">Reps without a link</h2>
              <p className="mb-3 text-xs text-muted">Sales reps added before the internship, or by hand in Sales › Team. Make them a link to track their sales.</p>
              <ul className="flex flex-col gap-2">
                {noLink.map((r) => <li key={r.email} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{r.name ?? r.email} <span className="text-xs text-muted">{r.email}</span></span><MakeLink email={r.email} name={r.name ?? r.email} /></li>)}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}
