import { signOutOfCompany } from "@/app/org/actions";
import { OrgNav, type OrgNavItem } from "@/components/company/OrgNav";
import type { CompanyMember, CompanyRole } from "@/lib/company/access";

export const ROLE_LABEL: Record<CompanyRole, string> = {
  hr: "HR",
  head: "Team head",
  employee: "Employee",
};

/** What each role can open. HR runs the company; a head and an employee each see their own slice of the learning page. */
export function navFor(member: CompanyMember): OrgNavItem[] {
  const base = `/org/${member.companySlug}`;
  switch (member.role) {
    case "hr":
      return [
        { href: base, label: "Overview" },
        { href: `${base}/people`, label: "People" },
        { href: `${base}/teams`, label: "Teams" },
        { href: `${base}/learning`, label: "Learning" },
      ];
    case "head":
      return [
        { href: base, label: "Overview" },
        { href: `${base}/learning`, label: "Team learning" },
      ];
    case "employee":
      return [
        { href: base, label: "Overview" },
        { href: `${base}/learning`, label: "My learning" },
      ];
  }
}

/** The dark band on every company page: whose workspace this is, in which role, and the way out. */
export function OrgHeader({ member }: { member: CompanyMember }) {
  return (
    <header className="bg-night text-paper">
      <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="min-w-0">
            <p className="display text-lg leading-none">
              KLYMB<span className="text-red-soft">.AI</span>
            </p>
            <p className="mt-2 truncate text-sm font-bold">
              {member.companyName}
              <span className="ml-2 border border-paper/30 px-1.5 py-0.5 align-middle text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-paper/80">
                {ROLE_LABEL[member.role]}
              </span>
            </p>
          </div>
          <div className="flex min-w-0 items-center gap-4 text-xs">
            <span className="min-w-0 truncate text-paper/70" title={member.email}>{member.email}</span>
            <form action={signOutOfCompany}>
              <button type="submit" className="whitespace-nowrap font-bold underline underline-offset-4 hover:text-red-soft">
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
