"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { signOutOfCompany } from "@/app/org/actions";
import { BrandMark } from "@/components/company/BrandMark";
import { OrgIcon } from "@/components/company/OrgIcons";
import { CloseX, useOverlayFocus, usePresence } from "@/components/company/Overlay";
import { PendingDot } from "@/components/company/NavFeedback";
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

// Desktop collapse, remembered in this browser only (a convenience; nothing breaks without it).
const KEY = "klymb.org.sidebar";
const EVENT = "klymb-org-sidebar";
const readCollapsed = () => { try { return window.localStorage.getItem(KEY) === "collapsed"; } catch { return false; } };
const subscribe = (fn: () => void) => { window.addEventListener(EVENT, fn); window.addEventListener("storage", fn); return () => { window.removeEventListener(EVENT, fn); window.removeEventListener("storage", fn); }; };
function setCollapsed(v: boolean) {
  try { window.localStorage.setItem(KEY, v ? "collapsed" : "open"); } catch { /* private window: this page only */ }
  memory = v;
  window.dispatchEvent(new Event(EVENT));
}
let memory: boolean | null = null;
const snapshot = () => memory ?? readCollapsed();

/**
 * The company workspace's navigation: a dark sidebar on wide screens, and on
 * phones a top bar whose menu button opens the same links as a drawer. The
 * open page is marked in the company's accent (Klymb red without one). Which
 * links show is decided on the server (navGroupsFor); this only marks the
 * current one, opens and closes the drawer (animated, with an X, Escape and
 * focus kept inside), and on wide screens collapses to icons and back
 * without leaving the page.
 */
export function OrgSidebar({ groups, brand, email, roles, supportHref }: OrgSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const drawer = useRef<HTMLDivElement>(null);
  const overview = groups[0]?.items[0]?.href ?? "";
  const { mounted, shown } = usePresence(open);
  useOverlayFocus(mounted && open, drawer, () => setOpen(false));
  const collapsed = useSyncExternalStore(subscribe, snapshot, () => false);
  // Animate only a person's own toggle, never the switch to the remembered state after loading.
  const [animate, setAnimate] = useState(false);

  // Moving to another page closes the drawer.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  const links = (narrow: boolean) => (
    <nav aria-label="Company sections" className="flex flex-col gap-0.5">
      {groups.map((g, gi) => (
        <div key={g.label ?? `g${gi}`} className="flex flex-col gap-0.5">
          {g.label && (narrow
            ? <hr className="mx-2.5 my-2 border-white/15" />
            : <p className="px-2.5 pb-1 pt-4 text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-[#a9a5a3]">{g.label}</p>)}
          {g.items.map((item) => {
            const current = isCurrent(item.href, pathname, overview);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
                title={narrow ? item.label : undefined}
                className={clsx(
                  "flex min-h-10 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
                  narrow && "justify-center",
                  current ? "bg-red-strong font-bold text-white" : "text-[#e6e3e2] hover:bg-white/10 hover:text-white",
                )}
              >
                <OrgIcon name={item.icon} className="shrink-0" />
                <span className={narrow ? "sr-only" : undefined}>{item.label}</span>
                {!narrow && <PendingDot className="ml-auto" />}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const footer = (narrow: boolean) => (
    <div className="mt-auto flex flex-col gap-1 border-t border-white/15 pt-3">
      <a href={supportHref} title={narrow ? "Support" : undefined} className={clsx("flex min-h-10 items-center gap-2.5 rounded-md px-2.5 text-sm text-[#e6e3e2] hover:bg-white/10 hover:text-white", narrow && "justify-center")}>
        <OrgIcon name="support" className="shrink-0" />
        <span className={narrow ? "sr-only" : undefined}>Support</span>
      </a>
      <div className={clsx("px-2.5 py-2", narrow && "sr-only")}>
        <p className="truncate text-xs" title={email}>{email}</p>
        <p className="mt-1.5 flex flex-wrap gap-1">
          {roles.map((r) => (
            <span key={r} className="rounded-sm border border-white/40 px-1.5 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.12em] text-[#d9d6d5]">{r}</span>
          ))}
        </p>
      </div>
      <form action={signOutOfCompany}>
        <button type="submit" title={narrow ? "Sign out" : undefined} className={clsx("flex min-h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm text-[#e6e3e2] hover:bg-white/10 hover:text-white", narrow && "justify-center")}>
          {narrow && <OrgIcon name="signout" className="shrink-0" />}
          <span className={narrow ? "sr-only" : undefined}>Sign out</span>
        </button>
      </form>
    </div>
  );

  const identity = (narrow: boolean) => (
    <div className={clsx("pb-3 pt-1", narrow ? "w-10 self-center overflow-hidden" : "px-1.5")}>
      <BrandMark name={brand.name} logoUrl={brand.logoUrl} logoAlt={brand.logoAlt} showName={!narrow} />
      {!narrow && <p className="mt-1 pl-0.5 text-[0.7rem] text-[#b9b5b3]">on Klymb.ai</p>}
    </div>
  );

  return (
    <>
      {/* Wide screens: the sidebar, pinned while the page scrolls; it collapses to icons and back. */}
      <aside
        aria-label="Company workspace"
        style={ON_DARK}
        className={clsx(
          "hidden shrink-0 bg-night text-paper lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:p-3",
          collapsed ? "w-16" : "w-60",
          animate && "transition-[width] duration-200 ease-out motion-reduce:transition-none",
        )}
      >
        <div className={clsx("flex items-start gap-1", collapsed ? "flex-col items-center" : "justify-between")}>
          {identity(collapsed)}
          <button
            type="button"
            onClick={() => { setAnimate(true); setCollapsed(!collapsed); }}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[#e6e3e2] hover:bg-white/10 hover:text-white"
          >
            <OrgIcon name={collapsed ? "expand" : "collapse"} size={20} />
          </button>
        </div>
        {links(collapsed)}
        {footer(collapsed)}
      </aside>

      {/* Phones and tablets: a bar with the company and a menu button. */}
      <header style={ON_DARK} className="sticky top-0 z-30 flex h-14 items-center gap-2 bg-night px-2 text-paper lg:hidden">
        <button
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
      {mounted && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className={clsx("absolute inset-0 bg-black/45 transition-opacity duration-200 motion-reduce:transition-none starting:opacity-0", shown ? "opacity-100" : "opacity-0")}
          />
          <div
            id="org-drawer"
            ref={drawer}
            data-overlay-panel=""
            role="dialog"
            aria-modal="true"
            aria-label="Company sections"
            tabIndex={-1}
            style={ON_DARK}
            className={clsx(
              "relative flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto bg-night p-3 text-paper outline-none transition-transform duration-200 ease-out motion-reduce:transition-none",
              shown ? "translate-x-0 starting:-translate-x-full" : "-translate-x-full",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              {identity(false)}
              <CloseX dark label="Close menu" onClick={() => setOpen(false)} />
            </div>
            {links(false)}
            {footer(false)}
          </div>
        </div>
      )}
    </>
  );
}
