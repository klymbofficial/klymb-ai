import clsx from "clsx";
import Link from "next/link";
import { PageTitle } from "@/components/admin/PageTitle";
import { B2BBoard } from "@/components/admin/b2b/B2BBoard";
import { B2BTabs, personName } from "@/components/admin/b2b/parts";
import { requireSalesAdmin } from "@/lib/admin/auth";
import { getB2BPeople, getDeals } from "@/lib/admin/b2b";
import { istToday } from "@/lib/sales";

export const metadata = { title: "B2B board · Sales" };

export default async function B2BBoardPage({ searchParams }: { searchParams: Promise<{ who?: string; q?: string }> }) {
  const admin = await requireSalesAdmin();
  const sp = await searchParams;
  const mine = sp.who === "me";
  const [deals, people] = await Promise.all([getDeals({ owner: mine ? admin.email : undefined, q: sp.q }), getB2BPeople()]);
  const chip = (active: boolean) => clsx("border px-2.5 py-1 text-xs font-bold", active ? "border-ink bg-ink text-paper" : "border-line/40 hover:bg-surface");
  const q = sp.q ? `q=${encodeURIComponent(sp.q)}` : "";

  return (
    <>
      <PageTitle eyebrow="Sales · B2B" title="Deal board" intro="Every deal in its stage, with each column's value. Drag a card to move it. Signed needs every document signed first." />
      <B2BTabs current="board" />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link href={`/admin/sales/b2b/board${q ? `?${q}` : ""}`} className={chip(!mine)}>Everyone</Link>
        <Link href={`/admin/sales/b2b/board?who=me${q ? `&${q}` : ""}`} className={chip(mine)}>Mine</Link>
        <form method="get" className="ml-auto flex items-center gap-2">
          {mine && <input type="hidden" name="who" value="me" />}
          <input name="q" defaultValue={sp.q} placeholder="Search company or deal" className="w-56 border border-line/50 bg-white px-2.5 py-1.5 text-sm focus:border-ink focus:outline-none" />
        </form>
      </div>
      <B2BBoard
        key={`${mine}-${sp.q ?? ""}-${deals.length}-${deals.map((d) => d.stage).join("")}`}
        today={istToday()}
        cards={deals.map((d) => ({
          id: d.id, title: d.title, company_name: d.company_name, stage: d.stage, stage_changed_at: d.stage_changed_at,
          value_inr: d.value_inr, seats: d.seats, next_step_date: d.next_step_date, next_step: d.next_step,
          owner: personName(people, d.owner_email, admin.email), pending_docs: d.pending_docs, status_note: d.status_note,
        }))}
      />
    </>
  );
}
