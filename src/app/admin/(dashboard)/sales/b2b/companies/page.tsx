import Link from "next/link";
import { PageTitle } from "@/components/admin/PageTitle";
import { CompanyForm } from "@/components/admin/b2b/B2BForms";
import { B2BTabs } from "@/components/admin/b2b/parts";
import { SalesTabs } from "@/components/admin/sales/SalesTabs";
import { requireSalesAdmin } from "@/lib/admin/auth";
import { getCompanies } from "@/lib/admin/b2b";
import { inr } from "@/lib/b2b";

export const metadata = { title: "B2B companies · Sales" };

export default async function B2BCompaniesPage({ searchParams }: { searchParams: Promise<{ q?: string; add?: string }> }) {
  await requireSalesAdmin();
  const sp = await searchParams;
  const companies = await getCompanies(sp.q);
  return (
    <>
      <PageTitle eyebrow="Sales · B2B" title="Companies" intro="Each company once, with its people and every deal with it: a pilot first, then more seats." />
      <SalesTabs current="b2b" />
      <B2BTabs current="companies" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form method="get" className="flex items-center gap-2">
          <input name="q" defaultValue={sp.q} placeholder="Search name or city" className="w-56 border border-line/50 bg-white px-2.5 py-1.5 text-sm focus:border-ink focus:outline-none" />
        </form>
        <Link href={sp.add ? "/admin/sales/b2b/companies" : "/admin/sales/b2b/companies?add=1"} className="ml-auto border border-line/50 px-3 py-1.5 text-xs font-bold hover:bg-surface">{sp.add ? "Close" : "+ Add a company"}</Link>
      </div>
      {sp.add && <div className="mb-6"><CompanyForm id={null} /></div>}
      {companies.length === 0 ? <p className="card p-5 text-sm text-muted">No companies yet. Adding a deal adds its company too.</p> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line/25 text-[11px] font-extrabold uppercase tracking-wider text-muted">
              <tr><th className="px-3 py-2">Company</th><th className="px-3 py-2">Main contact</th><th className="px-3 py-2 text-right">Deals</th><th className="px-3 py-2 text-right">Open</th><th className="px-3 py-2 text-right">Signed</th><th className="px-3 py-2">Workspace</th></tr>
            </thead>
            <tbody className="divide-y divide-line/15">
              {companies.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2.5"><Link href={`/admin/sales/b2b/companies/${c.id}`} className="font-bold hover:underline">{c.name}</Link><p className="text-xs text-muted">{[c.industry, c.city, c.employees && `${c.employees} people`].filter(Boolean).join(" · ")}</p></td>
                  <td className="px-3 py-2.5 text-xs">{c.contact_name ?? <span className="text-muted">None yet</span>}</td>
                  <td className="px-3 py-2.5 text-right nums">{c.deals}</td>
                  <td className="px-3 py-2.5 text-right nums">{c.open_value ? inr(c.open_value) : "—"}</td>
                  <td className="px-3 py-2.5 text-right nums font-bold">{c.signed_value ? inr(c.signed_value) : "—"}</td>
                  <td className="px-3 py-2.5 text-xs">{c.workspace_slug ? <Link href={`/org/${c.workspace_slug}`} className="underline">/org/{c.workspace_slug}</Link> : <span className="text-muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
