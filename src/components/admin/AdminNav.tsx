"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/registrations", label: "Registrations" },
  { href: "/admin/analytics", label: "Traffic" },
  { href: "/admin/learners", label: "Learners & progress" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin sections">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5">
        {links.map((l) => {
          const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "block whitespace-nowrap px-3 py-2 text-sm font-bold transition-colors",
                  active ? "bg-red-strong text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
