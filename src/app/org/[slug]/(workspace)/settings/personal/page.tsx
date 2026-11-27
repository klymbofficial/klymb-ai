import type { Metadata } from "next";
import { LoadError } from "@/components/company/OrgPanels";
import { ProfileForm, SettingsCard, SettingsHead } from "@/components/company/SettingsParts";
import { requireCompany } from "@/lib/company/auth";
import { loadMyProfile } from "@/lib/company/settings-data";
import { LANGUAGES, timeZones, zoneLabel } from "@/lib/company/settings-rules";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Personal Information", robots: { index: false, follow: false } };

/** The member's own details in this company: name, job title, contact number, timezone and language. */
export default async function PersonalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await requireCompany(slug);
  const sql = db();
  const profile = sql ? await loadMyProfile(sql, member.companyId, member.email) : null;
  const now = new Date();
  return (
    <>
      <SettingsHead title="Personal Information" />
      {profile ? (
        <SettingsCard>
          <ProfileForm slug={member.companySlug} profile={profile} zones={timeZones(profile.timeZone).map((z) => ({ value: z, label: zoneLabel(z, now) }))} languages={LANGUAGES} />
        </SettingsCard>
      ) : <LoadError what="Your details" />}
    </>
  );
}
