import clsx from "clsx";
import Link from "next/link";

/** Applications and the interns' commissions, side by side in Admin → Internship. */
export function InternTabs({ current }: { current: "applications" | "commissions" }) {
  const tabs = [
    { href: "/admin/internship", label: "Applications", key: "applications" },
    { href: "/admin/internship/commissions", label: "Interns & commissions", key: "commissions" },
  ] as const;
  return (
    <nav aria-label="Internship" className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-line/25 px-4 sm:mx-0 sm:px-0">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.key === current ? "page" : undefined}
          className={clsx("-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-bold", t.key === current ? "border-red-strong text-ink" : "border-transparent text-muted hover:text-ink")}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
