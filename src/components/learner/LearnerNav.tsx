"use client";

import clsx from "clsx";
import { BookOpen, LayoutGrid, Mic, UserRound, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The learner's places: the dashboard (and the courses opened from it), the
 * course library, the hackathon and the profile. The current one is marked for
 * everyone, not just by colour. `coach` is the voice coach of the track on
 * this page; a person can be on several tracks, so there is only a coach link
 * where a page belongs to one of them.
 *
 * `rail` is the sidebar's list (icons only when `compact`); `bar` the row under
 * the top bar on phones and tablets.
 */
export function LearnerNav({ coach, variant, compact = false }: { coach?: string; variant: "rail" | "bar"; compact?: boolean }) {
  const path = usePathname();
  const onCoach = path.endsWith("/coach");
  const links: { href: string; label: string; icon: LucideIcon; current: boolean }[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutGrid,
      current: !onCoach && (path === "/dashboard" || path.startsWith("/learn/tracks/") || path.startsWith("/learn/day") || path.startsWith("/learn/courses/")),
    },
    ...(coach ? [{ href: coach, label: "Voice coach", icon: Mic, current: onCoach }] : []),
    { href: "/dashboard/library", label: "Library", icon: BookOpen, current: path.startsWith("/dashboard/library") },
    { href: "/learn/hackathon", label: "Hackathon", icon: Zap, current: path.startsWith("/learn/hackathon") },
    { href: "/learn/profile", label: "Profile", icon: UserRound, current: path.startsWith("/learn/profile") },
  ];

  if (variant === "bar") {
    return (
      <nav aria-label="Learner" className="col-span-2 -mx-4 border-t border-ink/10 px-4 sm:-mx-8 sm:px-8">
        <ul className="flex items-center gap-3.5 overflow-x-auto text-[13px] font-semibold min-[400px]:gap-5 min-[400px]:text-sm sm:gap-7">
          {links.map((l) => (
            <li key={l.href} className="shrink-0">
              <Link
                href={l.href}
                aria-current={l.current ? "page" : undefined}
                className={clsx("inline-flex min-h-11 items-center border-b-2 transition-colors", l.current ? "border-red text-ink" : "border-transparent text-ink/70 hover:text-ink")}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Learner" className="w-full">
      <ul className="flex flex-col gap-1">
        {links.map(({ href, label, icon: Icon, current }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={current ? "page" : undefined}
              aria-label={compact ? label : undefined}
              title={compact ? label : undefined}
              className={clsx(
                "flex min-h-11 items-center gap-3 rounded-lg text-[15px] font-semibold transition-colors",
                compact ? "justify-center px-0" : "px-3",
                current ? "bg-red-tint text-red-deep" : "text-ink/75 hover:bg-surface hover:text-ink",
              )}
            >
              <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.9} />
              {!compact && label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
