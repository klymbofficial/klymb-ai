import { CopyText } from "@/components/admin/CopyText";
import { PageTitle } from "@/components/admin/PageTitle";
import { RepTabs } from "@/components/admin/sales/SalesTabs";
import { StatTile } from "@/components/admin/StatTile";
import { site } from "@/data/config";
import { requireSalesUser } from "@/lib/admin/auth";
import { getMyInternStats } from "@/lib/admin/interns";
import { formatINR } from "@/lib/format";
import { commissionOf, INTERN_KEEP_DAYS, INTERNSHIP, internLink, internTotals, monthLabel, monthOf } from "@/lib/internship";

export const dynamic = "force-dynamic";

const rupees = (paise: number) => formatINR(paise / 100);
const when = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
/** "ro***@gmail.com": enough to recognise a buyer, without showing their whole address. */
const masked = (email: string) => { const [u, d] = email.split("@"); return `${u.slice(0, 2)}***@${d}`; };

/** An intern's link and what it has earned them. */
export default async function RepEarningsPage() {
  await requireSalesUser();
  const stats = await getMyInternStats();
  const month = monthOf(new Date());

  return (
    <>
      <PageTitle eyebrow="Earnings" title="Your link and earnings" intro={`You earn ${INTERNSHIP.commissionPct}% of what each buyer pays through your link, paid after the end of each month.`} />
      <RepTabs current="earnings" />
      {!stats ? (
        <div className="card p-8 text-center">
          <p className="display text-2xl">No link yet</p>
          <p className="mt-2 text-sm text-muted">Your personal link appears here once the team sets it up. Ask your manager if it&apos;s missing.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {stats.interns.map((i) => {
            const link = internLink(site.url, i.code);
            const t = internTotals(stats.sales, stats.payouts, month);
            return (
              <div key={i.code} className="flex flex-col gap-6">
                <div className="card flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Your link</p>
                    <p className="truncate font-mono text-base font-bold">{link.replace(/^https:\/\/(www\.)?/, "")}</p>
                    <p className="text-xs text-muted">Opens the System Design course. Anyone who buys within {INTERN_KEEP_DAYS} days of opening it counts as your sale.</p>
                  </div>
                  <CopyText text={link} />
                  <a href={`https://wa.me/?text=${encodeURIComponent(`Learn system design in 21 days, 15 minutes a day: ${link}`)}`} target="_blank" rel="noopener noreferrer" className="border border-emerald-700/40 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50">Share on WhatsApp</a>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatTile label="People who opened it" value={i.visits} />
                  <StatTile label={`Sales in ${monthLabel(month)}`} value={t.monthSales} />
                  <StatTile label={`Earned in ${monthLabel(month)}`} value={rupees(t.monthCommission)} tone="ink" />
                  <StatTile label="To be paid" value={rupees(t.owed)} hint={`${rupees(t.earned)} earned, ${rupees(t.paid)} paid so far`} />
                </div>
              </div>
            );
          })}

          <section className="card overflow-x-auto">
            <h2 className="border-b border-line/25 px-4 py-3 text-sm font-extrabold">Your sales</h2>
            {stats.sales.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">No sales yet. Share your link to get your first one.</p>
            ) : (
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted"><tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Buyer</th><th className="px-4 py-2">Paid</th><th className="px-4 py-2">Your {INTERNSHIP.commissionPct}%</th></tr></thead>
                <tbody className="divide-y divide-line/20">
                  {stats.sales.filter((s) => s.status === "paid" || s.status === "refunded").map((s, n) => (
                    <tr key={n}><td className="px-4 py-2">{when(s.created_at)}</td><td className="px-4 py-2">{masked(s.email)}</td><td className="px-4 py-2">{rupees(s.amount)}</td><td className="px-4 py-2 font-bold">{rupees(commissionOf(s.amount))}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {stats.payouts.length > 0 && (
            <section className="card overflow-x-auto">
              <h2 className="border-b border-line/25 px-4 py-3 text-sm font-extrabold">Payouts</h2>
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted"><tr><th className="px-4 py-2">For</th><th className="px-4 py-2">Amount</th><th className="px-4 py-2">Paid on</th><th className="px-4 py-2">How</th></tr></thead>
                <tbody className="divide-y divide-line/20">
                  {stats.payouts.map((p, n) => (
                    <tr key={n}><td className="px-4 py-2">{monthLabel(p.month.slice(0, 7))}</td><td className="px-4 py-2 font-bold">{rupees(p.amount)}</td><td className="px-4 py-2">{when(p.paid_at)}</td><td className="px-4 py-2 uppercase">{p.method}{p.reference ? ` · ${p.reference}` : ""}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      )}
    </>
  );
}
