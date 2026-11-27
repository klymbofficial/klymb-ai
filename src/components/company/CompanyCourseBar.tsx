import Link from "next/link";
import { BrandMark } from "@/components/company/BrandMark";
import type { ResolvedBrand } from "@/lib/company/branding";

/** What the course app needs to say who assigned the course. Plain data, so it can cross to the client. */
export type CourseCompany = Pick<ResolvedBrand, "name" | "slug" | "logoUrl" | "logoAlt" | "accent">;

/**
 * "Assigned by <company>", with the way back to its workspace, on a course a
 * company assigned. The course itself keeps Klymb's look: the same person may
 * also be learning on their own account. In the sidebar on a desktop; as a
 * strip at the top of the scrolling area on a phone, so it never covers the
 * tabs at the bottom.
 */
export function CompanyCourseBar({ company, variant }: { company: CourseCompany; variant: "sidebar" | "strip" }) {
  const workspace = `/org/${company.slug}`;
  if (variant === "sidebar") {
    return (
      <div className="mx-6 border-l-4 bg-white px-3 py-3" style={{ borderColor: company.accent ?? "currentColor" }}>
        <div className="text-[11px] font-semibold tracking-[0.1em] text-sd-n-700 uppercase">Assigned by</div>
        <BrandMark name={company.name} logoUrl={company.logoUrl} logoAlt={company.logoAlt} stack className="mt-1.5 text-sd-ink" />
        <Link href={workspace} className="mt-2 block text-xs font-bold text-sd-n-700 underline underline-offset-2 hover:text-sd-ink">
          Back to {company.name}&apos;s workspace
        </Link>
      </div>
    );
  }
  return (
    <div
      className={company.accent ? "flex flex-none items-center justify-between gap-3 px-5 py-2 text-white lg:hidden" : "flex flex-none items-center justify-between gap-3 bg-sd-ink px-5 py-2 text-sd-bg lg:hidden"}
      style={company.accent ? { backgroundColor: company.accent } : undefined}
    >
      <span className="flex min-w-0 items-center gap-2 text-xs">
        <span className="shrink-0 font-semibold">Assigned by</span>
        <BrandMark name={company.name} logoUrl={company.logoUrl} logoAlt={company.logoAlt} showName={false} />
      </span>
      <Link href={workspace} className="shrink-0 text-xs font-bold underline underline-offset-2">Workspace</Link>
    </div>
  );
}
