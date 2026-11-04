"use client";

import { useState } from "react";
import { ShareAchievement } from "@/components/achievements/ShareAchievement";
import { site } from "@/data/config";

/** The four badges, scaled to the course: halfway and the finish follow its length (30 or 60 days). */
function milestonesFor(total: number) {
  const half = Math.ceil(total / 2);
  return [
    { days: 1, name: "First step", description: "Submitted my first day of coursework." },
    { days: 7, name: "Seven days of progress", description: "Submitted seven days of coursework." },
    { days: half, name: "Halfway there", description: `Submitted ${half} days of coursework.` },
    { days: total, name: `${total}-day finisher`, description: `Submitted all ${total} days of coursework.` },
  ];
}

export function Achievements({ days, total, name, course, courseUrl }: { days: number; total: number; name: string; course: string; /** Its public page, linked from the badge. */ courseUrl: string }) {
  const milestones = milestonesFor(total);
  const [selected, setSelected] = useState<number | null>(null);
  const earned = milestones.filter((m) => days >= m.days);
  const badge = earned.find((m) => m.days === selected) ?? earned[earned.length - 1];
  return (
    <section aria-labelledby="achievements-title" className="mt-12">
      <h2 id="achievements-title" className="text-2xl font-bold">Your milestones, worth celebrating</h2>
      <p className="mt-2 text-sm text-muted">{earned.length ? "Turn your progress into a badge to share on LinkedIn." : "Submit your first day of coursework to unlock your first shareable badge."} Badges mark submitted work, not reviewer approval.</p>
      <div className="my-5 flex flex-wrap gap-3" aria-label="Achievement badges">
        {milestones.map((m) => <button key={m.days} type="button" disabled={days < m.days} aria-pressed={badge?.days === m.days} onClick={() => setSelected(m.days)} className="min-h-11 rounded-md border border-line/40 px-4 py-3 text-sm font-bold enabled:cursor-pointer enabled:hover:border-ink disabled:opacity-60 aria-pressed:bg-ink aria-pressed:text-paper">{days >= m.days ? "✓" : "Locked:"} {m.name}</button>)}
      </div>
      {badge && <ShareAchievement badge={badge} course={course} courseUrl={`${site.url}${courseUrl}`} initialName={name} />}
    </section>
  );
}
