import type { Metadata } from "next";
import { BrandingEditor } from "@/components/company/BrandingEditor";
import { LoadError } from "@/components/company/OrgPanels";
import { CompanyInfoForm, SettingsCard, SettingsHead } from "@/components/company/SettingsParts";
import { loadBranding } from "@/lib/company/branding-data";
import { requireSettingsAdmin } from "@/lib/company/settings-access";
import { loadCompanySettings } from "@/lib/company/settings-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Company Information", robots: { index: false, follow: false } };

/** The company's contact details, then its branding (name, logo, accent, welcome, support), all for admins. */
export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = await requireSettingsAdmin(slug);
  const sql = db();
  const [company, branding] = sql ? await Promise.all([loadCompanySettings(sql, admin.companyId), loadBranding(sql, admin.companyId)]) : [null, null];
  return (
    <>
      <SettingsHead title="Company Details" />
      {company ? <SettingsCard><CompanyInfoForm slug={admin.companySlug} company={company} /></SettingsCard> : <LoadError what="Your company's details" />}
      <h2 className="mb-1 mt-10 text-xl font-semibold">Branding</h2>
      <p className="mb-5 text-sm text-muted">Customize your workspace and invitations. Preview your draft before publishing.</p>
      {branding ? (
        <BrandingEditor slug={admin.companySlug} company={branding.company} draft={branding.draft} published={branding.published} draftSaved={branding.draftUpdatedAt !== null} publishedAt={branding.publishedAt} />
      ) : <LoadError what="Your branding" />}
    </>
  );
}
