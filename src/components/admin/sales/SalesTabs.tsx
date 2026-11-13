import clsx from "clsx";
import Link from "next/link";

const tabs = [
  { href: "/admin/sales", label: "Report" },
  { href: "/admin/sales/leads", label: "Leads" },
  { href: "/admin/sales/leads?due=1", label: "Due today", key: "due" },
];

export function SalesTabs({ current }: { current: "report" | "leads" | "due" }) {
  return (
    <nav aria-label="Sales" className="mb-6 flex gap-1 border-b border-line/25">
      {tabs.map((t) => {
        const key = t.key ?? (t.href.endsWith("leads") ? "leads" : "report");
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={key === current ? "page" : undefined}
            className={clsx("-mb-px border-b-2 px-3 py-2 text-sm font-bold", key === current ? "border-red-strong text-ink" : "border-transparent text-muted hover:text-ink")}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

const STAGE_TONE: Record<string, string> = {
  new: "bg-surface text-ink",
  warm: "bg-amber-100 text-amber-900",
  potential: "bg-sky-100 text-sky-900",
  positive: "bg-emerald-100 text-emerald-900",
  almost: "bg-emerald-200 text-emerald-950",
  signed: "bg-ink text-paper",
  rejected: "bg-red-tint text-red-deep",
};

export function StageBadge({ stage, label }: { stage: string; label: string }) {
  return <span className={clsx("inline-block whitespace-nowrap px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider", STAGE_TONE[stage])}>{label}</span>;
}
