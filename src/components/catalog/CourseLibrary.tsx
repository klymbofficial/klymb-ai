"use client";

import clsx from "clsx";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getIndustry, getRole, industries, programs, roles, type Program } from "@/data/catalog";
import { trackImages } from "@/data/track-images";

const SD_POSTER = "/videos/system-design/overview-21day-poster.jpg";

const KIND_SHORT: Record<Program["kind"], string> = {
  "30-day career track": "30-day track",
  "Short video course": "Video course",
  "Industry program": "Industry program",
};

const STATUS = [["all", "All"], ["available", "Open"], ["unavailable", "Not available"]] as const;
const SORTS = [["open", "Open first"], ["az", "A to Z"]] as const;

type Status = (typeof STATUS)[number][0];
type Sort = (typeof SORTS)[number][0];

/** A photo when the program has one; otherwise its initials on a quiet ruled ground. */
function cover(p: Program): { img: StaticImageData | string | null; abbr: string } {
  if (p.track) return { img: trackImages[p.track].src, abbr: "" };
  if (p.slug === "system-design") return { img: SD_POSTER, abbr: "" };
  const abbr = p.name.split(" ").filter((w) => w !== "in").map((w) => w[0]).join("").slice(0, 3);
  return { img: null, abbr };
}

const tagsOf = (p: Program) =>
  [...p.roles.map((r) => getRole(r)?.name), ...p.industries.map((i) => getIndustry(i)?.name)].filter(Boolean).join(" · ");

/**
 * The course library: search, a tab per role, filters for industry and
 * status, and a card per program. Everything comes from data/catalog, so a
 * program that is not available says so here too.
 */
export function CourseLibrary() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [industry, setIndustry] = useState("all");
  const [status, setStatus] = useState<Status>("all");
  const [sort, setSort] = useState<Sort>("open");
  const search = useRef<HTMLInputElement>(null);

  // "/" jumps to the search box from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || /input|textarea|select/i.test(document.activeElement?.tagName ?? "")) return;
      e.preventDefault();
      search.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Everything but the role tab, so each tab can show how many it would leave.
  const base = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return programs.filter((p) => {
      if (industry !== "all" && !p.industries.includes(industry as Program["industries"][number])) return false;
      if (status !== "all" && p.status !== status) return false;
      if (needle && ![p.name, p.kind, p.summary, tagsOf(p)].join(" ").toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [q, industry, status]);

  const list = useMemo(() => {
    const shown = role === "all" ? base : base.filter((p) => p.roles.includes(role as Program["roles"][number]));
    const order = programs.map((p) => p.slug);
    return [...shown].sort(sort === "az"
      ? (a, b) => a.name.localeCompare(b.name)
      : (a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
  }, [base, role, sort]);

  const tabs = [
    { key: "all", name: "All courses", count: base.length },
    ...roles.map((r) => ({ key: r.slug, name: r.name, count: base.filter((p) => p.roles.includes(r.slug)).length })),
  ];

  const pills: { label: string; aria: string; remove: () => void }[] = [];
  if (q.trim()) pills.push({ label: `“${q.trim()}”`, aria: "Remove search", remove: () => setQ("") });
  if (role !== "all") pills.push({ label: getRole(role)?.name ?? role, aria: "Remove role filter", remove: () => setRole("all") });
  if (industry !== "all") pills.push({ label: getIndustry(industry)?.name ?? industry, aria: "Remove industry filter", remove: () => setIndustry("all") });
  if (status !== "all") pills.push({ label: STATUS.find((s) => s[0] === status)![1], aria: "Remove status filter", remove: () => setStatus("all") });
  const filtered = pills.length > 0 || sort !== "open";
  const resetAll = () => { setQ(""); setRole("all"); setIndustry("all"); setStatus("all"); setSort("open"); };

  const selects = [
    { label: "Industry", value: industry, def: "all", pad: "pl-[74px]", set: setIndustry, options: [["all", "All"], ...industries.map((i) => [i.slug, i.name])] },
    { label: "Status", value: status, def: "all", pad: "pl-[62px]", set: (v: string) => setStatus(v as Status), options: STATUS },
    { label: "Sort", value: sort, def: "open", pad: "pl-12", set: (v: string) => setSort(v as Sort), options: SORTS },
  ];

  // Roles with something open, offered when a search finds nothing.
  const suggestions = roles.filter((r) => programs.some((p) => p.status === "available" && p.roles.includes(r.slug)));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-9 px-4 pt-9 pb-22 sm:px-6">
      <section className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <div className="min-w-0 flex-[1_1_380px]">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-red-deep">Course library</p>
          <h1 className="display mt-2 text-[clamp(2.2rem,4.6vw,3.25rem)]">Explore Courses</h1>
        </div>
        <div className="min-w-[260px] flex-[0_1_440px]">
          <label className="flex h-[46px] items-center gap-2.5 rounded-[10px] border border-[#d6d4d3] bg-card pr-2 pl-3.5 shadow-[0_1px_2px_rgba(32,30,29,0.04)] focus-within:border-red-deep">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-muted" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input
              ref={search}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setQ("")}
              aria-label="Search courses"
              placeholder="Search by title, role or industry"
              className="h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none placeholder:text-line focus-visible:outline-none"
            />
            {q ? (
              <button type="button" onClick={() => { setQ(""); search.current?.focus(); }} aria-label="Clear search" className="grid size-[26px] place-items-center rounded-md bg-[#eeeded] text-muted">✕</button>
            ) : (
              <kbd className="rounded-[5px] border border-[#dcdad9] bg-[#f7f6f6] px-[7px] py-0.5 font-sans text-xs font-semibold text-muted">/</kbd>
            )}
          </label>
        </div>
      </section>

      <section aria-labelledby="grid-title" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3.5">
          <div role="tablist" aria-label="Roles" className="flex gap-1.5 overflow-x-auto border-b border-[#dcdad9] [scrollbar-width:none]">
            {tabs.map((t) => {
              const on = role === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setRole(t.key)}
                  className={clsx(
                    "-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 pt-2.5 pb-[11px] text-sm whitespace-nowrap hover:text-ink",
                    on ? "border-red-deep font-semibold text-ink" : "border-transparent font-medium text-muted",
                  )}
                >
                  {t.name}
                  <span className="nums text-xs font-semibold text-line">{t.count}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {selects.map((s) => {
              const changed = s.value !== s.def;
              return (
                <label key={s.label} className="relative inline-flex items-center">
                  <span className="pointer-events-none absolute left-3 text-[13px] text-muted">{s.label}</span>
                  <select
                    value={s.value}
                    onChange={(e) => s.set(e.target.value)}
                    aria-label={s.label}
                    className={clsx(
                      "h-9 cursor-pointer appearance-none rounded-lg border pr-8 text-[13px] font-semibold",
                      s.pad,
                      changed ? "border-red-deep bg-red-tint" : "border-[#d6d4d3] bg-card",
                    )}
                  >
                    {s.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="pointer-events-none absolute right-[11px] text-muted" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                </label>
              );
            })}
            {pills.map((p) => (
              <button key={p.aria} type="button" onClick={p.remove} aria-label={p.aria} className="inline-flex h-[30px] items-center gap-1.5 rounded-full bg-red-tint pr-2.5 pl-3 text-xs font-semibold text-red-deep">
                {p.label}<span aria-hidden="true">✕</span>
              </button>
            ))}
            {filtered && (
              <button type="button" onClick={resetAll} className="px-1 py-1.5 text-[13px] font-semibold text-red-deep">Reset filters</button>
            )}
            <p id="grid-title" aria-live="polite" className="ml-auto text-[13px] text-muted">Showing {list.length} of {programs.length} courses</p>
          </div>
        </div>

        {list.length > 0 ? (
          <ul className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(max(280px,calc((100%-48px)/3)),1fr))]">
            {list.map((p) => <li key={p.slug}><LibraryCard program={p} /></li>)}
          </ul>
        ) : (
          <div className="flex flex-col items-center rounded-card bg-card px-6 py-12 text-center shadow-card">
            <div className="grid size-12 place-items-center rounded-xl bg-red-tint text-red-deep">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            </div>
            <p className="mt-4 text-[17px] font-semibold">No courses match these filters</p>
            <p className="mt-1.5 max-w-[420px] text-sm text-muted">Try a broader search, or clear a filter. These roles have courses open today:</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {suggestions.map((r) => (
                <button key={r.slug} type="button" onClick={() => { resetAll(); setRole(r.slug); }} className="rounded-full border border-[#dcdad9] bg-[#f7f6f6] px-3 py-1.5 text-[13px] font-medium hover:border-red-deep hover:text-red-deep">
                  {r.name}
                </button>
              ))}
            </div>
            <button type="button" onClick={resetAll} className="mt-5 rounded-lg bg-red-deep px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-press">Reset filters</button>
          </div>
        )}
      </section>
    </div>
  );
}

function LibraryCard({ program: p }: { program: Program }) {
  const open = p.status === "available";
  const { img, abbr } = cover(p);
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card bg-card shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-1 hover:shadow-float">
      <div className="relative aspect-video overflow-hidden bg-surface">
        {img ? (
          <Image src={img} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
        ) : (
          <>
            <div aria-hidden="true" className="absolute inset-0 [background-image:linear-gradient(rgba(32,30,29,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(32,30,29,0.07)_1px,transparent_1px)] [background-size:28px_28px]" />
            <span aria-hidden="true" className="display absolute bottom-3 left-[18px] text-[60px] leading-none tracking-[-0.05em] text-ink/80">{abbr}</span>
          </>
        )}
        <span className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink">{KIND_SHORT[p.kind]}</span>
        {!open && (
          <span className="absolute right-3 bottom-3 rounded-full bg-ink px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white">Not available</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 px-[22px] pt-5 pb-[22px]">
        <div>
          <h3 className="display text-xl leading-[1.1]">
            <Link href={`/courses/${p.slug}`} className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-red">
              {p.name}
            </Link>
          </h3>
          <p className="mt-1 text-[13px] text-muted">{tagsOf(p)}</p>
        </div>
        <p className="line-clamp-2 text-[13px] leading-relaxed text-[#3d3a39]">{p.summary}</p>
        <span
          aria-hidden="true"
          className={clsx(
            "mt-auto grid h-[38px] place-items-center rounded-lg border text-sm font-bold transition-[filter] group-hover:brightness-[0.92]",
            open ? "border-red-deep bg-red-deep text-white" : "border-[#c8c5c4] bg-card text-ink",
          )}
        >
          {open ? "See the course" : "How to ask about this"}
        </span>
      </div>
    </article>
  );
}
