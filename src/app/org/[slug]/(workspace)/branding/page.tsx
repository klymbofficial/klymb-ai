import type { Metadata } from "next";
import { BrandingEditor } from "@/components/company/BrandingEditor";
import { LoadError, OrgPageTitle, RoleOnly } from "@/components/company/OrgPanels";
import { isAdmin } from "@/lib/company/access";
import { requireCompany } from "@/lib/company/auth";
import { loadBranding } from "@/lib/company/branding-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Branding", robots: { index: false, follow: false } };

/**
 * An admin sets how the workspace looks: name, logo, accent, welcome and
 * support contact. They save a draft, see it in the preview, and publish it;
 * nobody else sees anything until then. Anyone else is told the page is for
 * admins, and nothing is loaded.
 */
export default async function BrandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = await requireCompany(slug);
  if (!isAdmin(admin)) return <RoleOnly role="company admins" home={`/org/${admin.companySlug}`} />;
  const sql = db();
  const state = sql ? await loadBranding(sql, admin.companyId) : null;

  return (
    <>
      <OrgPageTitle
        title="Branding"
        intro="Customize your workspace and invitations. Preview your draft before publishing."
      />
      {state ? (
        <BrandingEditor
          slug={admin.companySlug}
          company={state.company}
          draft={state.draft}
          published={state.published}
          draftSaved={state.draftUpdatedAt !== null}
          publishedAt={state.publishedAt}
        />
      ) : (
        <LoadError what="Your branding" />
      )}
    </>
  );
}
