"use client";

import type { ReactNode } from "react";
import { LEARNER, STREAK } from "@/data/system-design/course-app";
import { badges, type CourseState } from "@/lib/course-app";
import { Icon } from "../icons";
import { Segmented, Stats, Toggle } from "../ui";
import type { Act } from "../useCourseApp";

type BoolKey = "autoplay" | "wifiOnly" | "streakRem" | "replyNotif" | "offline" | "vidErr";

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2 border-b border-sd-divider py-3">{children}</div>;
}

function Label({ label, sub }: { label: string; sub?: string | null }) {
  return <div className="flex flex-col"><span className="text-[15px] font-semibold">{label}</span>{sub && <span className="text-xs text-sd-n-700">{sub}</span>}</div>;
}

function LinkRow({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full cursor-pointer items-center gap-3 text-left">
      <span className="flex-1"><Label label={label} sub={sub} /></span>
      <span className="flex text-sd-n-600"><Icon name="chevR" size={16} /></span>
    </button>
  );
}

export function Profile({ s, act }: { s: CourseState; act: Act }) {
  const flip = (k: BoolKey) => () => act((p) => ({ ...p, [k]: !p[k] }));
  const tog = (k: BoolKey, label: string, sub?: string) => <Row><Toggle on={s[k]} onClick={flip(k)} label={label} sub={sub} /></Row>;
  const used = s.dl.reduce((a, x) => a + x.size, 0);
  const unread = s.notifs.filter((n) => n.unread).length;
  const groups: [string, ReactNode][] = [
    ["Learning", <>
      <Row><Label label="Daily goal" sub="Your streak only needs one lesson or quick check." /><Segmented value={s.goal} options={[[5, "5 min"], [15, "15 min"], [30, "30 min"]]} onChange={(goal) => act((p) => ({ ...p, goal }))} /></Row>
      <Row><Label label="Reminder" sub="We’ll nudge you if you haven’t learned yet that day." /><Segmented value={s.remind} options={[["08:00", "8 am"], ["13:00", "1 pm"], ["19:00", "7 pm"]]} onChange={(remind) => act((p) => ({ ...p, remind }))} /></Row>
      {tog("autoplay", "Autoplay next lesson", "Starts a 5-second countdown when a video ends.")}
    </>],
    ["Video and downloads", <>
      <Row><Label label="Video quality" /><Segmented value={s.quality} options={[["auto", "Auto"], ["hd", "HD"], ["saver", "Data saver"]]} onChange={(quality) => act((p) => ({ ...p, quality }))} /></Row>
      {tog("wifiOnly", "Download over Wi-Fi only")}
      <Row><LinkRow label="Downloads" sub={`${s.dl.length} lessons · ${used} MB`} onClick={() => act((p) => ({ ...p, screen: "downloads" }))} /></Row>
    </>],
    ["Notifications", <>
      {tog("streakRem", "Streak reminders")}
      {tog("replyNotif", "Replies to my questions")}
      <Row><LinkRow label="Notifications inbox" sub={unread ? `${unread} unread` : "All read"} onClick={() => act((p) => ({ ...p, screen: "notifs" }))} /></Row>
    </>],
    ["Preview states", <>
      {tog("offline", "Offline", "Shows how the app behaves without internet.")}
      {tog("vidErr", "Video fails to load", "Shows the player’s error state.")}
    </>],
    ["Account", <>
      <Row><LinkRow label="Sign out" sub={LEARNER.email} onClick={() => act((p) => ({ ...p, screen: "onboard", onboarded: false, onb: 0, tab: "home", playing: false }))} /></Row>
    </>],
  ];

  return (
    <div className="sd-a-screen flex max-w-[1040px] flex-col gap-[22px] px-5 pt-2 pb-7 lg:p-0">
      <div className="flex items-center gap-3.5 border-b-2 border-sd-divider pb-4">
        <span className="flex size-16 flex-none items-center justify-center bg-sd-ink text-[22px] font-extrabold text-sd-bg lg:size-20 lg:text-[28px]">{LEARNER.initials}</span>
        <div className="flex flex-col">
          <span className="text-2xl font-extrabold tracking-[-0.02em] lg:text-4xl">{LEARNER.name}</span>
          <span className="text-[13px] text-sd-n-700">{LEARNER.email} · System Design</span>
        </div>
      </div>
      <Stats className="lg:max-w-[520px]" items={[[STREAK.current, "day streak"], [s.done.length, "lessons done"], [badges(s).filter((b) => b.on).length, "badges"]]} />
      <div className="grid grid-cols-1 items-start gap-y-6 lg:grid-cols-2 lg:gap-x-10">
        {groups.map(([label, rows]) => (
          <section key={label} aria-label={label}>
            <h6 className="sd-h6 mb-1.5">{label}</h6>
            <div className="border-t-2 border-sd-divider">{rows}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
