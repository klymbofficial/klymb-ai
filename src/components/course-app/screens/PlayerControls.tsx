"use client";

import clsx from "clsx";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  SPEED_MAX, SPEED_MIN, SPEED_PRESETS, audioTrack, audioTracks, dayOf, fmt, lesson, setSpeed, speedLabel, stepSpeed, subtitleLangs,
  togglePlay, type CourseState, type SubLang, type SubSize,
} from "@/lib/course-app";
import { Icon, type IconName } from "../icons";
import { Segmented } from "../ui";
import type { Act } from "../useCourseApp";

/** Subtitles are drawn over the clean (wide) cut; the portrait cut has them burned in. */
export function canSubtitle(s: CourseState) {
  return !!audioTrack(s)?.wide && subtitleLangs(s.cur).length > 0;
}

export const SUB_SIZE_CLASS: Record<SubSize, string> = {
  s: "text-[clamp(11px,1.7cqw,18px)]",
  m: "text-[clamp(12px,2.1cqw,22px)]",
  l: "text-[clamp(14px,2.8cqw,30px)]",
};

const SUB_SIZES: [SubSize, string][] = [["s", "Small"], ["m", "Medium"], ["l", "Large"]];

const back10 = (p: CourseState): CourseState => ({ ...p, t: Math.max(0, p.t - 10), ended: false, upNext: 0 });
const fwd10 = (p: CourseState): CourseState => ({ ...p, t: Math.min(lesson(p.cur).secs, p.t + 10) });
const toggleSubs = (p: CourseState): CourseState => ({ ...p, subs: !p.subs });
const toggleMute = (p: CourseState): CourseState => ({ ...p, muted: !p.muted, volume: p.muted && p.volume === 0 ? 0.5 : p.volume });

/** Fullscreen for the video box, so subtitles stay on top. iPhone Safari only allows the bare video, without them. */
export function useFullscreen() {
  const box = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  const toggle = () => {
    const el = box.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (el.requestFullscreen) void el.requestFullscreen().catch(() => {});
    else (el.querySelector("video") as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null)?.webkitEnterFullscreen?.();
  };
  return { box, on, toggle };
}

/**
 * Player shortcuts while a lesson video is on screen. Space is handled with
 * the app's other keys; ←/→ belong to the focused scrubber.
 */
export function usePlayerKeys(act: Act, toggleFs: () => void, active: boolean) {
  const fs = useRef(toggleFs);
  useEffect(() => { fs.current = toggleFs; }, [toggleFs]);
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
      else if (k === "f" || k === "F") fs.current();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act, active]);
}

/** A short note over the video when a setting changes: "1.25×", "Subtitles off", "Muted". */
export function useOsd(s: CourseState) {
  const [osd, setOsd] = useState<{ text: string; n: number } | null>(null);
  const prev = useRef({ speed: s.speed, subs: s.subs, subLang: s.subLang, muted: s.muted, volume: s.volume, audio: s.audio });
  useEffect(() => {
    const p = prev.current;
    let text = "";
    if (p.speed !== s.speed) text = `Speed ${speedLabel(s.speed)}`;
    else if (p.subs !== s.subs || p.subLang !== s.subLang) text = s.subs ? `Subtitles: ${s.subLang === "en" ? "English" : "Hinglish"}` : "Subtitles off";
    else if (p.muted !== s.muted) text = s.muted ? "Muted" : `Volume ${Math.round(s.volume * 100)}%`;
    else if (p.volume !== s.volume) text = `Volume ${Math.round(s.volume * 100)}%`;
    else if (p.audio !== s.audio) text = `Audio: ${s.audio}`;
    prev.current = { speed: s.speed, subs: s.subs, subLang: s.subLang, muted: s.muted, volume: s.volume, audio: s.audio };
    if (!text) return;
    // A setting just changed: show it, then let it fade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOsd((o) => ({ text, n: (o?.n ?? 0) + 1 }));
    const t = window.setTimeout(() => setOsd(null), 1400);
    return () => window.clearTimeout(t);
  }, [s.speed, s.subs, s.subLang, s.muted, s.volume, s.audio]);
  return osd;
}

export function Osd({ osd }: { osd: { text: string; n: number } | null }) {
  if (!osd) return null;
  return (
    <div key={osd.n} role="status" className="sd-a-in pointer-events-none absolute top-3 left-1/2 z-[4] -translate-x-1/2 bg-black/80 px-3 py-1.5 text-sm font-extrabold whitespace-nowrap text-white" style={{ animationDuration: ".2s" }}>
      {osd.text}
    </div>
  );
}

function CtlButton({ icon, label, onClick, pressed, wide, className, children, title }: {
  icon?: IconName; label: string; onClick: () => void; pressed?: boolean; wide?: boolean; className?: string; children?: ReactNode; title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      title={title ?? label}
      className={clsx("sd-btn flex-none", !wide && !children && "sd-btn-icon", pressed ? "bg-sd-ink text-sd-bg" : "sd-btn-secondary", "size-11 lg:size-10", wide && "w-auto! px-2.5", className)}
    >
      {icon && <Icon name={icon} size={18} />}{children}
    </button>
  );
}

/** Play, skip, speed, subtitles, sound, fullscreen and the settings panel toggle. */
export function ControlBar({ s, act, settings, onSettings, fs, onFs }: {
  s: CourseState; act: Act; settings: boolean; onSettings: () => void; fs: boolean; onFs: () => void;
}) {
  const playLabel = s.playing ? "Pause" : s.t > 0 ? "Resume" : "Play";
  const subOk = canSubtitle(s);
  const quiet = s.muted || s.volume === 0;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 lg:mt-1.5">
      <button type="button" onClick={() => act(togglePlay)} title={`${playLabel} (Space or K)`} className="sd-btn sd-btn-primary h-11 min-w-[96px] flex-1 justify-start gap-2 lg:h-10 lg:w-[120px] lg:flex-none">
        <Icon name={s.playing ? "pause" : "play"} size={16} />{playLabel}
      </button>
      <CtlButton icon="rotL" label="Back 10 seconds" title="Back 10 seconds (J)" onClick={() => act(back10)} />
      <CtlButton icon="rotR" label="Forward 10 seconds" title="Forward 10 seconds (L)" onClick={() => act(fwd10)} />
      <CtlButton wide label={`Playback speed ${speedLabel(s.speed)}. Change speed`} title="Speed (< and >)" onClick={onSettings} pressed={settings} className="min-w-14 justify-start">
        <span className="text-sm font-extrabold">{speedLabel(s.speed)}</span>
      </CtlButton>
      {subOk && (
        <CtlButton wide icon="captions" label={s.subs ? "Turn subtitles off" : "Turn subtitles on"} title="Subtitles (C)" pressed={s.subs} onClick={() => act(toggleSubs)}>
          <span className="text-xs font-extrabold">{s.subLang === "en" ? "EN" : "HI"}</span>
        </CtlButton>
      )}
      <div className="flex items-center gap-1.5">
        <CtlButton icon={quiet ? "mute" : "volume"} label={quiet ? "Unmute" : "Mute"} title={quiet ? "Unmute (M)" : "Mute (M)"} onClick={() => act(toggleMute)} />
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={s.muted ? 0 : s.volume}
          onChange={(e) => { const volume = Number(e.target.value); act((p) => ({ ...p, volume, muted: volume === 0 })); }}
          aria-label="Volume"
          aria-valuetext={`${Math.round((s.muted ? 0 : s.volume) * 100)}%`}
          className="hidden w-20 accent-sd-accent lg:block"
        />
      </div>
      <CtlButton icon={fs ? "exitFullscreen" : "fullscreen"} label={fs ? "Exit full screen" : "Full screen"} title={fs ? "Exit full screen (F)" : "Full screen (F)"} onClick={onFs} />
      <CtlButton icon="settings" label={settings ? "Close player settings" : "Player settings: speed, audio, subtitles"} title="Settings" pressed={settings} onClick={onSettings} className="ml-auto lg:ml-0" />
    </div>
  );
}

/** The player in words: what it's doing, where it is, how long is left at this speed, and in what language. */
export function StatusLine({ s, qc }: { s: CourseState; qc: string | null }) {
  const d = lesson(s.cur).secs;
  const left = Math.max(0, d - s.t);
  const state = s.vidErr ? "Couldn’t load" : s.ended ? "Finished" : s.playing ? "Playing" : s.t > 0 ? "Paused" : "Ready";
  const subOk = canSubtitle(s);
  const subs = !subOk ? (dayOf(s.cur)?.video ? "subtitles burned in" : null) : s.subs ? `${s.subLang === "en" ? "English" : "Hinglish"} subtitles` : "subtitles off";
  const track = audioTrack(s);
  const parts = [
    `${fmt(left)} left${s.speed !== 1 ? ` · ${fmt(left / s.speed)} at ${speedLabel(s.speed)}` : ""}`,
    track && `${track.lang} audio`,
    subs,
    s.muted || s.volume === 0 ? "muted" : s.volume < 1 ? `volume ${Math.round(s.volume * 100)}%` : null,
  ].filter(Boolean);
  return (
    <div className="mt-2 flex flex-col gap-0.5 text-xs lg:flex-row lg:items-baseline lg:justify-between lg:gap-4 lg:text-[13px]" aria-live="polite" aria-atomic="true">
      <span>
        <b className="font-extrabold">{state}</b> · <span className="font-semibold tabular-nums">{fmt(s.t)} / {fmt(d)}</span>
        {qc && <span className="text-sd-accent-700"> · Quick check at {qc}</span>}
      </span>
      <span className="text-sd-n-700">{parts.join(" · ")}</span>
    </div>
  );
}

function Section({ icon, title, value, children }: { icon: IconName; title: string; value: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2.5 border-b border-sd-divider py-3.5 last:border-b-0">
      <div className="flex items-center gap-2">
        <Icon name={icon} size={16} /><h3 className="sd-h6 m-0 flex-1">{title}</h3><span className="text-[13px] font-extrabold">{value}</span>
      </div>
      {children}
    </section>
  );
}

const SHORTCUTS: [string, string][] = [
  ["Space / K", "Play or pause"], ["J / L", "Back or forward 10s"], ["← / →", "Back or forward 5s (on the timeline)"],
  ["< / >", "Slower or faster"], ["0", "Normal speed"], ["C", "Subtitles on or off"], ["M", "Mute"], ["F", "Full screen"],
];

/** Speed, audio language, subtitles and (on web) the keyboard shortcuts, explained. */
export function PlayerSettings({ s, act, onClose }: { s: CourseState; act: Act; onClose: () => void }) {
  const d = lesson(s.cur).secs;
  const tracks = audioTracks(s.cur);
  const cur = audioTrack(s);
  const subOk = canSubtitle(s);
  const langs = subtitleLangs(s.cur);
  const subValue: "off" | SubLang = s.subs ? s.subLang : "off";
  const presetOk = SPEED_PRESETS.includes(s.speed);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { panel.current?.querySelector<HTMLElement>("[aria-checked=true]")?.focus(); }, []);

  return (
    <div ref={panel} id="player-settings" role="region" aria-label="Player settings" className="sd-a-in mt-3 border-2 border-sd-ink bg-sd-bg px-4 py-1 lg:px-5" style={{ animationDuration: ".25s" }}
      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }}>
      <div className="flex items-center justify-between border-b-2 border-sd-divider py-2.5">
        <span className="text-[15px] font-extrabold">Player settings</span>
        <button type="button" onClick={onClose} aria-label="Close player settings" className="sd-btn sd-btn-icon -mr-2"><Icon name="x" size={18} /></button>
      </div>

      <Section icon="gauge" title="Speed" value={speedLabel(s.speed)}>
        <Segmented
          value={presetOk ? s.speed : -1}
          options={SPEED_PRESETS.map((v) => [v, speedLabel(v)] as [number, string])}
          onChange={(v) => act((p) => setSpeed(p, v))}
          itemClass="px-1 py-2 text-center text-[13px] tabular-nums"
        />
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => act((p) => setSpeed(p, p.speed - 0.05))} disabled={s.speed <= SPEED_MIN} aria-label="Slower by 0.05" className="sd-btn sd-btn-secondary sd-btn-icon size-10"><Icon name="minus" size={16} /></button>
          <input
            type="range"
            min={SPEED_MIN}
            max={SPEED_MAX}
            step={0.05}
            value={s.speed}
            onChange={(e) => act((p) => setSpeed(p, Number(e.target.value)))}
            aria-label="Fine speed"
            aria-valuetext={speedLabel(s.speed)}
            className="min-w-0 flex-1 accent-sd-accent"
          />
          <button type="button" onClick={() => act((p) => setSpeed(p, p.speed + 0.05))} disabled={s.speed >= SPEED_MAX} aria-label="Faster by 0.05" className="sd-btn sd-btn-secondary sd-btn-icon size-10"><Icon name="plus" size={16} /></button>
          <span className="w-14 text-right text-sm font-extrabold tabular-nums">{speedLabel(s.speed)}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-sd-n-700">
          <span>{s.speed === 1 ? `This lesson runs ${fmt(d)}.` : `This lesson runs ${fmt(d)} at 1×, ${fmt(d / s.speed)} at ${speedLabel(s.speed)}.`} Fine steps of 0.05×, from {speedLabel(SPEED_MIN)} to {speedLabel(SPEED_MAX)}.</span>
          {s.speed !== 1 && <button type="button" onClick={() => act((p) => setSpeed(p, 1))} className="sd-btn sd-btn-ghost text-xs">Reset to 1×</button>}
        </div>
      </Section>

      <Section icon="audio" title="Audio language" value={cur?.lang ?? "—"}>
        <div role="radiogroup" aria-label="Audio language" className="flex flex-col border border-sd-divider">
          {tracks.map((tr, i) => {
            const on = tr.lang === cur?.lang;
            return (
              <button
                key={tr.lang}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => act((p) => ({ ...p, audio: tr.lang }))}
                className={clsx("flex cursor-pointer items-center gap-3 border-b border-sd-divider px-3 py-2.5 text-left last:border-b-0", on && "bg-sd-accent-100")}
              >
                <span className={clsx("flex size-5 flex-none items-center justify-center border-[1.5px]", on ? "border-sd-accent bg-sd-accent text-sd-bg" : "border-sd-divider")}>{on && <Icon name="check" size={12} stroke={3} />}</span>
                <span className="flex flex-1 flex-col"><span className="text-sm font-semibold">{tr.lang}</span><span className="text-xs text-sd-n-700">{i === 0 ? "Original voice-over" : "Dubbed voice-over"}</span></span>
              </button>
            );
          })}
        </div>
        <p className="m-0 text-xs text-sd-n-700">
          {tracks.length < 2 ? "This lesson has one voice-over so far. Other languages will show up here when they’re recorded. " : ""}
          The language of the lesson text is the English | Hinglish switch at the top.
        </p>
      </Section>

      <Section icon="captions" title="Subtitles" value={!subOk ? "Burned in" : s.subs ? (s.subLang === "en" ? "English" : "Hinglish") : "Off"}>
        {subOk ? (
          <>
            <Segmented
              value={subValue}
              options={[["off", "Off"], ...langs] as ["off" | SubLang, string][]}
              onChange={(v) => act((p) => (v === "off" ? { ...p, subs: false } : { ...p, subs: true, subLang: v }))}
              itemClass="px-2.5 py-2 text-center text-[13px]"
            />
            <div className="flex items-center gap-3">
              <span className="w-10 flex-none text-xs font-semibold">Size</span>
              <Segmented value={s.subSize} options={SUB_SIZES} onChange={(subSize) => act((p) => ({ ...p, subSize, subs: true }))} className="flex-1" itemClass="px-2.5 py-1.5 text-center text-xs" />
            </div>
            <p className="m-0 text-xs text-sd-n-700">English subtitles are translated from the Hinglish voice-over. The Transcript tab follows the language you pick here.</p>
          </>
        ) : (
          <p className="m-0 text-xs text-sd-n-700">This cut of the video has its subtitles burned in, so they can’t be switched here.</p>
        )}
      </Section>

      <section aria-label="Keyboard shortcuts" className="hidden flex-col gap-2 py-3.5 lg:flex">
        <div className="flex items-center gap-2"><Icon name="keyboard" size={16} /><h3 className="sd-h6 m-0">Keyboard shortcuts</h3></div>
        <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          {SHORTCUTS.map(([k, what]) => (
            <div key={k} className="flex items-baseline gap-2"><dt className="w-[72px] flex-none font-extrabold">{k}</dt><dd className="m-0 text-sd-n-700">{what}</dd></div>
          ))}
        </dl>
      </section>
    </div>
  );
}
