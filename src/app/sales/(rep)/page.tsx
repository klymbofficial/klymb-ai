import Link from "next/link";
import { PageTitle } from "@/components/admin/PageTitle";
import { SalesSheet } from "@/components/admin/sales/SalesSheet";
import { RepTabs } from "@/components/admin/sales/SalesTabs";
import { requireSalesUser } from "@/lib/admin/auth";
import { getLeads } from "@/lib/admin/sales";
import { istToday } from "@/lib/sales";

/** An intern's day: their follow-ups due today and overdue, oldest first. */
export default async function RepTodayPage() {
  const user = await requireSalesUser();
  const rows = await getLeads({ due: true });
  const first = (user.name ?? "").split(" ")[0];

  return (
    <>
      <PageTitle
        eyebrow="Today"
        title={first ? `Hi ${first}, here's your day` : "Your day"}
        intro="Your follow-ups due today and overdue. Tap WhatsApp or Call (it's logged for you). After a call, pick how it went and the next date is set."
      />
      <RepTabs current="today" />
      {rows.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="display text-2xl">Nothing due right now</p>
          <p className="mt-2 text-sm text-muted">Open <Link href="/sales/list" className="font-bold underline">My leads</Link> to reach out to someone new.</p>
        </div>
      ) : (
        <SalesSheet rows={rows} today={istToday()} owners={[]} base="/sales" canAssign={false} quickAdd={false} />
      )}
      <p className="mt-3 text-xs text-muted">{rows.length} due.</p>
    </>
  );
}
