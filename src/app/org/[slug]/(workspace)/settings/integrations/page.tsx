import type { Metadata } from "next";
import { SettingsCard, SettingsHead } from "@/components/company/SettingsParts";
import { contact } from "@/data/config";
import { requireSettingsAdmin } from "@/lib/company/settings-access";

export const metadata: Metadata = { title: "Integrations", robots: { index: false, follow: false } };

/** No integrations exist yet; this says so rather than showing connectors that do nothing. */
export default async function IntegrationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireSettingsAdmin(slug);
  return (
    <>
      <SettingsHead title="Integrations" />
      <SettingsCard>
        <p className="text-sm">Klymb doesn&apos;t connect to other tools yet, such as an applicant tracking system or HR software.</p>
        <p className="mt-2 text-sm text-muted">Tell us which tool your company uses at <a href={`mailto:${contact.email}?subject=Integrations`} className="font-semibold text-ink underline underline-offset-2">{contact.email}</a>, and we&apos;ll let you know when it&apos;s available.</p>
      </SettingsCard>
    </>
  );
}
