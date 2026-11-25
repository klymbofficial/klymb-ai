import { PageTitle } from "@/components/admin/PageTitle";
import { NewDealForm } from "@/components/admin/b2b/B2BForms";
import { B2BTabs } from "@/components/admin/b2b/parts";
import { SalesTabs } from "@/components/admin/sales/SalesTabs";
import { requireSalesAdmin } from "@/lib/admin/auth";
import { getB2BPeople, getCompanyChoices } from "@/lib/admin/b2b";

export const metadata = { title: "New B2B deal · Sales" };

export default async function NewB2BDealPage({ searchParams }: { searchParams: Promise<{ company?: string }> }) {
  const admin = await requireSalesAdmin();
  const [companies, people, sp] = await Promise.all([getCompanyChoices(), getB2BPeople(), searchParams]);
  const preset = companies.some((c) => c.id === sp.company) ? sp.company : undefined;
  return (
    <>
      <PageTitle eyebrow="Sales · B2B" title="New deal" intro="A company, the person you're talking to, and what you're selling. The next step and its date are required, so no deal goes quiet." />
      <SalesTabs current="b2b" />
      <B2BTabs current="none" />
      <NewDealForm companies={companies} people={people} me={admin.email} companyId={preset} />
    </>
  );
}
