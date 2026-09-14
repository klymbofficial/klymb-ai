"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navLinks } from "@/data/program";
import { ButtonLink } from "@/components/ui/Button";
import { Wordmark } from "./Wordmark";

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b-2 border-line bg-paper">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <span onClick={() => setOpen(false)}><Wordmark /></span>
        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-8 text-sm font-semibold">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} aria-current={pathname === l.href ? "page" : undefined} className="hover:text-red-deep aria-[current=page]:text-red-deep">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden lg:block">
          <ButtonLink href="/tracks" className="py-2.5">Choose Your Track</ButtonLink>
        </div>
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center border-2 border-ink lg:hidden"
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
        <nav id="mobile-nav" aria-label="Mobile" className="border-t-2 border-line lg:hidden">
          <ul className="px-4 py-2">
            {navLinks.map((l) => (
              <li key={l.href} className="border-b border-line/40 last:border-0">
                <Link href={l.href} onClick={() => setOpen(false)} className="block py-3 text-lg font-bold">{l.label}</Link>
              </li>
            ))}
          </ul>
          <div className="px-4 pb-4">
            <ButtonLink href="/tracks" className="w-full" arrow>Choose Your Track</ButtonLink>
          </div>
        </nav>
      )}
    </header>
  );
}
