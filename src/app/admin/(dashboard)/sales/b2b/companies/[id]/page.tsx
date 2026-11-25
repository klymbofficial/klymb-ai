import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/admin/PageTitle";
import { CompanyForm, Contacts } from "@/components/admin/b2b/B2BForms";
import { B2BTabs, DealTable } from "@/components/admin/b2b/parts";
import { requireSalesAdmin } from "@/lib/admin/auth";
import { getB2BPeople, getCompany } from "@/lib/admin/b2b";
import { istToday } from "@/lib/sales";

export const metadata = { title: "Company · B2B" };

export default async function B2BCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSalesAdmin();
  const [found, people] = await Promise.all([getCompany((await params).id), getB2BPeople()]);
  if (!found) notFound();
  const { company: c, contacts, deals } = found;
  return (
    <>
      <PageTitle
        eyebrow="Sales · B2B · Company"
        title={c.name}
        intro={[c.industry, c.city, c.employees && `${c.employees} people`].filter(Boolean).join(" · ") || undefined}
        actions={<Link href={`/admin/sales/b2b/deals/new?company=${c.id}`} className="bg-ink px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-paper">+ New deal with {c.name.split(" ")[0]}</Link>}
      />
      <B2BTabs current="companies" />

      <div className="mb-6 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" className="underline">{c.website.replace(/^https:\/\//, "")}</a>}
        {c.linkedin && <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="underline">LinkedIn</a>}
        {c.workspace_slug
          ? <span>Workspace <Link href={`/org/${c.workspace_slug}`} className="font-bold underline">/org/{c.workspace_slug}</Link><span className="text-muted nums"> · {c.workspace_members ?? 0} of {c.workspace_seats ?? 0} seats used</span></span>
          : <span className="text-muted">No workspace yet. It is created from a signed deal.</span>}
      </div>

      <h2 className="display mb-3 text-2xl">Deals</h2>
      <DealTable deals={deals} people={people} me={admin.email} today={istToday()} />

      <section className="card mt-8 p-5">
        <h2 className="display mb-2 text-xl">People</h2>
        <Contacts companyId={c.id} contacts={contacts} />
      </section>

      <h2 className="display mb-3 mt-8 text-2xl">Company details</h2>
      <CompanyForm
        key={c.name + (c.gstin ?? "")}
        id={c.id}
        value={{
          name: c.name, industry: c.industry ?? "", employees: c.employees ?? "", city: c.city ?? "", website: c.website ?? "",
          linkedin: c.linkedin ?? "", gstin: c.gstin ?? "", billing_address: c.billing_address ?? "", notes: c.notes ?? "",
        }}
      />
    </>
  );
}
