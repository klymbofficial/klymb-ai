"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The learner's own links, with the current page marked for everyone, not just by colour.
 * `coach` is the voice coach of the track on this page; a person can be on several tracks, so
 * there is only a coach link where a page belongs to one of them.
 */
export function LearnerNav({ coach }: { coach?: string }) {
  const path = usePathname();
  const onCoach = path.endsWith("/coach");
  const links = [
    {
      href: "/learn",
      label: "Dashboard",
      current: !onCoach && (path === "/learn" || path.startsWith("/learn/tracks/") || path.startsWith("/learn/day")),
    },
    ...(coach ? [{ href: coach, label: "Voice coach", current: onCoach }] : []),
    { href: "/tracks", label: "Browse tracks", current: false },
  ];
  return (
    <nav aria-label="Learner" className="order-3 col-span-2 border-t border-line/20 lg:order-none lg:col-span-1 lg:border-0">
      <ul className="flex items-center gap-1 text-sm font-semibold lg:gap-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={l.current ? "page" : undefined}
              className={clsx(
                "inline-flex min-h-11 items-center border-b-2 px-3 transition-colors",
                l.current ? "border-red-strong text-red-deep" : "border-transparent text-ink/75 hover:text-red-deep",
              )}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
