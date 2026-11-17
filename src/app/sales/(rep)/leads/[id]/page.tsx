import { notFound } from "next/navigation";
import { LeadDetail } from "@/components/admin/sales/LeadDetail";
import { requireSalesUser } from "@/lib/admin/auth";
import { getLead, getOwners } from "@/lib/admin/sales";

/** A rep's lead. getLead returns nothing for a lead that isn't theirs. */
export default async function RepLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSalesUser();
  const [found, owners] = await Promise.all([getLead((await params).id), getOwners()]);
  if (!found) notFound();
  return <LeadDetail lead={found.lead} touches={found.touches} owners={owners} user={user} base="/sales" />;
}
