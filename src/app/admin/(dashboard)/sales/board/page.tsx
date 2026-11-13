import clsx from "clsx";
import Link from "next/link";
import { PageTitle } from "@/components/admin/PageTitle";
import { SalesBoard } from "@/components/admin/sales/SalesBoard";
import { SalesTabs } from "@/components/admin/sales/SalesTabs";
import { requireAdmin } from "@/lib/admin/auth";
import { captureWebsiteLeads } from "@/lib/admin/sales-capture";
import { getLeads, getOwners } from "@/lib/admin/sales";
import { istToday } from "@/lib/sales";

export default async function SalesBoardPage({ searchParams }: { searchParams: Promise<{ who?: string; source?: string }> }) {
  const admin = await requireAdmin();
  await captureWebsiteLeads();
  const sp = await searchParams;
  const everyone = sp.who === "all";
  const [leads, owners] = await Promise.all([getLeads({ owner: everyone ? undefined : admin.email, source: sp.source }), getOwners()]);
  const chip = (active: boolean) => clsx("border px-2.5 py-1 text-xs font-bold", active ? "border-ink bg-ink text-paper" : "border-line/40 hover:bg-surface");
  const ownerName = Object.fromEntries(owners.map((o) => [o.email, o.name ?? o.email.split("@")[0]]));

  return (
    <>
      <PageTitle eyebrow="Sales" title="Pipeline board" intro="Every lead as a card in its stage. Drag a card to another column to move it." />
      <SalesTabs current="board" />
      <div className="mb-3 flex gap-2">
        <Link href="/admin/sales/board" className={chip(!everyone)}>Mine</Link>
        <Link href="/admin/sales/board?who=all" className={chip(everyone)}>Everyone</Link>
      </div>
      <SalesBoard
        key={`${everyone}-${leads.length}`}
        cards={leads.map((l) => ({ id: l.id, name: l.name, phone: l.phone, org: l.org, stage: l.stage, next_follow_up: l.next_follow_up, owner_email: l.owner_email, paid: l.paid }))}
        today={istToday()}
        ownerName={ownerName}
      />
    </>
  );
}
