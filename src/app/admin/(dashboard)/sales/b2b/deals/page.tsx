import clsx from "clsx";
import Link from "next/link";
import { PageTitle } from "@/components/admin/PageTitle";
import { B2BTabs, DealTable } from "@/components/admin/b2b/parts";
import { input } from "@/components/admin/sales/styles";
import { SalesTabs } from "@/components/admin/sales/SalesTabs";
import { requireSalesAdmin } from "@/lib/admin/auth";
import { getB2BPeople, getDeals } from "@/lib/admin/b2b";
import { B2B_STAGES, inr, weighted } from "@/lib/b2b";
import { istToday } from "@/lib/sales";

export const metadata = { title: "B2B deals · Sales" };

type Params = { stage?: string; owner?: string; by?: string; due?: string; flag?: string; q?: string; closed?: string };

const FLAGS = [
  { key: "stale", label: "Going stale" },
  { key: "no_next", label: "No next step" },
  { key: "docs", label: "Documents open" },
];

export default async function B2BDealsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const admin = await requireSalesAdmin();
  const sp = await searchParams;
  const due = sp.due === "1";
  const showClosed = sp.closed === "1" || sp.stage === "signed" || sp.stage === "lost";
  const [deals, people] = await Promise.all([
    getDeals({ stage: sp.stage, owner: sp.owner, by: sp.by, due, flag: sp.flag, q: sp.q, open: !showClosed }),
    getB2BPeople(),
  ]);
  const today = istToday();
  const total = deals.reduce((a, d) => a + d.value_inr, 0);
  const w = deals.reduce((a, d) => a + weighted(d.value_inr, d.stage), 0);
  const href = (patch: Partial<Params>) => {
    const next = { ...sp, ...patch };
    const qs = Object.entries(next).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&");
    return `/admin/sales/b2b/deals${qs ? `?${qs}` : ""}`;
  };
  const chip = (active: boolean) => clsx("border px-2.5 py-1 text-xs font-bold", active ? "border-ink bg-ink text-paper" : "border-line/40 hover:bg-surface");

  return (
    <>
      <PageTitle
        eyebrow="Sales · B2B"
        title={due ? "Next steps due today" : "All deals"}
        intro={`${deals.length} deal${deals.length === 1 ? "" : "s"} · ${inr(total)} in all · ${inr(w)} weighted.`}
      />
      <SalesTabs current="b2b" />
      <B2BTabs current={due ? "due" : "deals"} />

      <form method="get" className="mb-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs font-bold">
          Stage
          <select name="stage" defaultValue={sp.stage ?? ""} className={input}>
            <option value="">Every stage</option>
            {B2B_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold">
          Owner
          <select name="owner" defaultValue={sp.owner ?? ""} className={input}>
            <option value="">Anyone</option>
            <option value="none">Unassigned</option>
            {people.map((p) => <option key={p.email} value={p.email}>{p.email === admin.email ? "You" : p.name ?? p.email}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold">
          Reached out by
          <select name="by" defaultValue={sp.by ?? ""} className={input}>
            <option value="">Anyone</option>
            <option value="none">Nobody yet</option>
            {people.map((p) => <option key={p.email} value={p.email}>{p.email === admin.email ? "You" : p.name ?? p.email}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold">
          Search
          <input name="q" defaultValue={sp.q} placeholder="Company, deal, person, course" className={`${input} w-60`} />
        </label>
        {due && <input type="hidden" name="due" value="1" />}
        {sp.flag && <input type="hidden" name="flag" value={sp.flag} />}
        {sp.closed && <input type="hidden" name="closed" value={sp.closed} />}
        <button type="submit" className="bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-paper">Filter</button>
        <Link href="/admin/sales/b2b/deals" className="py-2 text-xs font-bold text-muted underline">Clear</Link>
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={href({ due: due ? undefined : "1" })} className={chip(due)}>Due today</Link>
        {FLAGS.map((f) => <Link key={f.key} href={href({ flag: sp.flag === f.key ? undefined : f.key })} className={chip(sp.flag === f.key)}>{f.label}</Link>)}
        <Link href={href({ closed: showClosed && !sp.stage ? undefined : "1" })} className={chip(showClosed)}>Include signed and lost</Link>
      </div>

      <DealTable deals={deals} people={people} me={admin.email} today={today} />
    </>
  );
}
