"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
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
  /** The account menu: the company's name, Settings, and Billing (Plan and usage; null unless an admin). */
  account: { company: string; settingsHref: string; billingHref: string | null };
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
export function OrgSidebar({ groups, brand, email, roles, supportHref, account }: OrgSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const drawer = useRef<HTMLDivElement>(null);
  // No Overview link any more: every link is current on its own page and the pages under it.
  const overview = "";
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
      {/* A new page closes the menu: keyed by the path, it starts closed again. */}
      <AccountMenu key={pathname} narrow={narrow} email={email} roles={roles} account={account} />
    </div>
  );

  const identity = (narrow: boolean) => (
    <div className={clsx("pb-3 pt-1", narrow ? "w-10 self-center" : "px-1.5")}>
      <BrandMark name={brand.name} logoUrl={brand.logoUrl} logoAlt={brand.logoAlt} showName={!narrow} compact={narrow} />
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

const initials = (email: string) => {
  const parts = email.split("@")[0].split(/[._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase() || "?";
};

const MENU_ITEM = "flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm text-ink hover:bg-paper";

/**
 * The signed-in person at the foot of the sidebar. Clicking it opens a small
 * menu above it, like HackerEarth's: the company's name, then Settings
 * (Personal, and for admins Company), Billing (Plan and usage, admins
 * only) and Logout. Adding people is on the Team page. Escape or a click outside closes it.
 */
function AccountMenu({ narrow, email, roles, account }: { narrow: boolean; email: string; roles: string[]; account: OrgSidebarProps["account"] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); button.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

  return (
    <div ref={box} className="relative">
      {open && (
        <div
          role="menu"
          aria-label="Account"
          className={clsx(
            "z-50 rounded-lg border border-line/30 bg-white p-1.5 text-ink shadow-[0_12px_32px_rgba(0,0,0,0.28)]",
            // Open, the menu is exactly the sidebar's width: the sidebar clips anything wider (it hides
            // sideways overflow). Collapsed, the sidebar is too narrow, so the menu sits beside it.
            narrow ? "fixed bottom-3 left-[4.5rem] w-60" : "absolute inset-x-0 bottom-full mb-2",
          )}
        >
          <div className="px-3 pb-2 pt-2">
            <p className="truncate text-base font-semibold" title={account.company}>{account.company}</p>
            <p className="mt-0.5 truncate text-xs text-muted" title={email}>{email}</p>
            {roles.length > 0 && <p className="mt-1 text-[0.7rem] text-muted">{roles.join(" · ")}</p>}
          </div>
          <div className="border-t border-line/20 pt-1">
            <Link role="menuitem" href={account.settingsHref} className={MENU_ITEM}><OrgIcon name="settings" className="shrink-0 text-muted" />Settings</Link>
            {account.billingHref && (
              <Link role="menuitem" href={account.billingHref} className={MENU_ITEM}><OrgIcon name="billing" className="shrink-0 text-muted" />Billing</Link>
            )}
            <form action={signOutOfCompany}>
              <button type="submit" role="menuitem" className={MENU_ITEM}><OrgIcon name="signout" className="shrink-0 text-muted" />Logout</button>
            </form>
          </div>
        </div>
      )}
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        title={narrow ? email : undefined}
        onClick={() => setOpen((v) => !v)}
        className={clsx("flex min-h-11 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm text-[#e6e3e2] hover:bg-white/10 hover:text-white", narrow && "justify-center", open && "bg-white/10 text-white")}
      >
        <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-strong text-[0.65rem] font-extrabold text-white">{initials(email)}</span>
        <span className={narrow ? "sr-only" : "min-w-0 flex-1 truncate"}>{email}</span>
        {!narrow && <OrgIcon name="chevron" size={16} className={clsx("shrink-0 transition-transform", !open && "rotate-180")} />}
      </button>
    </div>
  );
}
