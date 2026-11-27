import clsx from "clsx";
import Link from "next/link";

/**
 * Pieces the hiring screens share: the page head, status badges and the
 * filter rail. No hooks, so server pages and client lists can both use them.
 */

/** Primary and secondary buttons and links. The primary follows the company's accent (globals.css, [data-brand]). */
export const BTN_PRIMARY = "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border-2 border-red-strong bg-red-strong px-4 text-sm font-bold text-white hover:border-red-press hover:bg-red-press disabled:opacity-50";
export const BTN_SECONDARY = "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border-2 border-ink bg-white px-4 text-sm font-bold text-ink hover:bg-ink hover:text-paper disabled:opacity-50";
export const PANEL = "rounded-lg border border-line/30 bg-white";

export interface Crumb {
  href?: string;
  label: string;
}

/** A page's head: where it sits, its title, one line of context, and its actions on the right. */
export function OrgPageHead({ crumbs, title, meta, actions }: { crumbs?: Crumb[]; title: string; meta?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6">
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2 text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            {crumbs.map((c, i) => (
              <li key={i} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden="true">›</span>}
                {c.href ? <Link href={c.href} className="underline-offset-4 hover:text-ink hover:underline">{c.label}</Link> : <span aria-current="page" className="text-ink">{c.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 grow basis-[24rem]">
          <h1 className="display break-words text-3xl">{title}</h1>
          {meta && <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">{meta}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-start gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export type Tone = "blue" | "green" | "amber" | "red" | "grey";
const TONE: Record<Tone, string> = {
  blue: "bg-[#e3ecfb] text-[#163d7a]",
  green: "bg-[#e4f2ec] text-[#14532d]",
  amber: "bg-[#fdf1e7] text-[#6b3300]",
  red: "bg-[#f6e4e4] text-[#7a1f1f]",
  grey: "bg-[#eae9e9] text-[#3d3a39]",
};

/** A status in words, on a tint. The words carry the meaning; the colour only helps scanning. */
export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={clsx("inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-bold", TONE[tone])}>{children}</span>;
}

/** The filters beside a list, each with how many it holds. On a phone they become a row of chips. */
export function FilterRail<K extends string>({
  title, items, counts, value, onChange,
}: {
  title: string;
  items: readonly { key: K; label: string }[];
  counts: Record<K, number>;
  value: K;
  onChange: (key: K) => void;
}) {
  return (
    <nav aria-label={title} className={clsx(PANEL, "p-2 lg:w-52 lg:shrink-0 lg:p-3")}>
      <p className="hidden px-2 pb-2 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-muted lg:block">{title}</p>
      <ul className="flex gap-1 overflow-x-auto lg:flex-col">
        {items.map((it) => {
          const on = it.key === value;
          return (
            <li key={it.key} className="shrink-0">
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onChange(it.key)}
                className={clsx(
                  "flex min-h-10 w-full items-center justify-between gap-3 whitespace-nowrap rounded-md px-2.5 text-left text-sm",
                  on ? "bg-paper font-bold text-ink" : "text-ink hover:bg-paper",
                )}
              >
                <span>{it.label}</span>
                <span className={clsx("min-w-6 rounded-full px-1.5 text-center text-xs font-bold", on ? "bg-ink text-paper" : "bg-surface text-ink")}>{counts[it.key]}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** A search box over what's already on the page. */
export function SearchBox({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-line/50 bg-white px-3 focus-within:border-ink sm:max-w-sm">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0 text-muted">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <span className="sr-only">{label}</span>
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
    </label>
  );
}
