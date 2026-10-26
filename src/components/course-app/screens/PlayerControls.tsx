"use client";

import clsx from "clsx";
import { useEffect, useState, type MouseEvent } from "react";
import {
  SPEED_PRESETS, audioTrack, audioTracks, fmt, lesson, seekTo, setSpeed, speedLabel, stepSpeed, subtitleLangs, togglePlay,
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

export type MenuKey = "speed" | "audio" | "cc";

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

/** The choices in each menu: speed presets, the lesson's voice-overs, and captions off or in a language. */
function options(s: CourseState, act: Act, done: () => void): Record<MenuKey, Opt[]> {
  const voice = audioTrack(s);
  const cc: "off" | SubLang = s.subs ? s.subLang : "off";
  return {
    speed: SPEED_PRESETS.map((v) => ({ key: String(v), label: v === 1 ? "1× Normal" : speedLabel(v), on: s.speed === v, pick: () => { act((p) => setSpeed(p, v)); done(); } })),
    audio: audioTracks(s.cur).map((tr) => ({
      key: tr.lang, label: tr.lang, on: tr.lang === voice?.lang,
      pick: () => { act((p) => ({ ...p, audio: tr.lang, toast: `Audio: ${tr.lang}. Picking up at ${fmt(p.t)}`, toastUntil: Date.now() + 2200 })); done(); },
    })),
    cc: ([["off", "Off"], ...subtitleLangs(s.cur)] as ["off" | SubLang, string][]).map(([v, label]) => ({
      key: v, label, on: cc === v, pick: () => { act((p) => (v === "off" ? { ...p, subs: false } : { ...p, subs: true, subLang: v })); done(); },
    })),
  };
}

const MENU_TITLE: Record<MenuKey, string> = { speed: "Speed", audio: "Audio", cc: "Captions" };
const audioCode = (lang?: string) => (lang ? (lang === "Hinglish" ? "HGL" : lang.slice(0, 2).toUpperCase()) : "");
const ccName = (s: CourseState) => (s.subLang === "en" ? "English" : "Hinglish");

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
  const subOk = canSubtitle(s);
  const seek = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    act((p) => seekTo(p, Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * d));
  };
  return (
    <div data-sd-menu onClick={(e) => e.stopPropagation()} className="absolute inset-x-0 bottom-0 z-[2] flex cursor-default flex-col bg-gradient-to-b from-transparent to-black/82 to-42% px-1.5 pt-[26px] pb-1 text-white lg:hidden">
      {ui.menu && (
        <div role="menu" aria-label={MENU_TITLE[ui.menu]} className="sd-a-in absolute inset-x-2 bottom-full flex flex-wrap items-center gap-1.5 rounded-[10px] bg-black/86 p-2" style={{ animationDuration: ".2s" }}>
          <span className="w-full text-[10px] font-extrabold tracking-[0.1em] text-white/70 uppercase">{MENU_TITLE[ui.menu]}</span>
          {opts[ui.menu].map((o) => (
            <button key={o.key} type="button" role="menuitemradio" aria-checked={o.on} onClick={o.pick} className={clsx("cursor-pointer rounded-full border-[1.5px] px-3 py-[7px] text-xs font-bold text-white", o.on ? "border-sd-accent bg-sd-accent" : "border-white/35 bg-transparent")}>
              {o.label}
            </button>
          ))}
        </div>
      )}
      <div onClick={seek} role="slider" tabIndex={0} aria-label="Seek" aria-valuemin={0} aria-valuemax={d} aria-valuenow={Math.round(s.t)} aria-valuetext={`${fmt(s.t)} of ${fmt(d)}`}
        onKeyDown={(e) => { if (e.key === "ArrowLeft") act((p) => seekTo(p, p.t - 5)); else if (e.key === "ArrowRight") act((p) => seekTo(p, p.t + 5)); else return; e.preventDefault(); }}
        className="relative mx-2.5 flex h-[18px] cursor-pointer items-center">
        <div className="absolute inset-x-0 h-1 rounded-full bg-white/30" />
        <div className="absolute left-0 h-1 rounded-full bg-sd-accent" style={{ width: cur }} />
        {(s.notes[s.cur] ?? []).filter((n) => n.t <= d).map((n, i) => <div key={i} className="absolute top-[3px] -ml-px h-3 w-[3px] rounded-sm bg-white" style={{ left: `${((n.t / d) * 100).toFixed(2)}%` }} />)}
        <div className="absolute -ml-1.5 size-[13px] rounded-full border-2 border-white bg-sd-accent" style={{ left: cur }} />
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
          <button type="button" onClick={() => ui.toggle("cc")} aria-label="Captions" aria-expanded={ui.menu === "cc"} className={clsx(barBtn, "text-xs font-extrabold")}>
            <span className={clsx("rounded border-[1.5px] border-white px-[5px] py-0.5", s.subs ? "bg-sd-accent" : "bg-transparent")}>CC</span>
          </button>
        )}
        <button type="button" onClick={toggleFullscreen} aria-label="Fullscreen" className={barBtn}><Icon name="fullscreen" /></button>
      </div>
    </div>
  );
}

/** A dropdown above a control on web: a title, then the choices with a tick on the current one. */
function Dropdown({ title, opts }: { title: string; opts: Opt[] }) {
  return (
    <div role="menu" aria-label={title} className="sd-a-in sd-shadow-md absolute right-0 bottom-[calc(100%+6px)] z-30 flex min-w-32 flex-col rounded-[10px] border-2 border-sd-ink bg-sd-bg p-1" style={{ animationDuration: ".2s" }}>
      <span className="px-2 pt-1.5 pb-1 text-[10px] font-extrabold tracking-[0.1em] text-sd-n-700 uppercase">{title}</span>
      {opts.map((o) => (
        <button key={o.key} type="button" role="menuitemradio" aria-checked={o.on} onClick={o.pick} className={clsx("flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-[7px] text-left text-[13px] font-semibold", o.on ? "bg-sd-ink text-sd-bg" : "hover:bg-sd-accent-100")}>
          {o.label}{o.on && <Icon name="check" size={14} stroke={3} />}
        </button>
      ))}
    </div>
  );
}

/** Web: the controls under the video. Speed, audio and captions are buttons with dropdowns. */
export function ControlRow({ s, act, ui, qc }: { s: CourseState; act: Act; ui: ReturnType<typeof useMenu>; qc: string | null }) {
  const opts = options(s, act, () => ui.setMenu(null));
  const playLabel = s.playing ? "Pause" : s.t > 0 ? "Resume" : "Play";
  const voice = audioTrack(s);
  const subOk = canSubtitle(s);
  const menu = (k: MenuKey) => ui.menu === k && <Dropdown title={MENU_TITLE[k]} opts={opts[k]} />;
  return (
    <div data-sd-menu className="mt-1.5 hidden items-center gap-2 lg:flex">
      <button type="button" onClick={() => act(togglePlay)} title={`${playLabel} (Space or K)`} className="sd-btn sd-btn-primary h-10 w-[120px] justify-start gap-2"><Icon name={s.playing ? "pause" : "play"} size={16} />{playLabel}</button>
      <button type="button" onClick={() => act(back10)} aria-label="Back 10 seconds" title="Back 10 seconds (J)" className="sd-btn sd-btn-secondary sd-btn-icon size-10"><Icon name="rotL" size={16} /></button>
      <button type="button" onClick={() => act(fwd10)} aria-label="Forward 10 seconds" title="Forward 10 seconds (L)" className="sd-btn sd-btn-secondary sd-btn-icon size-10"><Icon name="rotR" size={16} /></button>
      <div className="relative flex flex-none">
        <button type="button" onClick={() => ui.toggle("speed")} aria-label={`Playback speed ${speedLabel(s.speed)}`} aria-expanded={ui.menu === "speed"} title="Speed (< and >)" className="sd-btn sd-btn-secondary h-10 w-[60px] justify-start">{speedLabel(s.speed)}</button>
        {menu("speed")}
      </div>
      <div className="relative flex flex-none">
        <button type="button" onClick={() => ui.toggle("audio")} aria-label={`Audio language: ${voice?.lang ?? ""}`} aria-expanded={ui.menu === "audio"} className="sd-btn sd-btn-secondary h-10 justify-start gap-1"><Icon name="headphones" size={16} />{audioCode(voice?.lang)}</button>
        {menu("audio")}
      </div>
      {subOk && (
        <div className="relative flex flex-none">
          <button type="button" onClick={() => ui.toggle("cc")} aria-label="Captions" aria-expanded={ui.menu === "cc"} title="Captions (C)" className={clsx("sd-btn h-10 justify-start gap-1 border-sd-ink", s.subs ? "bg-sd-ink text-sd-bg" : "sd-btn-secondary")}>
            {s.subs ? `CC · ${ccName(s)}` : "CC"}
          </button>
          {menu("cc")}
        </div>
      )}
      <button type="button" onClick={toggleFullscreen} aria-label="Fullscreen" title="Fullscreen (F)" className="sd-btn sd-btn-secondary sd-btn-icon size-10"><Icon name="fullscreen" size={16} /></button>
      {qc && <span className="ml-auto text-[13px] font-semibold text-sd-accent-700">Quick check at {qc}</span>}
      <span className={clsx("pl-3 text-[13px] font-semibold tabular-nums", !qc && "ml-auto")}>{fmt(s.t)} / {lesson(s.cur).dur}</span>
    </div>
  );
}
