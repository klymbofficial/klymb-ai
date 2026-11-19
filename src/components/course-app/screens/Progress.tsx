"use client";

import clsx from "clsx";
import { useState } from "react";
import { Medal } from "@/components/achievements/Medal";
import { ShareAchievement } from "@/components/achievements/ShareAchievement";
import { MEDAL_FAMILIES, SD_BADGES, type MedalIcon } from "@/lib/achievements";
import { site } from "@/data/config";
import { useCourseUser } from "../user";
import { badges, localDate, streak, type CourseState } from "@/lib/course-app";
import { Icon, type IconName } from "../icons";
import { Bar, parallax, stagger, useCountUp } from "../ui";
import { moduleViews } from "./Course";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** The last five weeks, Monday first, ending this Sunday: active, idle, or still ahead. */
function heat(s: CourseState, now = new Date()) {
  const start = new Date(now);
  start.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 28);
  const today = localDate(now);
  return Array.from({ length: 35 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = localDate(d);
    if (key > today) return "future";
    if (key === today && s.activeDays.includes(key)) return "today";
    return s.activeDays.includes(key) ? "on" : "off";
  });
}

const familyOf = (name: string) => SD_BADGES[name]?.family ?? "learn";

function BadgeTile({ name, icon, on, selected, delay, pick }: {
  name: string; icon: MedalIcon; on: boolean; selected: boolean; delay: number; pick: () => void;
}) {
  const c = MEDAL_FAMILIES[familyOf(name)];
  return (
    <button
      type="button"
      disabled={!on}
      title={on ? `${name}, earned` : `${name}, locked`}
      aria-pressed={on ? selected : undefined}
      onClick={pick}
      className={clsx(
        "sd-a-pop relative flex flex-col items-center gap-2.5 rounded-[14px] border px-1.5 py-3.5 lg:gap-3 lg:px-2.5 lg:py-4",
        on ? "cursor-pointer transition-transform hover:-translate-y-0.5" : "cursor-default",
      )}
      style={{
        animationDelay: `${delay}ms`,
        borderColor: on ? "rgba(32,30,29,.06)" : "rgba(32,30,29,.08)",
        background: on ? `linear-gradient(180deg, ${c.light} 0%, #fffdf9 72%)` : "#ece7df",
        boxShadow: on ? `0 1px 2px rgba(32,30,29,.06), 0 12px 24px -14px ${c.deep}66` : "none",
        outline: selected ? `2px solid ${c.base}` : undefined,
        outlineOffset: 2,
      }}
    >
      <Medal family={familyOf(name)} icon={icon} on={on} className="size-[62px] lg:size-[76px]" />
      <span className="flex flex-col items-center gap-[3px]">
        <span className="text-[10px] font-extrabold tracking-[0.12em] uppercase" style={{ color: on ? c.deep : "var(--sd-n-600)" }}>{c.label}</span>
        <span className={clsx("text-center text-[13px] leading-[1.2] font-extrabold", on ? "text-sd-ink" : "text-sd-n-700")}>{name}</span>
      </span>
    </button>
  );
}

export function Progress({ s }: { s: CourseState }) {
  const user = useCourseUser();
  const [selected, setSelected] = useState<string | null>(null);
  const st = streak(s);
  const shown = useCountUp(st.current);
  const HEAT = heat(s);
  const active = HEAT.filter((h) => h === "on" || h === "today").length;
  const b = badges(s);
  const earned = b.filter((x) => x.on);
  const shareBadge = earned.find((x) => x.name === selected) ?? earned[earned.length - 1];
  const mods = moduleViews(s);
  const goalMin = Math.floor(s.todaySec / 60);
  const met = s.todaySec >= s.goal * 60;
  return (
    <div className="sd-a-screen flex max-w-[1120px] flex-col gap-[22px] px-5 pt-2 pb-7 lg:gap-7 lg:p-0">
      <h2 className="m-0 text-[30px] tracking-[-0.02em] lg:border-b-2 lg:border-sd-divider lg:pb-4 lg:text-[42px] lg:tracking-[-0.03em]">Progress</h2>
      <div className="flex flex-col gap-[22px] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-start lg:gap-8">
        <div
          {...parallax}
          className="flex flex-col gap-0.5 overflow-hidden rounded-2xl px-[18px] pt-[18px] pb-4 text-[#fff7f2] lg:p-[22px]"
          style={{
            background: "radial-gradient(120% 90% at 100% 0%, #a3121a 0%, var(--sd-accent) 55%, #5a0307 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.18), 0 14px 30px -12px rgba(90,3,7,.55), 0 2px 6px rgba(32,30,29,.12)",
          }}
        >
          <div className="flex items-start justify-between">
            <span className="sd-near inline-block text-8xl leading-[0.85] font-extrabold tracking-[-0.05em] lg:text-[128px]" aria-label={`${st.current}`}>{shown}</span>
            <Icon name="flame" size={40} />
          </div>
          <div className="mt-2 text-[22px] font-extrabold">day streak</div>
          <div className="text-[13px]">{st.current ? `Longest: ${st.longest} days` : "Pass a lesson to start it."}</div>
        </div>
        <div className="rounded-2xl border border-[rgba(32,30,29,.07)] bg-[#fffdf9] px-[18px] py-4 shadow-[0_1px_2px_rgba(32,30,29,.05),0_10px_24px_-16px_rgba(32,30,29,.25)]">
          <div className="mb-2.5 flex items-baseline justify-between">
            <h6 className="sd-h6 text-xs">Last 5 weeks</h6>
            <span className="flex items-center gap-1.5 text-xs text-sd-n-700"><span className="size-2 rounded-[2px] bg-[#b08a3e]" />{active} active</span>
          </div>
          <div className="grid grid-cols-7 gap-[5px]">
            {DAYS.map((d, i) => <span key={i} className="text-[11px] text-sd-n-700">{d}</span>)}
            {HEAT.map((h, i) => (
              <div
                key={i}
                aria-hidden="true"
                className={clsx("sd-a-pop aspect-square rounded-lg lg:aspect-auto lg:h-[30px]", h === "future" && "border-[1.5px] border-dashed border-sd-divider")}
                style={{
                  ...stagger(i, 12, 150),
                  animationDuration: ".4s",
                  background: h === "today" ? "var(--sd-accent)" : h === "on" ? "#b08a3e" : h === "off" ? "#ebe5db" : "transparent",
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <section aria-label="Today’s goal" className="flex flex-col gap-2 border-t-2 border-sd-divider pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h6 className="sd-h6 m-0">Today’s goal</h6>
          <span className="text-xs font-bold text-sd-accent-700">{met ? "Goal met" : `${s.goal - goalMin} min to go`}</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[40px] leading-none font-extrabold tracking-[-0.03em]">{Math.min(goalMin, s.goal)}</span>
          <span className="text-[15px] font-bold text-sd-n-700">/ {s.goal} min</span>
        </div>
        <Bar value={(s.todaySec / (s.goal * 60)) * 100} className="h-1.5" />
        <span className="text-xs text-sd-n-700">Pass today’s lesson to keep your streak.</span>
      </section>
      <div
        className="rounded-[20px] border border-[rgba(32,30,29,.06)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.7),0_18px_40px_-28px_rgba(32,30,29,.35)] lg:p-6"
        style={{ background: "linear-gradient(180deg, #f7f2ea, #efe9df)" }}
      >
        <div className="mb-1 flex items-end justify-between gap-3">
          <h3 className="m-0 text-2xl leading-none tracking-[-0.03em] lg:text-[30px]">Badges</h3>
          <span className="text-[15px] font-extrabold">{earned.length}<span className="text-sd-n-600"> / {b.length}</span></span>
        </div>
        <div className="my-2.5 flex gap-1">
          {b.map((x) => <span key={x.name} className="h-1 flex-1 rounded-full" style={{ background: x.on ? MEDAL_FAMILIES[familyOf(x.name)].base : "rgba(32,30,29,.12)" }} />)}
        </div>
        <p className="mt-0 mb-4 text-[13px] text-sd-n-700">{earned.length ? "Tap an earned badge to share it." : "Finish a lesson to earn your first."}</p>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3.5">
          {b.map((x, i) => (
            <BadgeTile
              key={x.name}
              name={x.name}
              icon={x.icon}
              on={x.on}
              selected={!!shareBadge && shareBadge.name === x.name}
              delay={300 + i * 60}
              pick={() => setSelected(x.name)}
            />
          ))}
        </div>
        {shareBadge && (
          <div className="mt-5">
            <ShareAchievement key={shareBadge.name} variant="poster" posterIcon={<Icon name={shareBadge.icon as IconName} size={40} />} badge={shareBadge} course="System Design Essentials" courseUrl={`${site.url}/learn/system-design`} initialName={user?.name ?? ""} />
          </div>
        )}
      </div>
      <div>
        <h6 className="sd-h6 mb-2">Modules</h6>
        <div className="border-t-2 border-sd-divider lg:grid lg:grid-cols-2 lg:gap-x-8">
          {mods.map((m) => (
            <div key={m.mi} className="grid grid-cols-[32px_1fr_100px_36px] items-center gap-2.5 border-b border-sd-divider py-2.5 lg:gap-2.5">
              <span className={clsx("text-sm font-extrabold", m.n ? "text-sd-accent" : "text-sd-n-500")}>{m.num}</span>
              <span className="truncate text-sm">{m.title}</span>
              <Bar value={(m.n / m.total) * 100} grow className="h-1.5" style={stagger(m.mi, 40, 120)} />
              <span className="text-right text-xs font-semibold">{m.n}/{m.total}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
