"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/registrations", label: "Registrations" },
  { href: "/admin/webinars", label: "Webinar" },
  // Admin only, so it stays even while HIDE_MONEY keeps money off the public site.
  { href: "/admin/payments", label: "Payments & refunds" },
  { href: "/admin/referrals", label: "Referrals" },
  { href: "/admin/analytics", label: "Traffic" },
  { href: "/admin/engagement", label: "Engagement" },
  { href: "/admin/learners", label: "Learners & progress" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/catalog", label: "Business catalog" },
  { href: "/admin/system-design", label: "System Design" },
  { href: "/admin/hackathon", label: "Hackathon" },
  { href: "/admin/courses", label: "Course preview" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/audit", label: "Admin activity" },
];

// Owners and sales managers only: Sales holds every lead's number and notes.
// It opens into its two halves: students (B2C) and companies (B2B).
const salesLink = { href: "/admin/sales", label: "Sales" };
const salesChildren = [
  { href: "/admin/sales", label: "B2C · Students" },
  { href: "/admin/sales/b2b", label: "B2B · Companies" },
];

const linkClass = (active: boolean) => clsx(
  "block whitespace-nowrap px-3 py-2 text-sm font-bold transition-colors",
  active ? "bg-red-strong text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
);

/** Sales with its B2C and B2B pages beneath, open whenever you are inside Sales. */
function SalesGroup({ pathname }: { pathname: string }) {
  const inSales = pathname.startsWith("/admin/sales");
  // Follows the page (open inside Sales) until someone clicks it.
  const [manual, setManual] = useState<boolean | null>(null);
  const open = manual ?? inSales;
  const b2b = pathname.startsWith("/admin/sales/b2b");
  return (
    <li className="flex gap-1 lg:block">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="admin-sales-menu"
        onClick={() => setManual(!open)}
        className={clsx(
          "flex w-full items-center justify-between gap-2 whitespace-nowrap px-3 py-2 text-left text-sm font-bold transition-colors",
          inSales ? "text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
        )}
      >
        Sales
        <svg aria-hidden viewBox="0 0 12 12" className={clsx("h-3 w-3 transition-transform", open && "rotate-180")}>
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </button>
      {open && (
        <ul id="admin-sales-menu" className="flex gap-1 lg:mt-0.5 lg:flex-col lg:gap-0.5 lg:border-l lg:border-white/15 lg:pl-2 lg:ml-3">
          {salesChildren.map((c) => {
            const active = c.href === "/admin/sales/b2b" ? b2b : inSales && !b2b;
            return (
              <li key={c.href}>
                <Link href={c.href} aria-current={active ? "page" : undefined} className={linkClass(active)}>{c.label}</Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
const internLink = { href: "/admin/internship", label: "Internship" };
const ownerLinks = [{ href: "/admin/announcements", label: "Announcements" }, { href: "/admin/coupons", label: "Coupons" }, { href: "/admin/admins", label: "Admins" }];

/** `chat` is set only for the live-chat owner, with how many chats are waiting on a reply. */
/** `sales` is set for sales managers, who get Sales without owner powers. */
export function AdminNav({ owner = false, sales = false, chat = null }: { owner?: boolean; sales?: boolean; chat?: { unread: number } | null }) {
  const pathname = usePathname();
  const chatLink = { href: "/admin/chat", label: chat?.unread ? `Live chat (${chat.unread})` : "Live chat" };
  const base = owner ? [links[0], salesLink, internLink, ...links.slice(1), ...ownerLinks] : sales ? [links[0], salesLink, internLink, ...links.slice(1)] : links;
  return (
    <nav aria-label="Admin sections">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5">
        {(chat ? [base[0], chatLink, ...base.slice(1)] : base).map((l) => {
          if (l === salesLink) return <SalesGroup key="sales" pathname={pathname} />;
          const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link href={l.href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
