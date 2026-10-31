import type { Metadata } from "next";
import { HrPageHeader } from "@/components/company/HrPageHeader";
import { TeamsManager } from "@/components/company/TeamsManager";
import { requireCompany } from "@/lib/company/auth";
import { loadCompanyPeople } from "@/lib/company/people-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Teams", robots: { index: false, follow: false } };

/** 1.10: HR creates teams, chooses each team's head and moves people. HR only; anyone else gets a 404. */
export default async function TeamsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hr = await requireCompany(slug, ["hr"]);
  const sql = db();
  const data = sql ? await loadCompanyPeople(sql, hr.companyId) : null;

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <HrPageHeader
          slug={hr.companySlug}
          companyName={hr.companyName}
          active="teams"
          intro="Create teams, choose one head for each, and move people between them. A team's head sees their own team; a head who moves to another team becomes an employee there."
        />
        {data ? (
          <TeamsManager slug={hr.companySlug} teams={data.teams} people={data.active} />
        ) : (
          <p role="alert" className="border-2 border-error bg-error-tint p-4 text-sm font-semibold text-error">
            Your teams can&apos;t be loaded right now. Please try again in a minute.
          </p>
        )}
      </div>
    </main>
  );
}
