import { PageTitle } from "@/components/admin/PageTitle";
import { SalesBoard } from "@/components/admin/sales/SalesBoard";
import { RepTabs } from "@/components/admin/sales/SalesTabs";
import { requireSalesUser } from "@/lib/admin/auth";
import { getLeads } from "@/lib/admin/sales";
import { istToday } from "@/lib/sales";

export default async function RepBoardPage() {
  const user = await requireSalesUser();
  const leads = await getLeads({});
  return (
    <>
      <PageTitle eyebrow="Sales" title="My pipeline" intro="Your leads as cards in their stage. Drag a card to another column to move it." />
      <RepTabs current="board" />
      <SalesBoard
        key={leads.length}
        cards={leads.map((l) => ({ id: l.id, name: l.name, phone: l.phone, email: l.email, org: l.org, stage: l.stage, next_follow_up: l.next_follow_up, owner_email: l.owner_email, paid: l.paid }))}
        today={istToday()}
        ownerName={{ [user.email]: "You" }}
        base="/sales"
      />
    </>
  );
}
