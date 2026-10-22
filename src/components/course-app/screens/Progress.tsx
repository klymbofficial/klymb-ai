"use client";

import clsx from "clsx";
import { STREAK } from "@/data/system-design/course-app";
import { badges, type CourseState } from "@/lib/course-app";
import { Icon } from "../icons";
import { Bar, parallax, stagger, useCountUp } from "../ui";
import { moduleViews } from "./Course";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** Sample activity for the last five weeks: day 9 was covered by a streak freeze, days 33–34 haven't happened yet. */
const HEAT = Array.from({ length: 35 }, (_, i) => {
  if (i === 9) return "frozen";
  if (i > 32) return "future";
  const active = (i >= 2 && i <= 16) || (i >= 21 && i <= 32);
  return active ? (i % 3 === 0 ? "light" : "on") : "off";
});

export function Progress({ s }: { s: CourseState }) {
  const streak = useCountUp(STREAK.current);
  const b = badges(s);
  const mods = moduleViews(s);
  return (
    <div className="sd-a-screen flex max-w-[1120px] flex-col gap-[22px] px-5 pt-2 pb-7 lg:gap-7 lg:p-0">
      <h2 className="m-0 text-[30px] tracking-[-0.02em] lg:border-b-2 lg:border-sd-divider lg:pb-4 lg:text-[42px] lg:tracking-[-0.03em]">Progress</h2>
      <div className="flex flex-col gap-[22px] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-start lg:gap-8">
        <div {...parallax} className="flex flex-col gap-0.5 bg-sd-accent px-[18px] pt-[18px] pb-4 text-sd-bg lg:p-[22px]">
          <div className="flex items-start justify-between">
            <span className="sd-near inline-block text-8xl leading-[0.85] font-extrabold tracking-[-0.05em] lg:text-[128px]" aria-label={`${STREAK.current}`}>{streak}</span>
            <Icon name="flame" size={40} />
          </div>
          <div className="mt-2 text-xl font-extrabold lg:mt-2.5 lg:text-2xl">day streak</div>
          <div className="text-[13px] lg:text-sm">Longest: {STREAK.longest} days · {STREAK.freezes} streak freezes ready. A freeze covers a missed day for you.</div>
        </div>
        <div>
          <div className="mb-2 flex items-baseline justify-between"><h6 className="sd-h6">Last 5 weeks</h6><span className="text-xs text-sd-n-700">27 active · 1 frozen</span></div>
          <div className="grid grid-cols-7 gap-1 lg:gap-[5px]">
            {DAYS.map((d, i) => <span key={i} className="text-[11px] text-sd-n-700">{d}</span>)}
            {HEAT.map((h, i) => (
              <div
                key={i}
                aria-hidden="true"
                className={clsx(
                  "sd-a-pop aspect-square lg:aspect-auto lg:h-[30px]",
                  h === "frozen" && "sd-frozen",
                  h === "future" && "border-[1.5px] border-dashed border-sd-divider",
                  h === "on" && "bg-sd-accent",
                  h === "light" && "bg-sd-accent-400",
                  h === "off" && "bg-sd-n-300",
                )}
                style={{ ...stagger(i, 12, 150), animationDuration: ".4s" }}
              />
            ))}
          </div>
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-baseline justify-between"><h6 className="sd-h6">Badges</h6><span className="text-xs text-sd-n-700">{b.filter((x) => x.on).length} of 8</span></div>
        <div className="grid grid-cols-4 gap-1.5 lg:grid-cols-8 lg:gap-2">
          {b.map((x, i) => (
            <div key={x.name} className={clsx("sd-a-pop flex aspect-square flex-col justify-between border-[1.5px] p-2 lg:p-3", x.on ? "border-solid border-sd-ink bg-sd-ink text-sd-bg" : "border-dashed border-sd-n-400 text-sd-n-600")} style={stagger(i, 60, 300)}>
              <Icon name={x.on ? x.icon : "lock"} size={22} />
              <span className="text-[11px] leading-[1.15] font-extrabold lg:text-[13px]">{x.name}<span className="sr-only">{x.on ? ", earned" : ", locked"}</span></span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h6 className="sd-h6 mb-2">Modules</h6>
        <div className="border-t-2 border-sd-divider lg:grid lg:grid-cols-2 lg:gap-x-8">
          {mods.map((m) => (
            <div key={m.mi} className="grid grid-cols-[28px_1fr_80px_32px] items-center gap-2 border-b border-sd-divider py-[9px] lg:grid-cols-[32px_1fr_120px_36px] lg:gap-2.5 lg:py-[11px]">
              <span className={clsx("text-[13px] font-extrabold lg:text-sm", m.n ? "text-sd-accent" : "text-sd-n-500")}>{m.num}</span>
              <span className="truncate text-[13px] lg:text-sm">{m.title}</span>
              <Bar value={(m.n / m.total) * 100} grow className="h-1.5" style={stagger(m.mi, 40, 120)} />
              <span className="text-right text-xs font-semibold">{m.n}/{m.total}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
