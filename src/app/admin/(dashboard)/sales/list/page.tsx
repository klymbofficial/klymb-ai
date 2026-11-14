import clsx from "clsx";
import Link from "next/link";
import { PageTitle } from "@/components/admin/PageTitle";
import { SalesSheet } from "@/components/admin/sales/SalesSheet";
import { SalesTabs } from "@/components/admin/sales/SalesTabs";
import { requireOwner } from "@/lib/admin/auth";
import { captureWebsiteLeads } from "@/lib/admin/sales-capture";
import { getLeads, getOwners } from "@/lib/admin/sales";
import { istToday, STAGES } from "@/lib/sales";

type Search = { who?: string; stage?: string; q?: string };

export default async function SalesListPage({ searchParams }: { searchParams: Promise<Search> }) {
  // Website form fills arrive as leads before anything is read.
  await captureWebsiteLeads();
  const admin = await requireOwner();
  const sp = await searchParams;
  const everyone = sp.who === "all";
  const [rows, owners] = await Promise.all([
    getLeads({ owner: everyone ? undefined : admin.email, stage: sp.stage, q: sp.q }),
    getOwners(),
  ]);
  const href = (patch: Partial<Search>) => {
    const next = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/admin/sales/list${next.size ? `?${next}` : ""}`;
  };
  const chip = (active: boolean) => clsx("border px-2.5 py-1 text-xs font-bold", active ? "border-ink bg-ink text-paper" : "border-line/40 hover:bg-surface");

  return (
    <>
      <PageTitle
        eyebrow="Sales"
        title={everyone ? "Everyone's list" : "My list"}
        intro="Your people as a sheet. Change a stage, date or note and it saves. WA and Call open the chat or dialler and log the touch."
      />
      <SalesTabs current="list" />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link href={href({ who: "" })} className={chip(!everyone)}>Mine</Link>
        <Link href={href({ who: "all" })} className={chip(everyone)}>Everyone</Link>
        <span className="mx-1 h-5 w-px bg-line/40" />
        <Link href={href({ stage: "" })} className={chip(!sp.stage)}>All stages</Link>
        {STAGES.map((s) => <Link key={s.key} href={href({ stage: s.key })} className={chip(sp.stage === s.key)}>{s.label}</Link>)}
        <form method="get" className="ml-auto">
          {everyone && <input type="hidden" name="who" value="all" />}
          {sp.stage && <input type="hidden" name="stage" value={sp.stage} />}
          <input name="q" defaultValue={sp.q} placeholder="Search name, number, college" className="w-56 border border-line/50 bg-white px-2.5 py-1.5 text-sm focus:border-ink focus:outline-none" />
        </form>
      </div>
      <SalesSheet rows={rows} today={istToday()} owners={owners} />
      <p className="mt-3 text-xs text-muted">
        {rows.length === 500 ? "Showing the first 500." : `${rows.length} ${rows.length === 1 ? "person" : "people"}.`} Overdue follow-ups are tinted.
        Got a Google Sheet? Copy the rows and paste them into <Link href="/admin/sales/leads?add=1" className="underline">Import</Link>.
      </p>
    </>
  );
}
