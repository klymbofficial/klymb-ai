import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { OrgHeader } from "@/components/company/OrgHeader";
import { allowCompany } from "@/lib/company/access";
import { getMember, getWorkspaceMember } from "@/lib/company/auth";
import { ORG_PATH_HEADER, signInHref } from "@/lib/company/return-path";

/**
 * The frame around every company page: whose workspace it is, the viewer's
 * role, and the tabs that role can open. The workspace comes from the URL and
 * the role from the viewer's membership of it.
 *
 * Not a member of any workspace (signed out, or signed in some other way) goes
 * to the sign-in page, which brings them back to the page they asked for.
 * Signed in to a different company is a 404, so a URL can't be used to find
 * out which companies exist. Each page still checks access itself, because a
 * layout isn't re-run when someone moves between its pages.
 */
export default async function OrgLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await getWorkspaceMember(slug);
  if (!allowCompany(member, slug)) {
    if (await getMember()) notFound();
    redirect(signInHref((await headers()).get(ORG_PATH_HEADER)));
  }

  return (
    <div className="min-h-screen bg-surface">
      <OrgHeader member={member} />
      {/* pb-28: the site-wide help button floats bottom-right (64px + its margin). This leaves room to scroll the last row clear of it. */}
      <main className="mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:pt-10">{children}</main>
    </div>
  );
}
