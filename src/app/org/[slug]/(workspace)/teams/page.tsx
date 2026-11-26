import type { Metadata } from "next";
import { LoadError, OrgPageTitle, RoleOnly } from "@/components/company/OrgPanels";
import { TeamWorkspace } from "@/components/company/TeamWorkspace";
import { isAdmin } from "@/lib/company/access";
import { requireCompany } from "@/lib/company/auth";
import { loadCompanyPeople } from "@/lib/company/people-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Team", robots: { index: false, follow: false } };

/**
 * Everyone inside the company (user, 26 Nov): teams, members, adding by hand
 * or CSV, roles, leads and moves, all on one page. `?add=admin` (the account
 * menu's Add admin) opens the add form with Admin chosen. Anyone but an admin
 * is told the page is for admins, and nothing is loaded.
 */
export default async function TeamPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const hr = await requireCompany(slug);
  if (!isAdmin(hr)) return <RoleOnly role="company admins" home={`/org/${hr.companySlug}`} />;
  const sql = db();
  const data = sql ? await loadCompanyPeople(sql, hr.companyId) : null;
  if (!data) return <><OrgPageTitle title="Team" /><LoadError what="Your team" /></>;
  return <TeamWorkspace key={sp.add === "admin" ? "add-admin" : "team"} slug={hr.companySlug} me={hr.email} data={data} addAdmin={sp.add === "admin"} />;
}
