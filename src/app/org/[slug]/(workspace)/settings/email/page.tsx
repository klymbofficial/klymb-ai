import type { Metadata } from "next";
import { LoadError } from "@/components/company/OrgPanels";
import { EmailUpdatesSwitch, SavedOnlyNote, SettingsCard, SettingsHead } from "@/components/company/SettingsParts";
import { requireCompany } from "@/lib/company/auth";
import { loadMyProfile } from "@/lib/company/settings-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Email preferences", robots: { index: false, follow: false } };

/** Which optional emails the member wants. Invitations, sign-in codes and other emails about their work always arrive. */
export default async function EmailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await requireCompany(slug);
  const sql = db();
  const profile = sql ? await loadMyProfile(sql, member.companyId, member.email) : null;
  return (
    <>
      <SettingsHead title="Email preferences" intro="Emails you need, like sign-in codes and test invitations, always arrive. These are the optional ones." />
      {profile ? (
        <SettingsCard>
          <EmailUpdatesSwitch slug={member.companySlug} initial={profile.accountUpdates} />
          <SavedOnlyNote>Your choice is saved. Klymb doesn&apos;t send the biweekly update yet; when it starts, it will follow this setting.</SavedOnlyNote>
        </SettingsCard>
      ) : <LoadError what="Your email preferences" />}
    </>
  );
}
