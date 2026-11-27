import type { Metadata } from "next";
import { LoadError } from "@/components/company/OrgPanels";
import { CompanySwitchControl, SavedOnlyNote, SettingsCard, SettingsHead } from "@/components/company/SettingsParts";
import { requireSettingsAdmin } from "@/lib/company/settings-access";
import { loadCompanySettings } from "@/lib/company/settings-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Diversity and Inclusion", robots: { index: false, follow: false } };

export default async function DiversityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = await requireSettingsAdmin(slug);
  const sql = db();
  const company = sql ? await loadCompanySettings(sql, admin.companyId) : null;
  return (
    <>
      <SettingsHead title="Diversity and Inclusion" intro="Reduce bias when your team reviews candidates." />
      {company ? (
        <SettingsCard>
          <CompanySwitchControl slug={admin.companySlug} setting="hide_candidate_names" label="Hide candidate names during review" description="Reviewers see a candidate number instead of the name and email until a decision is recorded." initial={company.hide_candidate_names} />
          <SavedOnlyNote>Saved for your company. Review screens don&apos;t hide names yet; this setting will apply once they do.</SavedOnlyNote>
        </SettingsCard>
      ) : <LoadError what="This setting" />}
    </>
  );
}
