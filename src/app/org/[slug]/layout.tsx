import { notFound, redirect } from "next/navigation";
import { OrgHeader } from "@/components/company/OrgHeader";
import { allowCompany } from "@/lib/company/access";
import { getMember } from "@/lib/company/auth";

/**
 * The frame around every company page: whose workspace it is, the viewer's
 * role, and the tabs that role can open. Not signed in goes to the sign-in
 * page; signed in to a different company is a 404, so a URL can't be used to
 * find out which companies exist. Each page still checks access itself,
 * because a layout isn't re-run when someone moves between its pages.
 */
export default async function OrgLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await getMember();
  if (!member) redirect("/org/sign-in");
  if (!allowCompany(member, slug)) notFound();

  return (
    <div className="min-h-screen bg-surface">
      <OrgHeader member={member} />
      {/* pb-28: the site-wide help button floats bottom-right (64px + its margin). This leaves room to scroll the last row clear of it. */}
      <main className="mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:pt-10">{children}</main>
    </div>
  );
}
