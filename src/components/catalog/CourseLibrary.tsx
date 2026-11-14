"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { getIndustry, getRole, roles } from "@/data/catalog";
import { FEATURED, libraryCourses, type Level, type LibraryCourse, type Tint } from "@/data/course-cards";
import { trackImages } from "@/data/track-images";
import { CourseArt, hasCourseArt } from "./CourseArt";
import { CompactSearch } from "./CompactSearch";
import { CourseFilter, FEATURED_VIEW, STATUS, type Facets, type Sort, type Status } from "./CourseFilter";

/** The art ground, its ruled lines and the colour of the big letters. */
const TINTS: Record<Tint, { bg: string; grid: string; ink: string }> = {
  clay: { bg: "#fbeae1", grid: "rgba(156,67,32,0.13)", ink: "#9c4320" },
  violet: { bg: "#ecebfb", grid: "rgba(74,58,166,0.13)", ink: "#4a3aa6" },
  green: { bg: "#e1f1e9", grid: "rgba(29,106,80,0.13)", ink: "#1d6a50" },
  blue: { bg: "#e1edfb", grid: "rgba(31,79,143,0.13)", ink: "#1f4f8f" },
  amber: { bg: "#fbf1da", grid: "rgba(134,88,10,0.13)", ink: "#86580a" },
  rose: { bg: "#fbe7e8", grid: "rgba(131,5,11,0.1)", ink: "#83050b" },
  slate: { bg: "#ecebea", grid: "rgba(32,30,29,0.08)", ink: "#6b6867" },
};

const LEVEL_BARS: Record<Level, number> = { Beginner: 1, Intermediate: 2, Advanced: 3 };

/** 12400 → "12.4k", 640 → "640". */
const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n));

const tagsOf = (c: LibraryCourse) =>
  [...c.roles.map((r) => getRole(r)?.name), ...c.industries.map((i) => getIndustry(i)?.name)].filter(Boolean).join(" · ");

// Saved courses live only in this browser: there is no account-side list.
const SAVED_KEY = "klymb.savedCourses";
const savedListeners = new Set<() => void>();
const readSaved = () => {
  try {
    return window.localStorage.getItem(SAVED_KEY) ?? "[]";
  } catch {
    return "[]";
  }
};
const parseSaved = (raw: string): string[] => {
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
};
const subscribeSaved = (fn: () => void) => {
  savedListeners.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    savedListeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
};
function toggleSaved(slug: string) {
  const list = parseSaved(readSaved());
  const next = list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  } catch {
    return;
  }
  savedListeners.forEach((l) => l());
}

/** Whether a course survives the search, the view ("featured", "all" or a role) and both filters. */
function matches(c: LibraryCourse, f: Facets & { q: string }) {
  const needle = f.q.trim().toLowerCase();
  // A search looks at every course, not only the featured ones the page opens on.
  const view = f.role === FEATURED_VIEW && needle ? "all" : f.role;
  if (view === FEATURED_VIEW && !FEATURED.includes(c.slug)) return false;
  if (view !== FEATURED_VIEW && view !== "all" && !c.roles.includes(view as LibraryCourse["roles"][number])) return false;
  if (f.industry !== "all" && !c.industries.includes(f.industry as LibraryCourse["industries"][number])) return false;
  if (f.status !== "all" && c.open !== (f.status === "available")) return false;
  if (needle && ![c.name, c.kind, c.category, c.summary, tagsOf(c)].join(" ").toLowerCase().includes(needle)) return false;
  return true;
}

/**
 * The course library: search, one Filter button for what to show (the
 * featured courses it opens on, every course, or one role), industry, status
 * and sort, and a card per course. The cards come from data/course-cards,
 * which reads data/catalog, so a course that is not available says so here too.
 *
 * On phones the cards come first: the heading and search box give way to one
 * slim bar (Filter and a search icon) that sticks under the menu.
 */
export function CourseLibrary() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState(FEATURED_VIEW);
  const [industry, setIndustry] = useState("all");
  const [status, setStatus] = useState<Status>("all");
  const [sort, setSort] = useState<Sort>("open");
  const search = useRef<HTMLInputElement>(null);
  const savedRaw = useSyncExternalStore(subscribeSaved, readSaved, () => "[]");
  const saved = useMemo(() => new Set(parseSaved(savedRaw)), [savedRaw]);

  // "/" jumps to the search box from anywhere on the page. On phones the box is hidden and CompactSearch answers instead.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || /input|textarea|select/i.test(document.activeElement?.tagName ?? "")) return;
      if (!search.current?.offsetParent) return;
      e.preventDefault();
      search.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Phones: when the results change while the bar is stuck under the menu, show them from the start. The bar keeps
  // its place on screen; without this a shorter list would drop the page to the footer, taking the bar (and the
  // field being typed in, or the open Filter panel) with it. Skipped on the first render, so a restored scroll stays.
  const listTop = useRef<HTMLElement>(null);
  const settled = useRef(false);
  useLayoutEffect(() => {
    if (!settled.current) { settled.current = true; return; }
    const bar = listTop.current?.querySelector<HTMLElement>(".course-bar");
    if (!listTop.current || !bar || getComputedStyle(bar).position !== "sticky") return;
    const top = listTop.current.getBoundingClientRect().top + window.scrollY - parseFloat(getComputedStyle(bar).top);
    if (window.scrollY > top) window.scrollTo({ top, behavior: "instant" });
  }, [q, role, industry, status, sort]);

  const list = useMemo(() => {
    const shown = libraryCourses.filter((c) => matches(c, { q, role, industry, status }));
    // The featured courses keep their own order; a search or another view uses the catalog's.
    const order = (role === FEATURED_VIEW && !q.trim() ? FEATURED : libraryCourses.map((c) => c.slug));
    return [...shown].sort(sort === "az"
      ? (a, b) => a.name.localeCompare(b.name)
      : (a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
  }, [q, role, industry, status, sort]);

  const pills: { label: string; aria: string; remove: () => void }[] = [];
  if (q.trim()) pills.push({ label: `“${q.trim()}”`, aria: "Remove search", remove: () => setQ("") });
  if (role !== FEATURED_VIEW) pills.push({ label: role === "all" ? "All courses" : getRole(role)?.name ?? role, aria: "Remove role filter", remove: () => setRole(FEATURED_VIEW) });
  if (industry !== "all") pills.push({ label: getIndustry(industry)?.name ?? industry, aria: "Remove industry filter", remove: () => setIndustry("all") });
  if (status !== "all") pills.push({ label: STATUS.find((s) => s[0] === status)![1], aria: "Remove status filter", remove: () => setStatus("all") });
  const filtered = pills.length > 0 || sort !== "open";
  const resetAll = () => { setQ(""); setRole(FEATURED_VIEW); setIndustry("all"); setStatus("all"); setSort("open"); };

  // What the page would show with one facet swapped, for the counts and previews in the filter panel.
  const matchesWith = (over: Partial<Facets>) =>
    new Set(libraryCourses.filter((c) => matches(c, { q, role, industry, status, ...over })).map((c) => c.slug));

  // Roles with something open, offered when a search finds nothing.
  const suggestions = roles.filter((r) => libraryCourses.some((c) => c.open && c.roles.includes(r.slug)));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-9 px-4 pt-3 pb-22 sm:px-6 sm:pt-9">
      {/* Phones: the heading stays for screen readers only, and the search box gives way to CompactSearch in the bar. */}
      <section className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5 max-sm:contents">
        <div className="min-w-0 flex-[1_1_380px] max-sm:sr-only">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-red-deep">Course library</p>
          <h1 className="display mt-2 text-[clamp(2.2rem,4.6vw,3.25rem)]">Explore Courses</h1>
        </div>
        <div className="min-w-[260px] flex-[0_1_440px] max-sm:hidden">
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

      <section ref={listTop} aria-labelledby="grid-title" className="flex flex-col gap-4">
        {/* `contents` on phones, so the sticky bar's containing box is the whole list, not this wrapper. */}
        <div className="flex flex-col gap-3.5 max-sm:contents">
          {/*
            Phones: a slim frosted bar that sticks just under the site menu (62px tall there), its glass reaching up
            behind the menu so cards pass under one surface. The pills and Reset give way to the badge and Clear.
          */}
          <div className="course-bar relative flex flex-wrap items-center gap-2.5 max-sm:sticky max-sm:top-[62px] max-sm:z-40 max-sm:-mx-4 max-sm:flex-nowrap max-sm:px-4 max-sm:py-2 max-sm:before:absolute max-sm:before:inset-x-0 max-sm:before:-top-[62px] max-sm:before:bottom-0 max-sm:before:-z-10 max-sm:before:bg-paper/90 max-sm:before:backdrop-blur-md">
            <CourseFilter
              role={role}
              industry={industry}
              status={status}
              sort={sort}
              setRole={setRole}
              setIndustry={setIndustry}
              setStatus={setStatus}
              setSort={setSort}
              matchesWith={matchesWith}
            />
            <CompactSearch q={q} setQ={setQ} count={list.length} />
            {pills.map((p) => (
              <button key={p.aria} type="button" onClick={p.remove} aria-label={p.aria} className="inline-flex h-[30px] items-center gap-1.5 rounded-full bg-red-tint pr-2.5 pl-3 text-xs font-semibold text-red-deep max-sm:hidden">
                {p.label}<span aria-hidden="true">✕</span>
              </button>
            ))}
            {filtered && (
              <button type="button" onClick={resetAll} className="px-1 py-1.5 text-[13px] font-semibold text-red-deep max-sm:hidden">Reset filters</button>
            )}
            <p id="grid-title" aria-live="polite" className="ml-auto text-[13px] whitespace-nowrap text-muted">
              <span className="max-sm:hidden">Showing </span>
              <span key={list.length} className="count-tick nums font-semibold text-ink">{list.length}</span> of {libraryCourses.length} courses
            </p>
          </div>
        </div>

        {list.length > 0 ? (
          <ul className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(max(280px,calc((100%-48px)/3)),1fr))]">
            {list.map((c) => <li key={c.slug}><LibraryCard course={c} saved={saved.has(c.slug)} /></li>)}
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

function LevelBars({ level }: { level: Level }) {
  const on = LEVEL_BARS[level];
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0">
      {[[1, 8, 5], [5.5, 5, 8], [10, 2, 11]].map(([x, y, h], i) => (
        <rect key={x} x={x} y={y} width="3" height={h} rx="1" className={i < on ? "fill-red-deep" : "fill-[#d6d4d3]"} />
      ))}
    </svg>
  );
}

function LibraryCard({ course: c, saved }: { course: LibraryCourse; saved: boolean }) {
  const t = TINTS[c.tint];
  const d = c.card;
  // A career track keeps its photograph; the featured courses are drawn; the rest get their letters.
  const photo = hasCourseArt(c.slug) ? undefined : (trackImages as Record<string, (typeof trackImages)[keyof typeof trackImages] | undefined>)[c.slug];
  const linked = c.href !== null;
  const cta = !c.open ? "How to ask about this" : linked ? "Enroll" : "Coming soon";
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-[#e2e0df] bg-card shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-1 hover:shadow-float">
      <div
        className="relative aspect-[19/10] overflow-hidden"
        style={{
          backgroundColor: t.bg,
          backgroundImage: `linear-gradient(${t.grid} 1px, transparent 1px), linear-gradient(90deg, ${t.grid} 1px, transparent 1px)`,
          backgroundSize: "26px 26px",
        }}
      >
        {hasCourseArt(c.slug) ? (
          <CourseArt slug={c.slug} />
        ) : photo ? (
          <Image src={photo.src} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
        ) : (
          <span aria-hidden="true" className="absolute bottom-4 left-5 text-[64px] leading-none font-extrabold tracking-[-0.04em]" style={{ color: t.ink }}>
            {c.glyph}
          </span>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className="rounded-lg bg-white/95 px-2.5 py-1 text-[13px] font-semibold text-ink">{c.category}</span>
          {c.badge && <span className="rounded-lg bg-ink px-2.5 py-1 text-[13px] font-bold text-white">{c.badge}</span>}
          {c.free && <span className="rounded-lg bg-[#e1f4e8] px-2.5 py-1 text-[13px] font-bold text-[#17653a]">Free</span>}
        </div>
        <button
          type="button"
          onClick={() => toggleSaved(c.slug)}
          aria-pressed={saved}
          aria-label={`Save ${c.name}`}
          className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-xl bg-white/95 text-ink shadow-[0_1px_2px_rgba(32,30,29,0.08)] hover:bg-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4.5L6 21z" /></svg>
        </button>
        {!c.open && (
          <span className="absolute right-3 bottom-3 rounded-full bg-ink px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white">Not available</span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-5 pt-4 pb-5">
        <h3 className="text-[17px] leading-snug font-bold">
          {linked ? (
            <Link href={c.href!} className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-red">
              {c.name}
            </Link>
          ) : (
            c.name
          )}
        </h3>

        {d ? (
          <>
            <ul className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <li className="inline-flex items-center gap-1.5"><LevelBars level={d.level} />{d.level}</li>
              <li className="inline-flex items-center gap-1.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-muted" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                <span className="nums">{d.hours}</span> hours
              </li>
              <li className="text-muted"><span className="nums">{d.lessons}</span> {d.unit ?? "lessons"}</li>
            </ul>
            {d.rating !== undefined && d.reviews !== undefined && d.learners !== undefined && (
              <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0 fill-[#b4461f]" aria-hidden="true"><path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" /></svg>
                <strong className="nums font-bold">{d.rating.toFixed(1)}</strong>
                <span className="nums text-muted">({compact(d.reviews)})</span>
                <span aria-hidden="true" className="text-line">·</span>
                <span className="nums text-muted">{compact(d.learners)} learners</span>
              </p>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm text-muted">No course or enrolment yet.</p>
        )}

        <div className="mt-auto pt-4">
          <span
            aria-hidden={linked || undefined}
            className={clsx(
              "grid h-10 place-items-center rounded-lg border text-[15px] font-semibold transition-[filter]",
              c.open && linked && "border-red-deep bg-red-deep text-white group-hover:brightness-[0.92]",
              c.open && !linked && "border-[#dcdad9] bg-[#f4f3f3] text-muted",
              !c.open && "border-[#c8c5c4] bg-card text-ink group-hover:brightness-[0.92]",
            )}
          >
            {cta}
          </span>
        </div>
      </div>
    </article>
  );
}
