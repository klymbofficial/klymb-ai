"use client";

import clsx from "clsx";
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { industries, roles } from "@/data/catalog";
import { libraryCourses } from "@/data/course-cards";

export const STATUS = [["all", "All"], ["available", "Open"], ["unavailable", "Not available"]] as const;
export const SORTS = [["open", "Open first"], ["az", "A to Z"]] as const;

export type Status = (typeof STATUS)[number][0];
export type Sort = (typeof SORTS)[number][0];
export type Facets = { role: string; industry: string; status: Status };

/** What the page opens on: only the featured courses. Searching leaves it, so a search looks at everything. */
export const FEATURED_VIEW = "featured";

const ROLE: readonly (readonly [string, string])[] = [
  [FEATURED_VIEW, "Featured"],
  ["all", "All courses"],
  ...roles.map((r) => [r.slug, r.name] as const),
];
const INDUSTRY: readonly (readonly [string, string])[] = [["all", "All"], ...industries.map((i) => [i.slug, i.name] as const)];

/**
 * A `.morph` surface grows out of the button that opens it and folds back into
 * it, so it needs that button's box (where it sits and how wide it is) each
 * time it opens or closes.
 */
export function syncBox(from: HTMLElement | null, to: HTMLElement | null) {
  if (!from || !to) return;
  to.style.setProperty("--from-x", `${from.getBoundingClientRect().left - to.getBoundingClientRect().left}px`);
  to.style.setProperty("--from-w", `${from.offsetWidth}px`);
}

const stagger = (i: number) => ({ "--i": i }) as CSSProperties;

/**
 * One Filter button for the course library, on every screen. It opens into a
 * panel holding every facet at once: which courses to show (Featured, all, or
 * one role) and industry as chips, status and sort as segmented switches. Each option shows how many courses it would
 * leave, a strip of bars (one per course) previews a choice on hover, and a
 * badge on the button counts what is set. Choices apply as they are made.
 */
export function CourseFilter({
  role,
  industry,
  status,
  sort,
  setRole,
  setIndustry,
  setStatus,
  setSort,
  matchesWith,
}: {
  role: string;
  industry: string;
  status: Status;
  sort: Sort;
  setRole: (v: string) => void;
  setIndustry: (v: string) => void;
  setStatus: (v: Status) => void;
  setSort: (v: Sort) => void;
  /** The courses the page would show with these facets swapped in, the search as it stands. */
  matchesWith: (over: Partial<Facets>) => Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Partial<Facets> | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();

  const active = Number(role !== FEATURED_VIEW) + Number(industry !== "all") + Number(status !== "all") + Number(sort !== "open");
  const now = matchesWith({});
  const current: Facets = { role, industry, status };
  // Hovering the option already chosen previews nothing.
  const previewing = !!preview && Object.entries(preview).some(([k, v]) => current[k as keyof Facets] !== v);
  const shown = previewing && preview ? matchesWith(preview) : now;

  const toggle = (next: boolean, refocus = false) => {
    syncBox(trigger.current, panel.current);
    setOpen(next);
    setPreview(null);
    if (refocus) trigger.current?.focus();
  };

  const clear = () => {
    setRole(FEATURED_VIEW);
    setIndustry("all");
    setStatus("all");
    setSort("open");
  };

  // While open: a press anywhere else folds the panel away, and Escape does too, handing focus back to the button.
  useEffect(() => {
    if (!open) return;
    // The panel can end below the fold or under the floating help button: lift its foot into view,
    // never so far that its top slides under the sticky nav. The page's scroll-behavior decides smooth or instant.
    const r = panel.current?.getBoundingClientRect();
    const lift = r ? Math.min(r.bottom - (window.innerHeight - 96), r.top - 80) : 0;
    if (lift > 0) window.scrollBy({ top: lift });

    const onDown = (e: PointerEvent) => {
      if (root.current?.contains(e.target as Node)) return;
      syncBox(trigger.current, panel.current);
      setOpen(false);
      setPreview(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      syncBox(trigger.current, panel.current);
      setOpen(false);
      setPreview(null);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={root}
      className="relative"
      onBlur={(e) => {
        // Tabbing out of the panel closes it, so focus never sits on something it covers.
        const next = e.relatedTarget as Node | null;
        if (next && !root.current?.contains(next)) toggle(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => toggle(!open)}
        className={clsx(
          "relative z-[31] inline-flex h-9 items-center gap-2 rounded-lg border pr-2.5 pl-3 text-[13px] font-semibold text-ink transition-[background-color,border-color,box-shadow,transform] duration-300 active:scale-[0.97] motion-reduce:transition-none",
          open ? "border-transparent bg-transparent" : "border-[#d6d4d3] bg-card shadow-[0_1px_2px_rgba(32,30,29,0.04)] hover:border-[#b5b2b1]",
        )}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="text-muted">
          <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="10" cy="17" r="2" />
        </svg>
        Filter
        {active > 0 && (
          <span key={active} className="badge-pop nums grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red-deep px-1 text-[11px] font-bold text-white">
            {active}
            <span className="sr-only"> active</span>
          </span>
        )}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className={clsx("text-muted transition-transform duration-300 motion-reduce:transition-none", open && "rotate-180")}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div
        ref={panel}
        id={id}
        role="group"
        aria-label="Filter and sort courses"
        data-open={open ? "" : undefined}
        className="morph absolute top-0 left-0 z-30 w-[min(36rem,calc(100vw-2rem))] rounded-2xl border border-[#dcdad9] bg-card shadow-float"
      >
        {/* Beside the button: a bar per course, lit when it matches. Hovering an option previews it. */}
        <div className="morph-in flex h-[34px] items-center justify-end gap-2.5 pr-3.5" style={stagger(0)}>
          <span aria-hidden="true" className="flex h-4 items-end gap-[3px]">
            {libraryCourses.map((c, i) => {
              const hit = shown.has(c.slug);
              return (
                <span
                  key={c.slug}
                  style={{ transitionDelay: `${i * 22}ms` }}
                  className={clsx(
                    "h-full w-[3px] origin-bottom rounded-full transition-[background-color,transform] duration-300 motion-reduce:transition-none",
                    !hit ? "scale-y-[0.4] bg-[#d6d4d3]" : previewing ? "bg-red-deep/45" : "bg-red-deep",
                  )}
                />
              );
            })}
          </span>
          <p className="text-[13px] whitespace-nowrap">
            <span className={clsx("nums font-semibold", previewing ? "text-muted" : "text-ink")}>{shown.size}</span>
            <span className="text-muted"> of {libraryCourses.length}</span>
          </p>
        </div>

        {/* On a phone the facets scroll inside the panel, so its foot (and Show) always fits on screen. */}
        <div className="px-3.5 max-sm:max-h-[calc(100dvh-17rem)] max-sm:overflow-y-auto max-sm:overscroll-contain sm:px-4">
          <Facet i={1} label="Show">
            {(labelId) => (
              <Chips
                name="course-role"
                labelId={labelId}
                value={role}
                onChange={setRole}
                onPreview={(v) => setPreview(v ? { role: v } : null)}
                options={ROLE.map(([v, l]) => ({ value: v, label: l, count: matchesWith({ role: v }).size }))}
              />
            )}
          </Facet>

          <Facet i={2} label="Status">
            {(labelId) => (
              <Segmented
                name="course-status"
                labelId={labelId}
                open={open}
                value={status}
                onChange={setStatus}
                onPreview={(v) => setPreview(v ? { status: v } : null)}
                options={STATUS.map(([v, l]) => ({ value: v, label: l, count: matchesWith({ status: v }).size }))}
              />
            )}
          </Facet>

          <Facet i={3} label="Industry">
            {(labelId) => (
              <Chips
                name="course-industry"
                labelId={labelId}
                value={industry}
                onChange={setIndustry}
                onPreview={(v) => setPreview(v ? { industry: v } : null)}
                options={INDUSTRY.map(([v, l]) => ({ value: v, label: l, count: matchesWith({ industry: v }).size }))}
              />
            )}
          </Facet>

          <Facet i={4} label="Sort">
            {(labelId) => (
              <Segmented
                name="course-sort"
                labelId={labelId}
                open={open}
                value={sort}
                onChange={setSort}
                options={SORTS.map(([v, l]) => ({ value: v, label: l }))}
              />
            )}
          </Facet>
        </div>

        <div className="morph-in flex items-center justify-between gap-3 border-t border-[#ecebea] px-3.5 py-3 sm:px-4" style={stagger(5)}>
          <button
            type="button"
            onClick={clear}
            aria-disabled={active === 0}
            className={clsx("-ml-2 rounded-md px-2 py-2 text-[13px] font-semibold", active ? "text-red-deep hover:bg-red-tint" : "cursor-default text-line")}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => toggle(false, true)}
            className="h-10 rounded-lg bg-red-deep px-4 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-red-press"
          >
            {now.size === 0 ? "No courses match" : `Show ${now.size} course${now.size === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/** A ruled row: the facet's name, then its options. */
function Facet({ i, label, children }: { i: number; label: string; children: (labelId: string) => React.ReactNode }) {
  const labelId = useId();
  return (
    <div className="morph-in grid items-baseline gap-x-4 gap-y-2 border-t border-[#ecebea] py-3.5 sm:grid-cols-[4.75rem_1fr]" style={stagger(i)}>
      <span id={labelId} className="text-[11px] font-extrabold tracking-[0.14em] text-muted uppercase">{label}</span>
      <div className="min-w-0">{children(labelId)}</div>
    </div>
  );
}

function Count({ n, on }: { n: number; on: boolean }) {
  return (
    <>
      <span aria-hidden="true" className={clsx("nums text-xs font-semibold", on ? "text-red-soft" : "text-muted")}>{n}</span>
      <span className="sr-only">, {n} {n === 1 ? "course" : "courses"}</span>
    </>
  );
}

/** Wrapping chips, one choice at a time; the chosen one fills dark and gains a tick. */
function Chips({
  name,
  labelId,
  value,
  options,
  onChange,
  onPreview,
}: {
  name: string;
  labelId: string;
  value: string;
  options: { value: string; label: string; count: number }[];
  onChange: (v: string) => void;
  onPreview: (v: string | null) => void;
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelId} onPointerLeave={() => onPreview(null)} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <label
            key={o.value}
            onPointerEnter={(e) => e.pointerType === "mouse" && onPreview(o.value)}
            className={clsx(
              "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold whitespace-nowrap transition-[background-color,border-color,color] duration-200 select-none has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-red motion-reduce:transition-none",
              on ? "border-ink bg-ink text-paper" : clsx("border-[#dcdad9] bg-[#f7f6f6] hover:border-[#b5b2b1]", o.count === 0 ? "text-line" : "text-ink"),
            )}
          >
            <input type="radio" name={name} value={o.value} checked={on} onChange={() => onChange(o.value)} className="sr-only" />
            {on && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="badge-pop -ml-0.5 text-red-soft">
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            )}
            {o.label}
            <Count n={o.count} on={on} />
          </label>
        );
      })}
    </div>
  );
}

/** A switch of a few options, with a dark pill that slides to the one chosen. */
function Segmented<T extends string>({
  name,
  labelId,
  open,
  value,
  options,
  onChange,
  onPreview,
}: {
  name: string;
  labelId: string;
  open: boolean;
  value: T;
  options: { value: T; label: string; count?: number }[];
  onChange: (v: T) => void;
  onPreview?: (v: T | null) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  // Counts change the segments' widths, and the font may land after the first measure; reopening measures again.
  const layoutKey = `${value}|${open}|${options.map((o) => o.count ?? "").join()}`;

  useLayoutEffect(() => {
    const on = box.current?.querySelector("input:checked")?.closest("label");
    if (!on || !pill.current) return;
    pill.current.style.width = `${on.offsetWidth}px`;
    pill.current.style.transform = `translateX(${on.offsetLeft}px)`;
  }, [layoutKey]);

  return (
    <div ref={box} role="radiogroup" aria-labelledby={labelId} onPointerLeave={() => onPreview?.(null)} className="relative inline-flex max-w-full rounded-[10px] bg-[#efeeed] p-[3px]">
      <span
        ref={pill}
        aria-hidden="true"
        className="absolute top-[3px] bottom-[3px] left-0 rounded-[7px] bg-ink shadow-[0_1px_3px_rgba(32,30,29,0.25)] transition-[transform,width] duration-300 ease-[cubic-bezier(0.2,0.9,0.1,1)] motion-reduce:transition-none"
      />
      {options.map((o) => {
        const on = value === o.value;
        return (
          <label
            key={o.value}
            onPointerEnter={(e) => e.pointerType === "mouse" && onPreview?.(o.value)}
            className={clsx(
              "relative inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-[7px] px-3 text-[13px] font-semibold whitespace-nowrap transition-colors duration-200 select-none has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-red motion-reduce:transition-none",
              on ? "text-paper" : clsx("hover:bg-white/80", o.count === 0 ? "text-line" : "text-ink"),
            )}
          >
            <input type="radio" name={name} value={o.value} checked={on} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
            {o.count !== undefined && <Count n={o.count} on={on} />}
          </label>
        );
      })}
    </div>
  );
}
