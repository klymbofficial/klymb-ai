import type { Metadata } from "next";
import { LoadError } from "@/components/company/OrgPanels";
import { CompanySwitchControl, SavedOnlyNote, SettingsCard, SettingsHead } from "@/components/company/SettingsParts";
import { requireSettingsAdmin } from "@/lib/company/settings-access";
import { loadCompanySettings } from "@/lib/company/settings-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "EEO compliance", robots: { index: false, follow: false } };

export default async function EeoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = await requireSettingsAdmin(slug);
  const sql = db();
  const company = sql ? await loadCompanySettings(sql, admin.companyId) : null;
  return (
    <>
      <SettingsHead title="EEO compliance" intro="Equal employment opportunity reporting for your hiring." />
      {company ? (
        <SettingsCard>
          <CompanySwitchControl slug={admin.companySlug} setting="eeo_survey" label="Ask candidates an optional EEO survey" description="After submitting a test, candidates may answer a short, optional survey (gender, ethnicity, disability, veteran status). Answers are reported only in totals and never shown with a candidate's results." initial={company.eeo_survey} />
          <SavedOnlyNote>Saved for your company. Candidates aren&apos;t shown the survey yet; this setting will apply once it exists.</SavedOnlyNote>
        </SettingsCard>
      ) : <LoadError what="This setting" />}
    </>
  );
}
