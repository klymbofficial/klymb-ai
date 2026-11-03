import clsx from "clsx";
import Link from "next/link";

/**
 * The heading on HR's People and Teams pages, with links between them.
 * Deliberately not a layout: /org/[slug]'s header and layout are task 1.7,
 * and will wrap these pages without changing them.
 */
export function HrPageHeader({ slug, companyName, active, intro }: { slug: string; companyName: string; active: "people" | "teams"; intro: string }) {
  const tabs = [
    { key: "people", href: `/org/${slug}/people`, label: "People" },
    { key: "teams", href: `/org/${slug}/teams`, label: "Teams" },
  ] as const;
  return (
    <header className="mb-8 border-b border-line/25 pb-5">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">{companyName} · HR</p>
      <nav aria-label="HR sections" className="mt-3 flex gap-1">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={active === t.key ? "page" : undefined}
            className={clsx(
              "px-3 py-1.5 text-sm font-bold transition-colors",
              active === t.key ? "bg-ink text-paper" : "text-muted hover:bg-ink/5 hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <p className="mt-4 max-w-2xl text-sm text-muted">{intro}</p>
    </header>
  );
}
