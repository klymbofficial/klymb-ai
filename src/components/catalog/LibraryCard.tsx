"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { Level, LibraryCourse, MyCourse, Tint } from "@/data/course-cards";
import { trackImages } from "@/data/track-images";
import { opensLater, releaseDay } from "@/lib/release";
import { HIDE_MONEY } from "@/lib/site-status";
import { CourseArt, hasCourseArt } from "./CourseArt";

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

// Read in the browser only: the card is built ahead of time, and the date moves on.
const noChange = () => () => {};

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

/**
 * One course card, as the library at /courses and /dashboard/library shows it
 * and the dashboard's rows reuse: the art with its pills and the save button,
 * the name, level, length and rating, and one button. A course the learner
 * already has says Enrolled and opens at their next step.
 */
export function LibraryCard({ course: c, mine }: { course: LibraryCourse; mine?: MyCourse }) {
  const saved = parseSaved(useSyncExternalStore(subscribeSaved, readSaved, () => "[]")).includes(c.slug);
  const t = TINTS[c.tint];
  const opens = useSyncExternalStore(noChange, () => opensLater(c.slug), () => null);
  const badge = opens ? `Starts ${releaseDay(opens)}` : c.badge;
  const d = c.card;
  // A career track keeps its photograph; the featured courses are drawn; the rest get their letters.
  const photo = hasCourseArt(c.slug) ? undefined : (trackImages as Record<string, (typeof trackImages)[keyof typeof trackImages] | undefined>)[c.slug];
  // A course the learner already has opens at their next step instead of offering to enrol.
  const href = mine?.href ?? c.href;
  const linked = href !== null;
  const cta = mine ? mine.label : !c.open ? "How to ask about this" : linked ? "Enroll" : "Coming soon";
  return (
    <article className={clsx("group relative flex h-full flex-col overflow-hidden rounded-card border border-[#e2e0df] bg-card shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-1 hover:shadow-float", linked && "cursor-pointer")}>
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
          {badge && <span className="rounded-lg bg-ink px-2.5 py-1 text-[13px] font-bold text-white">{badge}</span>}
          {mine ? <span className="rounded-lg bg-red-deep px-2.5 py-1 text-[13px] font-bold text-white">Enrolled</span>
            : c.free && !HIDE_MONEY && <span className="rounded-lg bg-[#e1f4e8] px-2.5 py-1 text-[13px] font-bold text-[#17653a]">Free</span>}
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
            <Link href={href!} className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-red">
              {c.name}
            </Link>
          ) : (
            c.name
          )}
        </h3>

        {mine && <p className="mt-2 text-sm font-semibold text-red-deep">{mine.progress}</p>}
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
          // Not in the catalog's numbers yet: what it is when it is open, plainly not available when it isn't.
          <p className="mt-3 line-clamp-2 text-sm text-muted">{c.open ? c.summary : "No course or enrolment yet."}</p>
        )}

        <div className="mt-auto pt-4">
          <span
            aria-hidden={linked || undefined}
            className={clsx(
              "grid h-10 place-items-center rounded-lg border text-[15px] font-semibold transition-[filter]",
              linked && "cursor-pointer",
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
