"use client";

import clsx from "clsx";
import { useState } from "react";
import { Medal } from "@/components/achievements/Medal";
import { ShareAchievement } from "@/components/achievements/ShareAchievement";
import { site } from "@/data/config";
import { MEDAL_FAMILIES, trackMilestones } from "@/lib/achievements";

/** A track's or challenge's four milestones, drawn as Klymb's medals; an earned one can be shared. */
export function Achievements({ days, total, name, course, courseUrl }: { days: number; total: number; name: string; course: string; /** Its public page, linked from the badge. */ courseUrl: string }) {
  const milestones = trackMilestones(total);
  const [selected, setSelected] = useState<number | null>(null);
  const earned = milestones.filter((m) => days >= m.days);
  const badge = earned.find((m) => m.days === selected) ?? earned[earned.length - 1];
  return (
    <section aria-labelledby="achievements-title" className="mt-12 scroll-mt-24">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t-2 border-ink pt-4">
        <h2 id="achievements-title" className="text-2xl font-bold">Milestones</h2>
        <p className="text-sm font-semibold text-muted nums">{earned.length} of {milestones.length} earned</p>
      </div>
      <p className="mt-2 text-sm text-muted">{earned.length ? "Pick an earned badge to share it on LinkedIn." : "Submit Day 1 to earn your first badge."} Badges mark submitted work, not reviewer approval.</p>
      <ul className="my-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Badges">
        {milestones.map((m) => {
          const on = days >= m.days;
          const f = MEDAL_FAMILIES[m.family];
          return (
            <li key={m.days}>
              <button
                type="button"
                disabled={!on}
                aria-pressed={on ? badge?.days === m.days : undefined}
                onClick={() => setSelected(m.days)}
                className={clsx(
                  "flex h-full w-full flex-col items-center gap-2.5 rounded-[14px] border px-2 py-4 text-center",
                  on ? "cursor-pointer border-ink/10 bg-card hover:border-ink/30" : "cursor-default border-ink/8 bg-surface",
                  on && badge?.days === m.days && "outline-2 outline-offset-2",
                )}
                style={on && badge?.days === m.days ? { outlineColor: f.base, outlineStyle: "solid" } : undefined}
              >
                <Medal family={m.family} icon={m.icon} on={on} className="size-16" />
                <span className="text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: on ? f.deep : "var(--color-muted)" }}>{f.label}</span>
                <span className={clsx("text-[13px] leading-tight font-extrabold", !on && "text-muted")}>{m.name}</span>
                {!on && <span className="text-xs text-muted">{m.hint}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {badge && <ShareAchievement badge={badge} course={course} courseUrl={`${site.url}${courseUrl}`} initialName={name} />}
    </section>
  );
}
