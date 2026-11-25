import clsx from "clsx";
import Link from "next/link";

// Overview first, then the lists to work, then the team.
const tabs = [
  { href: "/admin/sales", label: "Report", key: "report" },
  { href: "/admin/sales/leads?due=1", label: "Due today", key: "due" },
  { href: "/admin/sales/leads", label: "All leads", key: "leads" },
  { href: "/admin/sales/list", label: "My list", key: "list" },
  { href: "/admin/sales/board", label: "Board", key: "board" },
  { href: "/admin/sales/b2b", label: "B2B", key: "b2b" },
  { href: "/admin/sales/team", label: "Team", key: "team" },
];

export function SalesTabs({ current }: { current: "report" | "leads" | "due" | "list" | "board" | "b2b" | "team" }) {
  return (
    <nav aria-label="Sales" className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-line/25 px-4 sm:mx-0 sm:px-0">
      {tabs.map((t) => {
        const key = t.key;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={key === current ? "page" : undefined}
            className={clsx("-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-bold", key === current ? "border-red-strong text-ink" : "border-transparent text-muted hover:text-ink")}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

const repTabs = [
  { href: "/sales", label: "Today", key: "today" },
  { href: "/sales/list", label: "My leads", key: "list" },
  { href: "/sales/board", label: "Board", key: "board" },
  { href: "/sales/earnings", label: "Earnings", key: "earnings" },
] as const;

/** The tabs an intern sees at /sales. */
export function RepTabs({ current }: { current: "today" | "list" | "board" | "earnings" }) {
  return (
    <nav aria-label="Sales" className="mb-6 flex gap-1 overflow-x-auto border-b border-line/25">
      {repTabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.key === current ? "page" : undefined}
          className={clsx("-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-bold", t.key === current ? "border-red-strong text-ink" : "border-transparent text-muted hover:text-ink")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

const STAGE_TONE: Record<string, string> = {
  new: "bg-surface text-ink",
  connected: "bg-amber-100 text-amber-900",
  interested: "bg-emerald-100 text-emerald-900",
  follow_up: "bg-sky-100 text-sky-900",
  signed: "bg-ink text-paper",
  rejected: "bg-red-tint text-red-deep",
};

export function StageBadge({ stage, label }: { stage: string; label: string }) {
  return <span className={clsx("inline-block whitespace-nowrap px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider", STAGE_TONE[stage])}>{label}</span>;
}
