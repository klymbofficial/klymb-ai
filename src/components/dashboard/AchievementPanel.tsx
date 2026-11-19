"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Medal } from "@/components/achievements/Medal";
import { STORAGE_KEY } from "@/components/course-app/useCourseApp";
import { MEDAL_FAMILIES, firstMilestone, latestBadge, type CourseBadge } from "@/lib/achievements";
import { badges, fromStored, serverState } from "@/lib/course-app";
import type { SdProgress } from "@/lib/sd-pace";

const SD = "system-design";

const earnedOn = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));

/**
 * The dashboard's achievements: the latest badge, big enough to feel earned,
 * with what it was for and which course it came from; or, before any badge,
 * the first one within reach. Every badge, grouped by course, opens below.
 *
 * System Design keeps some progress only in the browser (notes, practice
 * answers), so its badges are completed here from this browser's saved course,
 * with the course's own `badges()`, exactly as its Progress screen does.
 */
export function AchievementPanel({ initial, titles, featured, sd }: {
  initial: CourseBadge[];
  titles: Record<string, string>;
  featured: string | null;
  sd: { passes: Record<string, number>; progress: SdProgress | null } | null;
}) {
  const [list, setList] = useState(initial);

  useEffect(() => {
    if (!sd) return;
    let raw: unknown = null;
    try { raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null"); } catch { /* storage off: the server's badges stand */ }
    if (!raw) return;
    const on = new Set(badges(serverState(sd.passes, sd.progress, fromStored(raw))).filter((b) => b.on).map((b) => b.name));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the saved course is only readable after hydration
    setList((l) => l.map((b) => (b.course === SD && !b.earned && on.has(b.name) ? { ...b, earned: true } : b)));
  }, [sd]);

  if (!list.length) return null;
  const latest = latestBadge(list);
  const b = latest ?? firstMilestone(list, featured);
  if (!b) return null;
  const f = MEDAL_FAMILIES[b.family];
  const earnedCount = list.filter((x) => x.earned).length;
  const groups = [...list.reduce((m, x) => m.set(x.course, [...(m.get(x.course) ?? []), x]), new Map<string, CourseBadge[]>())];

  return (
    <section aria-labelledby="achievement-title" className="card p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 id="achievement-title" className="text-xs font-extrabold uppercase tracking-[0.16em] text-red-deep">{latest ? "Latest badge" : "Your first badge"}</h3>
        {earnedCount > 0 && <p className="text-sm text-muted nums">{earnedCount} of {list.length} earned</p>}
      </div>

      <div className="mt-6 grid grid-cols-1 items-center gap-x-6 gap-y-5 min-[400px]:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-10">
        <Medal family={b.family} icon={b.icon} on={b.earned} className="size-28 sm:size-40" iconSize={48} />
        <div className="min-w-0">
          <p className="text-sm font-bold" style={{ color: b.earned ? f.deep : "var(--color-muted)" }}>
            {f.label} · {titles[b.course] ?? b.course}
          </p>
          <p className="display mt-1 text-[clamp(1.75rem,3.6vw,3rem)] text-balance">{b.name}</p>
          <p className="mt-3 max-w-[46ch] text-base text-pretty">{b.earned ? b.description : b.hint}</p>
          <p className="mt-2 text-sm text-muted nums">
            {b.earned
              ? (b.earnedAt ? `Earned ${earnedOn(b.earnedAt)}` : "Earned on this device")
              : b.toward ? `${b.toward.done} of ${b.toward.of} so far` : null}
          </p>
          <Link href={b.courseHref} className="mt-3 inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:text-red-deep">
            {b.earned ? "View and share" : `Open ${titles[b.course] ?? "the course"}`}
          </Link>
        </div>
      </div>

      {list.length > 1 && (
        <details className="group mt-8 border-t border-ink/10">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
            All achievements
            <span aria-hidden="true" className="text-lg transition-transform group-open:rotate-45">+</span>
          </summary>
          <div className="flex flex-col gap-6 pb-2">
            {groups.map(([course, items]) => (
              <div key={course}>
                <h4 className="flex items-baseline justify-between gap-4 text-sm font-bold">
                  {titles[course] ?? course}
                  <span className="font-normal text-muted nums">{items.filter((x) => x.earned).length} of {items.length}</span>
                </h4>
                <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-x-3 gap-y-4">
                  {items.map((x) => (
                    <li key={x.key} className="flex flex-col items-center gap-2 text-center">
                      <Medal family={x.family} icon={x.icon} on={x.earned} className="size-14" iconSize={20} />
                      <span className={x.earned ? "text-xs leading-tight font-bold" : "text-xs leading-tight text-muted"}>
                        {x.name}
                        <span className="sr-only">{x.earned ? ", earned" : `, locked: ${x.hint}`}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
