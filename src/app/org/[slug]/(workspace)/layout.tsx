import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { BrandSupport } from "@/components/company/BrandSupport";
import { brandProps } from "@/components/company/brand-style";
import { NavProgress } from "@/components/company/NavFeedback";
import { OrgSidebar } from "@/components/company/OrgSidebar";
import { contact } from "@/data/config";
import { allowCompany, ROLE_LABEL } from "@/lib/company/access";
import { getMemberships, getWorkspaceMember } from "@/lib/company/auth";
import { getPublishedBrand } from "@/lib/company/branding-data";
import { hasMyInvitations } from "@/lib/company/my-assessments";
import { navGroupsFor } from "@/lib/company/nav";
import { db } from "@/lib/db/client";
import { ORG_PATH_HEADER, signInHref } from "@/lib/company/return-path";

/**
 * The frame around every company page: a sidebar with the company's published
 * brand (logo, name, accent, support contact), the sections the viewer's
 * roles open, and their account; the page itself on a light ground beside it.
 * The workspace comes from the URL and the role from the viewer's membership
 * of it.
 *
 * Not a member of any workspace (signed out, or signed in some other way) goes
 * to this workspace's branded sign-in page, which brings them back to the page
 * they asked for. Signed in to a different company is a 404. Each page still
 * checks access itself, because a layout isn't re-run when someone moves
 * between its pages.
 */
export default async function OrgLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await getWorkspaceMember(slug);
  if (!allowCompany(member, slug)) {
    if ((await getMemberships()).length) notFound();
    redirect(signInHref((await headers()).get(ORG_PATH_HEADER) ?? `/org/${slug.toLowerCase()}`));
  }
  const brand = await getPublishedBrand(member);
  const sql = db();
  const myAssessments = sql ? await hasMyInvitations(sql, member.companyId, member.email) : false;

  return (
    <div className="min-h-screen bg-paper lg:flex" {...brandProps(brand.accent)}>
      <NavProgress />
      <OrgSidebar
        groups={navGroupsFor(member, { myAssessments })}
        brand={{ name: brand.name, logoUrl: brand.logoUrl, logoAlt: brand.logoAlt }}
        email={member.email}
        roles={member.roles.map((r) => ROLE_LABEL[r])}
        supportHref={`mailto:${brand.supportEmail ?? contact.email}`}
      />
      {/* pb-28: the site-wide help button floats bottom-right (64px + its margin). This leaves room to scroll the last row clear of it. */}
      <main className="min-w-0 flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pt-8">
        <div className="mx-auto max-w-6xl">
          {children}
          <BrandSupport brand={brand} className="mt-12 border-t border-line/25 pt-5" />
        </div>
      </main>
    </div>
  );
}
