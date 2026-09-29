"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navLinks } from "@/data/program";
import { ButtonLink } from "@/components/ui/Button";
import { Wordmark } from "./Wordmark";

/**
 * The wordmark and the call to action sit on the page ground; the links
 * float between them on a white bar that reads as part of the hero card
 * below it.
 */
export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // On the home page the links live in the hero's folder tab instead, so the
  // bar cannot stick: a tab left behind on scroll would float over content.
  const home = pathname === "/";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className={home ? "relative bg-paper" : "sticky top-0 z-50 bg-paper"}>
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <span onClick={() => setOpen(false)}><Wordmark className="text-xl" /></span>

        <nav aria-label="Primary" className={home ? "hidden" : "hidden lg:block"}>
          <ul className="flex items-center gap-9 rounded-full bg-card px-8 py-3 text-[15px] font-semibold shadow-card">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={pathname === l.href ? "page" : undefined}
                  className="transition-colors hover:text-red-deep aria-[current=page]:text-red-deep"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden lg:block">
          <ButtonLink href="/tracks" className="rounded-full px-6 py-2.5 text-[11px]">Choose Your Track</ButtonLink>
        </div>

        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-lg bg-card shadow-card lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="mx-4 mb-2 rounded-card bg-card p-2 shadow-float lg:hidden">
          <ul className="px-3">
            {navLinks.map((l) => (
              <li key={l.href} className="border-b border-line/25 last:border-0">
                <Link href={l.href} onClick={() => setOpen(false)} className="block py-3 text-lg font-bold">{l.label}</Link>
              </li>
            ))}
          </ul>
          <div className="p-3">
            <ButtonLink href="/tracks" className="w-full rounded-lg" arrow>Choose Your Track</ButtonLink>
          </div>
        </nav>
      )}
    </header>
  );
}
