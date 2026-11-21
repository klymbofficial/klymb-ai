import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { BrandSupport } from "@/components/company/BrandSupport";
import { brandProps } from "@/components/company/brand-style";
import { OrgHeader } from "@/components/company/OrgHeader";
import { allowCompany } from "@/lib/company/access";
import { getMemberships, getWorkspaceMember } from "@/lib/company/auth";
import { getPublishedBrand } from "@/lib/company/branding-data";
import { ORG_PATH_HEADER, signInHref } from "@/lib/company/return-path";

/**
 * The frame around every company page: the company's published brand (logo,
 * name, accent, support contact), the viewer's responsibilities, and the tabs
 * they can open. The workspace comes from the URL and the role from the
 * viewer's membership of it.
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

  return (
    <div className="min-h-screen bg-surface" {...brandProps(brand.accent)}>
      <OrgHeader member={member} brand={brand} />
      {/* pb-28: the site-wide help button floats bottom-right (64px + its margin). This leaves room to scroll the last row clear of it. */}
      <main className="mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:pt-10">
        {children}
        <BrandSupport brand={brand} className="mt-12 border-t border-line/25 pt-5" />
      </main>
    </div>
  );
}
