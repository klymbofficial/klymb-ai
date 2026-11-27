import type { Metadata } from "next";
import { SettingsCard, SettingsHead } from "@/components/company/SettingsParts";
import { requireCompany } from "@/lib/company/auth";
import { contact } from "@/data/config";

export const metadata: Metadata = { title: "API details", robots: { index: false, follow: false } };

/** Klymb has no public API yet, so this says so plainly rather than handing out keys that do nothing. */
export default async function ApiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireCompany(slug);
  return (
    <>
      <SettingsHead title="API details" />
      <SettingsCard>
        <p className="text-sm">Klymb doesn&apos;t have a public API yet, so there are no API keys to create.</p>
        <p className="mt-2 text-sm text-muted">If you&apos;d like to send invitations or read results from your own systems, write to <a href={`mailto:${contact.email}?subject=API%20access`} className="font-semibold text-ink underline underline-offset-2">{contact.email}</a> and tell us what you need.</p>
      </SettingsCard>
    </>
  );
}
