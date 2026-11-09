"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface OrgNavItem {
  href: string;
  label: string;
}

/** The workspace tabs. The role decides which are passed in; this only marks the current one. */
export function OrgNav({ items }: { items: OrgNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Company sections" className="-mx-1 flex gap-1 overflow-x-auto px-1">
      {items.map((item, i) => {
        // The first item is the overview, which must match exactly or it would light up on every page.
        const current = i === 0 ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={clsx(
              "whitespace-nowrap px-3 py-2 text-sm font-bold transition-colors",
              current ? "bg-paper text-ink" : "text-paper/70 hover:bg-paper/10 hover:text-paper",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
