"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { signOutOfCompany } from "@/app/org/actions";
import { BrandMark } from "@/components/company/BrandMark";
import { OrgIcon } from "@/components/company/OrgIcons";
import { isCurrent, type OrgNavGroup } from "@/lib/company/nav";

export interface OrgSidebarProps {
  groups: OrgNavGroup[];
  brand: { name: string; logoUrl: string | null; logoAlt: string };
  email: string;
  /** Role names, already worded ("Recruiter"). */
  roles: string[];
  /** Where Support writes to: the company's own contact, or Klymb's. */
  supportHref: string;
}

// The focus ring reads --color-red; on the dark sidebar it is white so it shows whatever the company's accent.
const ON_DARK = { "--color-red": "#ffffff" } as CSSProperties;

/**
 * The company workspace's navigation: a dark sidebar on wide screens, and on
 * phones a top bar whose menu button opens the same links as a drawer. The
 * open page is marked in the company's accent (Klymb red without one). Which
 * links show is decided on the server (navGroupsFor); this only marks the
 * current one and opens and closes the drawer.
 */
export function OrgSidebar({ groups, brand, email, roles, supportHref }: OrgSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);
  const overview = groups[0]?.items[0]?.href ?? "";

  // Moving to another page closes the drawer.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  // While open: Escape closes and focus returns to the menu button; focus starts on the first link.
  useEffect(() => {
    if (!open) return;
    drawer.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      menuButton.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const links = (
    <nav aria-label="Company sections" className="flex flex-col gap-0.5">
      {groups.map((g, gi) => (
        <div key={g.label ?? `g${gi}`} className="flex flex-col gap-0.5">
          {g.label && <p className="px-2.5 pb-1 pt-4 text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-[#a9a5a3]">{g.label}</p>}
          {g.items.map((item) => {
            const current = isCurrent(item.href, pathname, overview);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={clsx(
                  "flex min-h-10 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
                  current ? "bg-red-strong font-bold text-white" : "text-[#e6e3e2] hover:bg-white/10 hover:text-white",
                )}
              >
                <OrgIcon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="mt-auto flex flex-col gap-1 border-t border-white/15 pt-3">
      <a href={supportHref} className="flex min-h-10 items-center gap-2.5 rounded-md px-2.5 text-sm text-[#e6e3e2] hover:bg-white/10 hover:text-white">
        <OrgIcon name="support" />
        Support
      </a>
      <div className="px-2.5 py-2">
        <p className="truncate text-xs" title={email}>{email}</p>
        <p className="mt-1.5 flex flex-wrap gap-1">
          {roles.map((r) => (
            <span key={r} className="rounded-sm border border-white/40 px-1.5 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.12em] text-[#d9d6d5]">{r}</span>
          ))}
        </p>
      </div>
      <form action={signOutOfCompany}>
        <button type="submit" className="flex min-h-10 w-full items-center rounded-md px-2.5 text-left text-sm text-[#e6e3e2] hover:bg-white/10 hover:text-white">
          Sign out
        </button>
      </form>
    </div>
  );

  const identity = (
    <div className="px-1.5 pb-3 pt-1">
      <BrandMark name={brand.name} logoUrl={brand.logoUrl} logoAlt={brand.logoAlt} />
      <p className="mt-1 pl-0.5 text-[0.7rem] text-[#b9b5b3]">on Klymb.ai</p>
    </div>
  );

  return (
    <>
      {/* Wide screens: the sidebar, pinned while the page scrolls. */}
      <aside aria-label="Company workspace" style={ON_DARK} className="hidden w-60 shrink-0 bg-night text-paper lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto lg:p-3">
        {identity}
        {links}
        {footer}
      </aside>

      {/* Phones and tablets: a bar with the company and a menu button. */}
      <header style={ON_DARK} className="sticky top-0 z-30 flex h-14 items-center gap-2 bg-night px-2 text-paper lg:hidden">
        <button
          ref={menuButton}
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="org-drawer"
          onClick={() => setOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-white/10"
        >
          <OrgIcon name="menu" size={22} />
        </button>
        <BrandMark name={brand.name} logoUrl={brand.logoUrl} logoAlt={brand.logoAlt} />
      </header>
      {open && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            id="org-drawer"
            ref={drawer}
            role="dialog"
            aria-modal="true"
            aria-label="Company sections"
            style={ON_DARK}
            className="flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto bg-night p-3 text-paper"
          >
            <div className="flex items-start justify-between gap-2">
              {identity}
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => { setOpen(false); menuButton.current?.focus(); }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-white/10"
              >
                <OrgIcon name="close" size={20} />
              </button>
            </div>
            {links}
            {footer}
          </div>
          <button type="button" aria-label="Close menu" tabIndex={-1} onClick={() => setOpen(false)} className="flex-1 bg-black/45" />
        </div>
      )}
    </>
  );
}
