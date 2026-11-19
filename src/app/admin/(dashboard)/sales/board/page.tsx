import clsx from "clsx";
import Link from "next/link";
import { PageTitle } from "@/components/admin/PageTitle";
import { SalesBoard } from "@/components/admin/sales/SalesBoard";
import { SalesTabs } from "@/components/admin/sales/SalesTabs";
import { requireSalesAdmin } from "@/lib/admin/auth";
import { captureWebsiteLeads } from "@/lib/admin/sales-capture";
import { getLeads, getOwners } from "@/lib/admin/sales";
import { istToday } from "@/lib/sales";

export default async function SalesBoardPage({ searchParams }: { searchParams: Promise<{ who?: string; source?: string; q?: string }> }) {
  const admin = await requireSalesAdmin();
  await captureWebsiteLeads();
  const sp = await searchParams;
  const everyone = sp.who === "all";
  const [leads, owners] = await Promise.all([getLeads({ owner: everyone ? undefined : admin.email, source: sp.source, q: sp.q }), getOwners()]);
  const chip = (active: boolean) => clsx("border px-2.5 py-1 text-xs font-bold", active ? "border-ink bg-ink text-paper" : "border-line/40 hover:bg-surface");
  const ownerName = Object.fromEntries(owners.map((o) => [o.email, o.name ?? o.email.split("@")[0]]));

  return (
    <>
      <PageTitle eyebrow="Sales" title="Pipeline board" intro="Every lead as a card in its stage. Drag a card to another column to move it." />
      <SalesTabs current="board" />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link href={`/admin/sales/board${sp.q ? `?q=${encodeURIComponent(sp.q)}` : ""}`} className={chip(!everyone)}>Mine</Link>
        <Link href={`/admin/sales/board?who=all${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} className={chip(everyone)}>Everyone</Link>
        <form method="get" className="ml-auto flex items-center gap-2">
          {everyone && <input type="hidden" name="who" value="all" />}
          {sp.source && <input type="hidden" name="source" value={sp.source} />}
          <input name="q" defaultValue={sp.q} placeholder="Search name, number, college" className="w-56 border border-line/50 bg-white px-2.5 py-1.5 text-sm focus:border-ink focus:outline-none" />
          {sp.q && <Link href={`/admin/sales/board${everyone ? "?who=all" : ""}`} className="text-xs font-bold text-muted underline">Clear</Link>}
        </form>
      </div>
      <SalesBoard
        key={`${everyone}-${sp.q ?? ""}-${leads.length}`}
        cards={leads.map((l) => ({ id: l.id, name: l.name, phone: l.phone, email: l.email, org: l.org, stage: l.stage, next_follow_up: l.next_follow_up, owner_email: l.owner_email, paid: l.paid, status_note: l.status_note }))}
        today={istToday()}
        ownerName={ownerName}
      />
    </>
  );
}
