"use client";

import clsx from "clsx";
import { useEffect, useState, type MouseEvent } from "react";
import {
  SPEED_PRESETS, audioTrack, audioTracks, fmt, hasQuickCheck, lesson, quickCheckAt, seekTo, setSpeed, speedLabel, stepSpeed, subtitleLangs, togglePlay,
  type CourseState, type SubLang, type SubSize,
} from "@/lib/course-app";
import { Icon } from "../icons";
import type { Act } from "../useCourseApp";

/** Subtitles are drawn over the clean (wide) cut; the portrait cut has them burned in. */
export function canSubtitle(s: CourseState) {
  return !!audioTrack(s)?.wide && subtitleLangs(s.cur).length > 0;
}

export const SUB_SIZE_CLASS: Record<SubSize, string> = {
  s: "text-[clamp(11px,1.7cqw,18px)]",
  m: "text-[clamp(13px,2.1cqw,22px)]",
  l: "text-[clamp(14px,2.8cqw,30px)]",
};

const back10 = (p: CourseState): CourseState => ({ ...p, t: Math.max(0, p.t - 10), ended: false, upNext: 0 });
const fwd10 = (p: CourseState): CourseState => ({ ...p, t: Math.min(lesson(p.cur).secs, p.t + 10) });
const toggleSubs = (p: CourseState): CourseState => ({ ...p, subs: !p.subs });
const toggleMute = (p: CourseState): CourseState => ({ ...p, muted: !p.muted, volume: p.muted && p.volume === 0 ? 0.5 : p.volume });

/**
 * Player shortcuts while a lesson video is on screen. Space is handled with
 * the app's other keys; ←/→ belong to the focused scrubber.
 */
/**
 * Fullscreen for the lesson video. The whole player box goes fullscreen so the
 * design's own controls come with it; iPhone Safari can only fullscreen a
 * <video>, so it falls back to the native player there.
 */
export function toggleFullscreen() {
  if (document.fullscreenElement) { void document.exitFullscreen(); return; }
  const box = document.getElementById("lesson-watch");
  const video = box?.querySelector("video") as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
  if (box?.requestFullscreen) box.requestFullscreen().catch(() => video?.webkitEnterFullscreen?.());
  else video?.webkitEnterFullscreen?.();
}

export function usePlayerKeys(act: Act, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k === "k" || k === "K") act(togglePlay);
      else if (k === "j" || k === "J") act(back10);
      else if (k === "l" || k === "L") act(fwd10);
      else if (k === ">" || k === ".") act((p) => stepSpeed(p, 1));
      else if (k === "<" || k === ",") act((p) => stepSpeed(p, -1));
      else if (k === "0") act((p) => setSpeed(p, 1));
      else if (k === "c" || k === "C") act(toggleSubs);
      else if (k === "m" || k === "M") act(toggleMute);
      else if (k === "f" || k === "F") toggleFullscreen();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act, active]);
}

export type MenuKey = "speed" | "audio" | "subs";

/** Which player menu is open; a press anywhere outside the controls (marked data-sd-menu) closes it. */
export function useMenu() {
  const [menu, setMenu] = useState<MenuKey | null>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => { if (!(e.target as Element | null)?.closest?.("[data-sd-menu]")) setMenu(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(null); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [menu]);
  const toggle = (k: MenuKey) => setMenu((m) => (m === k ? null : k));
  return { menu, setMenu, toggle };
}

interface Opt { key: string; label: string; on: boolean; pick: () => void }

/** The choices in each menu: speed presets, the lesson's voice-overs, and subtitles by language and size. */
function options(s: CourseState, act: Act, done: () => void): Record<MenuKey, Opt[][]> {
  const voice = audioTrack(s);
  const original = audioTracks(s.cur)[0]?.lang;
  const cc: "off" | SubLang = s.subs ? s.subLang : "off";
  return {
    speed: [SPEED_PRESETS.map((v) => ({ key: String(v), label: v === 1 ? "1× Normal" : speedLabel(v), on: s.speed === v, pick: () => { act((p) => setSpeed(p, v)); done(); } }))],
    audio: [audioTracks(s.cur).map((tr) => ({
      key: tr.lang, label: tr.lang === original ? `${tr.lang} (original)` : tr.lang, on: tr.lang === voice?.lang,
      pick: () => { act((p) => ({ ...p, audio: tr.lang, toast: `Audio: ${tr.lang}. Picking up at ${fmt(p.t)}`, toastUntil: Date.now() + 2200 })); done(); },
    }))],
    subs: [
      ([["off", "Off"], ...subtitleLangs(s.cur)] as ["off" | SubLang, string][]).map(([v, label]) => ({
        key: v, label, on: cc === v, pick: () => { act((p) => (v === "off" ? { ...p, subs: false } : { ...p, subs: true, subLang: v })); done(); },
      })),
      [
        { key: "s", label: "Small", on: s.subSize === "s", pick: () => { act((p) => ({ ...p, subSize: "s" as const })); done(); } },
        { key: "m", label: "Medium", on: s.subSize === "m", pick: () => { act((p) => ({ ...p, subSize: "m" as const })); done(); } },
        { key: "l", label: "Large", on: s.subSize === "l", pick: () => { act((p) => ({ ...p, subSize: "l" as const })); done(); } },
      ],
    ],
  };
}

const MENU_TITLE: Record<MenuKey, string> = { speed: "Speed", audio: "Audio", subs: "Subtitles" };
const MENU_GROUPS: Record<MenuKey, string[]> = { speed: [""], audio: [""], subs: ["Subtitles", "Size"] };

const barBase = "flex h-11 flex-none cursor-pointer items-center justify-center rounded-lg p-0 text-white hover:bg-white/16";
/** Under 360px the icon buttons narrow and the time drops its total, so the whole row, Fullscreen included, fits a 320px phone. */
const barBtn = `${barBase} w-9 max-[359px]:w-8 sm:w-10`;

/**
 * Mobile: the controls sit on the video, YouTube-style. A scrubber, then play,
 * ±10s and the time; speed, audio and captions open a row of chips above.
 */
export function VideoBar({ s, act, ui }: { s: CourseState; act: Act; ui: ReturnType<typeof useMenu> }) {
  const d = lesson(s.cur).secs;
  const cur = `${((s.t / d) * 100).toFixed(2)}%`;
  const opts = options(s, act, () => ui.setMenu(null));
  const open = ui.menu;
  const subOk = canSubtitle(s);
  const seek = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    act((p) => seekTo(p, Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * d));
  };
  return (
    <div data-sd-menu onClick={(e) => e.stopPropagation()} className="absolute inset-x-0 bottom-0 z-[2] flex cursor-default flex-col bg-gradient-to-b from-transparent to-black/82 to-42% px-1.5 pt-[26px] pb-1 text-white">
      {open && (
        <div role="menu" aria-label={MENU_TITLE[open]} className="sd-a-in absolute right-2 bottom-[calc(100%-22px)] flex w-[min(300px,calc(100%-16px))] flex-col gap-2.5 rounded-[10px] bg-[rgba(18,16,15,.94)] p-2.5" style={{ animationDuration: ".2s" }}>
          {opts[open].map((group, g) => (
            <div key={g} className="flex flex-col gap-1.5">
              {MENU_GROUPS[open][g] && <span className="text-[10px] font-extrabold tracking-[0.1em] text-white/72 uppercase">{MENU_GROUPS[open][g]}</span>}
              <div className="flex flex-wrap gap-1.5">
                {group.map((o) => (
                  <button key={o.key} type="button" role="menuitemradio" aria-checked={o.on} onClick={o.pick} className={clsx("cursor-pointer rounded-full border-[1.5px] px-3 py-[7px] text-xs font-bold", o.on ? "border-sd-accent-400 bg-sd-accent-400 text-sd-ink" : "border-white/35 bg-transparent text-white")}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div onClick={seek} role="slider" tabIndex={0} aria-label="Seek" aria-valuemin={0} aria-valuemax={d} aria-valuenow={Math.round(s.t)} aria-valuetext={`${fmt(s.t)} of ${fmt(d)}`}
        onKeyDown={(e) => { if (e.key === "ArrowLeft") act((p) => seekTo(p, p.t - 5)); else if (e.key === "ArrowRight") act((p) => seekTo(p, p.t + 5)); else return; e.preventDefault(); }}
        className="relative mx-2.5 flex h-[18px] cursor-pointer items-center">
        <div className="absolute inset-x-0 h-1 rounded-full bg-white/30" />
        <div className="absolute left-0 h-1 rounded-full bg-sd-accent-400" style={{ width: cur }} />
        {(s.notes[s.cur] ?? []).filter((n) => n.t <= d).map((n, i) => <div key={i} className="absolute top-[3px] -ml-px h-3 w-[3px] rounded-sm bg-white" style={{ left: `${((n.t / d) * 100).toFixed(2)}%` }} />)}
        {hasQuickCheck(s.cur) && !s.qcDone.includes(s.cur) && (
          <div className="absolute top-[3px] -ml-[5px] size-[11px] rotate-45 border-[2.5px] border-sd-accent-400 bg-sd-ink" style={{ left: `${((quickCheckAt(s.cur) / d) * 100).toFixed(2)}%` }} />
        )}
        <div className="absolute -ml-1.5 size-[13px] rounded-full border-2 border-white bg-sd-accent-400" style={{ left: cur }} />
      </div>
      <div className="flex items-center gap-0.5">
        <button type="button" onClick={() => act(togglePlay)} aria-label={s.playing ? "Pause" : "Play"} className={barBtn}><Icon name={s.playing ? "pause" : "play"} size={22} /></button>
        <button type="button" onClick={() => act(back10)} aria-label="Back 10 seconds" className={barBtn}><Icon name="rotL" /></button>
        <button type="button" onClick={() => act(fwd10)} aria-label="Forward 10 seconds" className={barBtn}><Icon name="rotR" /></button>
        <span className="pl-1 text-xs font-semibold whitespace-nowrap tabular-nums">{fmt(s.t)}<span className="max-[359px]:hidden"> / {fmt(d)}</span></span>
        <span className="flex-1" />
        <button type="button" onClick={() => ui.toggle("speed")} aria-label={`Playback speed ${speedLabel(s.speed)}`} aria-expanded={ui.menu === "speed"} className={clsx(barBase, "w-11 text-[13px] font-extrabold sm:w-10")}>{speedLabel(s.speed)}</button>
        <button type="button" onClick={() => ui.toggle("audio")} aria-label="Audio language" aria-expanded={ui.menu === "audio"} className={barBtn}><Icon name="headphones" /></button>
        {subOk && (
          <button type="button" onClick={() => ui.toggle("subs")} aria-label="Captions" aria-expanded={ui.menu === "subs"} className={clsx(barBtn, "text-xs font-extrabold")}>
            <span className={clsx("rounded border-[1.5px] border-white px-[5px] py-0.5", s.subs ? "border-sd-accent-400 bg-sd-accent-400 text-sd-ink" : "bg-transparent")}>CC</span>
          </button>
        )}
        <button type="button" onClick={toggleFullscreen} aria-label="Fullscreen" className={clsx(barBtn, "hidden lg:flex")}><Icon name="fullscreen" /></button>
      </div>
    </div>
  );
}
