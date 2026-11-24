import type { Metadata } from "next";
import { LoadError, OrgPageTitle, RoleOnly } from "@/components/company/OrgPanels";
import { PeopleManager } from "@/components/company/PeopleManager";
import { isAdmin } from "@/lib/company/access";
import { requireCompany } from "@/lib/company/auth";
import { loadCompanyPeople } from "@/lib/company/people-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "People", robots: { index: false, follow: false } };

/** 1.8 and 1.11: an admin adds people one at a time or by CSV, sets what each does, and removes them. Anyone else is told the page is for admins, and nothing is loaded. */
export default async function PeoplePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hr = await requireCompany(slug);
  if (!isAdmin(hr)) return <RoleOnly role="company admins" home={`/org/${hr.companySlug}`} />;
  const sql = db();
  const data = sql ? await loadCompanyPeople(sql, hr.companyId) : null;

  return (
    <>
      <OrgPageTitle
        title="People"
        intro="Manage people, roles and seats. Add individually or import a CSV."
      />
      {data ? <PeopleManager slug={hr.companySlug} me={hr.email} data={data} /> : <LoadError what="Your people" />}
    </>
  );
}
