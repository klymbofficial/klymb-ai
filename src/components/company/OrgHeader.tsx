import type { CSSProperties } from "react";
import { signOutOfCompany } from "@/app/org/actions";
import { OrgNav, type OrgNavItem } from "@/components/company/OrgNav";
import { BrandMark } from "@/components/company/BrandMark";
import { isAdmin, ROLE_LABEL, viewOf, type CompanyMember } from "@/lib/company/access";
import type { ResolvedBrand } from "@/lib/company/branding";
import { seesAssessments } from "@/lib/company/assessment-rules";
import { seesHiring } from "@/lib/company/batch-rules";
import { seesCatalog } from "@/lib/company/catalog";

const UPSKILL_LABEL = { company: "Upskill", team: "Team Upskill", self: "My Upskill" } as const;

/**
 * What a member can open. Responsibilities add up: an admin runs People,
 * Teams and Branding; anyone who chooses courses or tests opens the
 * Catalog; the people who hire, and admins, open Assessments and Hiring; the learning
 * tab shows the widest view they have (the company, their team, or
 * themselves).
 */
export function navFor(member: CompanyMember): OrgNavItem[] {
  const base = `/org/${member.companySlug}`;
  return [
    { href: base, label: "Overview" },
    ...(isAdmin(member)
      ? [
          { href: `${base}/people`, label: "People" },
          { href: `${base}/teams`, label: "Teams" },
        ]
      : []),
    { href: `${base}/learning`, label: UPSKILL_LABEL[viewOf(member)] },
    ...(seesCatalog(member) ? [{ href: `${base}/catalog`, label: "Catalog" }] : []),
    ...(seesAssessments(member) ? [{ href: `${base}/assessments`, label: "Assessments" }] : []),
    ...(seesHiring(member) ? [{ href: `${base}/hiring`, label: "Hiring" }] : []),
    ...(isAdmin(member) ? [{ href: `${base}/branding`, label: "Branding" }] : []),
  ];
}

/**
 * The band on every company page: whose workspace this is (their logo and
 * name, on their accent when they have published one), the viewer's
 * responsibilities, and the way out. Text on the band is always full white:
 * a published accent carries white at AA, and nothing lighter would.
 */
export function OrgHeader({ member, brand }: { member: CompanyMember; brand: ResolvedBrand }) {
  return (
    // The focus ring reads --color-red; on this band it is white, so it shows on any accent and on Klymb's dark band.
    <header className={brand.accent ? "bg-[var(--brand-accent)] text-white" : "bg-night text-paper"} style={{ "--color-red": "#ffffff" } as CSSProperties}>
      <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <BrandMark name={brand.name} logoUrl={brand.logoUrl} logoAlt={brand.logoAlt} />
            <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {member.roles.map((r) => (
                <span key={r} className="border border-current px-1.5 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-[0.14em]">
                  {ROLE_LABEL[r]}
                </span>
              ))}
              <span className="font-semibold">on Klymb.ai</span>
            </p>
          </div>
          <div className="flex min-w-0 items-center gap-4 text-xs">
            <span className="min-w-0 truncate" title={member.email}>{member.email}</span>
            <form action={signOutOfCompany}>
              <button type="submit" className="whitespace-nowrap font-bold underline underline-offset-4 hover:no-underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <div className="mt-4">
          <OrgNav items={navFor(member)} />
        </div>
      </div>
    </header>
  );
}
