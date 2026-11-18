import { notFound } from "next/navigation";
import { LeadDetail } from "@/components/admin/sales/LeadDetail";
import { requireSalesAdmin } from "@/lib/admin/auth";
import { getLead, getOwners } from "@/lib/admin/sales";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSalesAdmin();
  const [found, owners] = await Promise.all([getLead((await params).id), getOwners()]);
  if (!found) notFound();
  return (
    <LeadDetail
      lead={found.lead}
      touches={found.touches}
      owners={owners}
      user={{ email: admin.email, name: admin.name, role: "owner" }}
      base="/admin/sales"
    />
  );
}
