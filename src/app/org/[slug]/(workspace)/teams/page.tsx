import type { Metadata } from "next";
import { LoadError, OrgPageTitle, RoleOnly } from "@/components/company/OrgPanels";
import { TeamsManager } from "@/components/company/TeamsManager";
import { isAdmin } from "@/lib/company/access";
import { requireCompany } from "@/lib/company/auth";
import { loadCompanyPeople } from "@/lib/company/people-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Teams", robots: { index: false, follow: false } };

/** 1.10: an admin creates teams, chooses each team's lead and moves people. Anyone else is told the page is for admins, and nothing is loaded. */
export default async function TeamsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hr = await requireCompany(slug);
  if (!isAdmin(hr)) return <RoleOnly role="company admins" home={`/org/${hr.companySlug}`} />;
  const sql = db();
  const data = sql ? await loadCompanyPeople(sql, hr.companyId) : null;

  return (
    <>
      <OrgPageTitle
        title="Teams"
        intro="Organize people into teams and assign team leads."
      />
      {data ? <TeamsManager slug={hr.companySlug} teams={data.teams} people={data.active} /> : <LoadError what="Your teams" />}
    </>
  );
}
