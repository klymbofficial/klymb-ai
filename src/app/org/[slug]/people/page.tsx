import type { Metadata } from "next";
import { LoadError, OrgPageTitle, RoleOnly } from "@/components/company/OrgPanels";
import { PeopleManager } from "@/components/company/PeopleManager";
import { requireCompany } from "@/lib/company/auth";
import { loadCompanyPeople } from "@/lib/company/people-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "People", robots: { index: false, follow: false } };

/** 1.8 and 1.11: HR adds people one at a time or by CSV, and removes them. Another role is told the page is HR's, and nothing is loaded. */
export default async function PeoplePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hr = await requireCompany(slug);
  if (hr.role !== "hr") return <RoleOnly role="HR" home={`/org/${hr.companySlug}`} />;
  const sql = db();
  const data = sql ? await loadCompanyPeople(sql, hr.companyId) : null;

  return (
    <>
      <OrgPageTitle
        title="People"
        intro="Add people one at a time or upload a CSV. Each person is emailed how to sign in. Removing someone ends their access at once and frees their seat; their record is kept."
      />
      {data ? <PeopleManager slug={hr.companySlug} me={hr.email} data={data} /> : <LoadError what="Your people" />}
    </>
  );
}
