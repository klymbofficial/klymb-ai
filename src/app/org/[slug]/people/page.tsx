import type { Metadata } from "next";
import { HrPageHeader } from "@/components/company/HrPageHeader";
import { PeopleManager } from "@/components/company/PeopleManager";
import { requireCompany } from "@/lib/company/auth";
import { loadCompanyPeople } from "@/lib/company/people-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "People", robots: { index: false, follow: false } };

/** 1.8 and 1.11: HR adds people one at a time or by CSV, and removes them. HR only; anyone else gets a 404. */
export default async function PeoplePage({ params }: { params: Promise<{ slug: string }> }) {
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
          active="people"
          intro="Add people one at a time or upload a CSV. Each person gets an email with how to sign in. Removing someone ends their access at once and frees their seat; what they've done is kept."
        />
        {data ? (
          <PeopleManager slug={hr.companySlug} me={hr.email} data={data} />
        ) : (
          <p role="alert" className="border-2 border-error bg-error-tint p-4 text-sm font-semibold text-error">
            Your people can&apos;t be loaded right now. Please try again in a minute.
          </p>
        )}
      </div>
    </main>
  );
}
