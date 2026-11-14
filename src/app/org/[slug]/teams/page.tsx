import type { Metadata } from "next";
import { LoadError, OrgPageTitle, RoleOnly } from "@/components/company/OrgPanels";
import { TeamsManager } from "@/components/company/TeamsManager";
import { requireCompany } from "@/lib/company/auth";
import { loadCompanyPeople } from "@/lib/company/people-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Teams", robots: { index: false, follow: false } };

/** 1.10: HR creates teams, chooses each team's head and moves people. Another role is told the page is HR's, and nothing is loaded. */
export default async function TeamsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hr = await requireCompany(slug);
  if (hr.role !== "hr") return <RoleOnly role="HR" home={`/org/${hr.companySlug}`} />;
  const sql = db();
  const data = sql ? await loadCompanyPeople(sql, hr.companyId) : null;

  return (
    <>
      <OrgPageTitle
        title="Teams"
        intro="Create teams, choose one head for each, and move people between them. A team's head sees their own team; a head who moves to another team becomes an employee there."
      />
      {data ? <TeamsManager slug={hr.companySlug} teams={data.teams} people={data.active} /> : <LoadError what="Your teams" />}
    </>
  );
}
