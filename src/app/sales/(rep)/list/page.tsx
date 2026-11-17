import clsx from "clsx";
import Link from "next/link";
import { PageTitle } from "@/components/admin/PageTitle";
import { SalesSheet } from "@/components/admin/sales/SalesSheet";
import { RepTabs } from "@/components/admin/sales/SalesTabs";
import { requireSalesUser } from "@/lib/admin/auth";
import { getLeads } from "@/lib/admin/sales";
import { istToday, STAGES } from "@/lib/sales";

type Search = { stage?: string; q?: string };

/** Every lead assigned to this intern, as a sheet they can work top to bottom. */
export default async function RepListPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireSalesUser();
  const sp = await searchParams;
  const rows = await getLeads({ stage: sp.stage, q: sp.q });
  const href = (patch: Partial<Search>) => {
    const next = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/sales/list${next.size ? `?${next}` : ""}`;
  };
  const chip = (active: boolean) => clsx("border px-2.5 py-1 text-xs font-bold", active ? "border-ink bg-ink text-paper" : "border-line/40 hover:bg-surface");

  return (
    <>
      <PageTitle
        eyebrow="Sales"
        title="My leads"
        intro="Everyone assigned to you. Change a stage, date or note and it saves. Found someone new? Add them in the first row and they're yours."
      />
      <RepTabs current="list" />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link href={href({ stage: "" })} className={chip(!sp.stage)}>All stages</Link>
        {STAGES.map((s) => <Link key={s.key} href={href({ stage: s.key })} className={chip(sp.stage === s.key)}>{s.label}</Link>)}
        <form method="get" className="w-full sm:ml-auto sm:w-auto">
          {sp.stage && <input type="hidden" name="stage" value={sp.stage} />}
          <input name="q" defaultValue={sp.q} placeholder="Search name, number, college" className="w-full border border-line/50 bg-white px-2.5 py-1.5 text-base focus:border-ink focus:outline-none sm:w-56 sm:text-sm" />
        </form>
      </div>
      <SalesSheet rows={rows} today={istToday()} owners={[]} base="/sales" canAssign={false} />
      <p className="mt-3 text-xs text-muted">
        {rows.length === 500 ? "Showing the first 500." : `${rows.length} ${rows.length === 1 ? "person" : "people"}.`} Overdue follow-ups are tinted.
      </p>
    </>
  );
}
