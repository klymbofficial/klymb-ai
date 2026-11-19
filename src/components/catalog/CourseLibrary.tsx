"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getIndustry, getRole, roles } from "@/data/catalog";
import { FEATURED, listedCourses, type LibraryCourse, type MyCourse } from "@/data/course-cards";
import { CompactSearch } from "./CompactSearch";
import { CourseFilter, FEATURED_VIEW, STATUS, type Facets, type Sort, type Status } from "./CourseFilter";
import { LibraryCard } from "./LibraryCard";

const tagsOf = (c: LibraryCourse) =>
  [...c.roles.map((r) => getRole(r)?.name), ...c.industries.map((i) => getIndustry(i)?.name)].filter(Boolean).join(" · ");

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

/** The signed-in learner's courses, by library slug, read after the page loads so the page stays the same for everyone. */
function useMyCourses() {
  const [mine, setMine] = useState<Record<string, MyCourse>>({});
  useEffect(() => {
    let live = true;
    fetch("/api/learner/courses", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { courses?: Record<string, MyCourse> } | null) => { if (live && d?.courses) setMine(d.courses); })
      .catch(() => { /* offline or signed out: every card offers to enrol */ });
    return () => { live = false; };
  }, []);
  return mine;
}

/**
 * The course library: search, one Filter button for what to show (the
 * featured courses it opens on, every course, or one role), industry, status
 * and sort, and a card per course. The cards come from data/course-cards,
 * which reads data/catalog, so a course that is not available says so here too.
 *
 * On phones the cards come first: the heading and search box give way to one
 * slim bar (Filter and a search icon) that sticks under the menu.
 *
 * `frame`: "site" under the public pages' floating menu (/courses), "learner"
 * in the dashboard's frame (/dashboard/library), whose top bar on phones
 * scrolls away, so the course bar sticks to the top of the screen there.
 */
export function CourseLibrary({ frame = "site" }: { frame?: "site" | "learner" }) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState(FEATURED_VIEW);
  const [industry, setIndustry] = useState("all");
  const [status, setStatus] = useState<Status>("all");
  const [sort, setSort] = useState<Sort>("open");
  const search = useRef<HTMLInputElement>(null);
  const mine = useMyCourses();
  const enrolled = listedCourses.filter((c) => mine[c.slug]);

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
    const shown = listedCourses.filter((c) => matches(c, { q, role, industry, status }));
    // The featured courses keep their own order; a search or another view uses the catalog's.
    const order = (role === FEATURED_VIEW && !q.trim() ? FEATURED : listedCourses.map((c) => c.slug));
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
    new Set(listedCourses.filter((c) => matches(c, { q, role, industry, status, ...over })).map((c) => c.slug));

  // Roles with something open, offered when a search finds nothing.
  const suggestions = roles.filter((r) => listedCourses.some((c) => c.open && c.roles.includes(r.slug)));

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

      {enrolled.length > 0 && (
        <nav aria-label="Your courses" className="flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-ink/15 py-3 max-sm:-mt-1">
          <span className="text-xs font-extrabold uppercase tracking-[0.14em]">Enrolled</span>
          {enrolled.map((c) => (
            <Link key={c.slug} href={mine[c.slug].href} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/20 bg-card px-4 text-sm font-semibold hover:border-red-deep hover:text-red-deep">
              {c.name}<span className="text-muted">· {mine[c.slug].label}</span>
            </Link>
          ))}
        </nav>
      )}

      <section ref={listTop} aria-labelledby="grid-title" className="flex flex-col gap-4">
        {/* `contents` on phones, so the sticky bar's containing box is the whole list, not this wrapper. */}
        <div className="flex flex-col gap-3.5 max-sm:contents">
          {/*
            Phones: a slim frosted bar that sticks just under the site menu (62px tall there), its glass reaching up
            behind the menu so cards pass under one surface. The pills and Reset give way to the badge and Clear.
          */}
          <div className={clsx("course-bar relative flex flex-wrap items-center gap-2.5 max-sm:sticky max-sm:z-40 max-sm:-mx-4 max-sm:flex-nowrap max-sm:px-4 max-sm:py-2 max-sm:before:absolute max-sm:before:inset-x-0 max-sm:before:bottom-0 max-sm:before:-z-10 max-sm:before:bg-paper/90 max-sm:before:backdrop-blur-md", frame === "site" ? "max-sm:top-[62px] max-sm:before:-top-[62px]" : "max-sm:top-0 max-sm:before:top-0")}>
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
              <span key={list.length} className="count-tick nums font-semibold text-ink">{list.length}</span> of {listedCourses.length} courses
            </p>
          </div>
        </div>

        {list.length > 0 ? (
          <ul className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(max(280px,calc((100%-48px)/3)),1fr))]">
            {list.map((c) => <li key={c.slug}><LibraryCard course={c} mine={mine[c.slug]} /></li>)}
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
