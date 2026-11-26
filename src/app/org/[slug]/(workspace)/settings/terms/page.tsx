import type { Metadata } from "next";
import Link from "next/link";
import { SettingsCard, SettingsHead } from "@/components/company/SettingsParts";
import { requireSettingsAdmin } from "@/lib/company/settings-access";

export const metadata: Metadata = { title: "Terms of Use", robots: { index: false, follow: false } };

/** The terms your company uses Klymb under, with the documents they point to. */
export default async function TermsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireSettingsAdmin(slug);
  return (
    <>
      <SettingsHead title="Terms of Use" />
      <SettingsCard>
        <p className="text-sm">Your company uses Klymb under Klymb&apos;s terms and privacy policy. Candidates and employees agree to the same terms when they sign in.</p>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          <li><Link href="/terms" target="_blank" className="font-semibold text-[#1f4fd1] hover:underline">Terms of Use ↗</Link></li>
          <li><Link href="/privacy" target="_blank" className="font-semibold text-[#1f4fd1] hover:underline">Privacy Policy ↗</Link></li>
          <li><Link href="/cookies" target="_blank" className="font-semibold text-[#1f4fd1] hover:underline">Cookie Policy ↗</Link></li>
        </ul>
      </SettingsCard>
    </>
  );
}
