"use client";

import { HIDE_MONEY } from "@/lib/site-status";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { priceNow } from "@/lib/offer";
import { allFree, priceFrom, tracks } from "@/data/tracks";
import { formatINR } from "@/lib/format";
import { FilmAudio } from "./filmAudio";

/*
 * A 30-second motion-graphics film with a synthesised soundtrack, drawn in the
 * page rather than shipped as an MP4: sharp at any size, nothing to download,
 * and its last frame is a real, clickable call to action. It plays silently
 * when it scrolls into view (browsers forbid sound before a tap); "Sound on"
 * turns the soundtrack on. Pause, replay, and reduced motion (end card only)
 * are all supported.
 *
 * Script (28s):
 *   0–3s   "Your job title is on a list."             titles drop in, a pluck each
 *   3–8s   "AI now does the routine part."             each title slashed through, a blade swipe each
 *   8–14s  "The work isn't ending. The title is."      old title → new role, one by one, a rising sweep each
 *   14–19s "30 days. One real problem a day."           giant day counter, ticks; checkpoints ring
 *   19–24s "Proof you can show."                        three proof points, a chime each
 *   24–28s "Finish all 30 days. Get 100% of your fee back."  CTA, a swelling chord
 */
const LENGTH = 28;
const SCENES = [
  { from: 0, line: "Your job title is on a list." },
  { from: 3, line: "AI now does the routine part." },
  { from: 8, line: "The work isn't ending. The title is." },
  { from: 14, line: "30 days. One real problem a day." },
  { from: 19, line: "Proof you can show." },
  { from: 24, line: HIDE_MONEY ? "Every track. 30 days. Job-ready." : allFree ? "Every track. All 30 days. Free." : "Finish all 30 days. Get 100% of your fee back." },
];
const EASE = [0.2, 0.7, 0.2, 1] as const;
const ROLE_EVERY = 1.15; // seconds per old-title → new-role swap in scene 3
const COUNT_FOR = 4.2; // seconds the day counter takes to reach 30

function sceneAt(t: number) {
  let i = 0;
  for (let s = 0; s < SCENES.length; s++) if (t >= SCENES[s].from) i = s;
  return i;
}

type Cue = { at: number; play: (a: FilmAudio) => void };

/** Every sound, at the second it belongs to. */
const CUES: Cue[] = [
  ...SCENES.slice(1).map((s) => ({ at: s.from, play: (a: FilmAudio) => a.whoosh() })),
  ...tracks.map((_, i) => ({ at: 0.15 + i * 0.18, play: (a: FilmAudio) => a.pluck(i * 2) })),
  ...tracks.map((_, i) => ({ at: 3.3 + i * 0.6, play: (a: FilmAudio) => a.slash() })),
  ...tracks.map((_, i) => ({ at: 8.25 + i * ROLE_EVERY, play: (a: FilmAudio) => a.rise() })),
  ...Array.from({ length: 30 }, (_, i) => ({ at: 14.3 + (i / 30) * COUNT_FOR, play: (a: FilmAudio) => a.tick((i + 1) % 7 === 0 && i < 28) })),
  ...[0, 1, 2].map((i) => ({ at: 19.4 + i * 0.55, play: (a: FilmAudio) => a.chime(i) })),
  { at: 24.2, play: (a: FilmAudio) => a.swell() },
];

export function PromoFilm() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(reduced ? LENGTH : 0);
  const [playing, setPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const elapsed = useRef(0);
  const audio = useRef<FilmAudio | null>(null);

  // Play while on screen, unless the viewer paused it.
  useEffect(() => {
    if (reduced || !ref.current) return;
    const io = new IntersectionObserver(([e]) => setPlaying(e.isIntersecting && !userPaused), { threshold: 0.5 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [reduced, userPaused]);

  // The clock: advances the film and fires each sound cue it passes.
  useEffect(() => {
    if (!playing) return;
    if (soundOn) void audio.current?.resume();
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const before = elapsed.current;
      elapsed.current = Math.min(LENGTH, before + dt);
      if (soundOn && audio.current) {
        for (const c of CUES) if (c.at > before && c.at <= elapsed.current) c.play(audio.current);
      }
      setT(elapsed.current);
      if (elapsed.current >= LENGTH) setPlaying(false);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (soundOn) audio.current?.pause();
    };
  }, [playing, soundOn]);

  useEffect(() => () => audio.current?.close(), []);

  function toggleSound() {
    if (!audio.current) audio.current = new FilmAudio();
    const next = !soundOn;
    setSoundOn(next);
    if (next) {
      // Turning sound on also starts the film from the top, so the music lands with the story.
      void audio.current.resume();
      elapsed.current = 0;
      setT(0);
      setUserPaused(false);
      setPlaying(true);
    } else {
      audio.current.pause();
    }
  }

  /** Jumps to a time without replaying the sound cues it skips over. */
  function seek(to: number) {
    elapsed.current = Math.max(0, Math.min(LENGTH, to));
    setT(elapsed.current);
    if (elapsed.current >= LENGTH) setPlaying(false);
  }

  function togglePlay() {
    if (t >= LENGTH) { seek(0); setUserPaused(false); setPlaying(true); return; }
    setUserPaused(playing);
    setPlaying(!playing);
  }

  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void ref.current?.requestFullscreen?.();
  }

  // Keyboard, while focus is inside the film: k/space play-pause, arrows ±5s, m sound, f full screen.
  function onKey(e: React.KeyboardEvent) {
    if ((e.target as HTMLElement).tagName === "INPUT" && e.key.startsWith("Arrow")) return; // the slider handles its own arrows
    const k = e.key.toLowerCase();
    if (k === " " || k === "k") { e.preventDefault(); togglePlay(); }
    else if (k === "arrowleft") { e.preventDefault(); seek(t - 5); }
    else if (k === "arrowright") { e.preventDefault(); seek(t + 5); }
    else if (k === "m" && !reduced) toggleSound();
    else if (k === "f") toggleFullscreen();
  }

  const scene = sceneAt(t);
  const local = t - SCENES[scene].from;
  const ended = t >= LENGTH;

  return (
    <section aria-labelledby="film-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <h2 id="film-title" className="sr-only">Klymb.ai in 28 seconds</h2>
      <div ref={ref} onKeyDown={onKey} className="relative aspect-[4/5] overflow-hidden rounded-slab bg-night text-paper shadow-float sm:aspect-video [&:fullscreen]:aspect-auto [&:fullscreen]:rounded-none">
        {/* Two slow red glows and a film-grain layer, with a gentle camera drift per scene. */}
        <motion.div
          aria-hidden="true"
          className="absolute -inset-1/4 bg-[radial-gradient(38%_38%_at_35%_45%,rgb(131_5_11/0.6),transparent_70%),radial-gradient(30%_30%_at_70%_60%,rgb(240_134_139/0.18),transparent_70%)]"
          animate={reduced ? undefined : { x: ["-6%", "6%", "-6%"], y: ["-4%", "5%", "-4%"], rotate: [0, 6, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <div aria-hidden="true" className="film-grain pointer-events-none absolute -inset-[10%] opacity-[0.09] mix-blend-overlay" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_50%,transparent_55%,rgb(0_0_0/0.55))]" />

        <motion.div
          key={`cam-${scene}`}
          className="relative flex h-full flex-col items-center justify-center px-6 pb-14 text-center sm:px-16 sm:pb-6"
          initial={{ scale: 1 }}
          animate={reduced ? undefined : { scale: 1.035 }}
          transition={{ duration: 6, ease: "linear" }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={scene}
              className="flex w-full flex-col items-center"
              exit={{ opacity: 0, y: -18, filter: "blur(6px)" }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <Headline text={SCENES[scene].line} big={scene === 5} />
              <div className="mt-[clamp(1.25rem,3.5vw,2.75rem)] w-full">
                <Visual scene={scene} local={local} />
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Chapter dots. */}
        <ol aria-hidden="true" className="absolute top-4 left-1/2 flex -translate-x-1/2 gap-1.5">
          {SCENES.map((s, i) => (
            <li key={s.from} className={`h-1 rounded-full transition-[width,background-color] duration-500 ${i === scene ? "w-6 bg-red-soft" : i < scene ? "w-2 bg-white/60" : "w-2 bg-white/20"}`} />
          ))}
        </ol>

        {/* Media controls: play/pause, chapters, seekable timeline, time, restart, sound, fullscreen. */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pt-8 pb-2.5 sm:px-5 sm:pb-3.5">
          <input
            type="range"
            min={0}
            max={LENGTH}
            step={0.1}
            value={t}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Seek"
            aria-valuetext={`${fmt(t)} of ${fmt(LENGTH)}`}
            className="film-seek block w-full cursor-pointer"
            style={{ ["--film-progress" as string]: `${(t / LENGTH) * 100}%` }}
          />
          <div className="mt-2 flex items-center gap-1 sm:gap-1.5">
            <CtrlButton label={ended ? "Replay" : playing ? "Pause (k)" : "Play (k)"} onClick={togglePlay}>
              {ended ? <ReplayIcon /> : playing ? <PauseIcon /> : <PlayIcon />}
            </CtrlButton>
            <CtrlButton label="Previous chapter" onClick={() => seek(scene > 0 && local < 1 ? SCENES[scene - 1].from : SCENES[scene].from)}><PrevIcon /></CtrlButton>
            <CtrlButton label="Next chapter" onClick={() => seek(scene < SCENES.length - 1 ? SCENES[scene + 1].from : LENGTH)}><NextIcon /></CtrlButton>
            {!reduced && (
              <CtrlButton label={soundOn ? "Mute (m)" : "Unmute (m)"} pressed={soundOn} onClick={toggleSound}>
                <SpeakerIcon on={soundOn} />
              </CtrlButton>
            )}
            <span className="ml-1 text-xs font-semibold text-white/75 nums" aria-hidden="true">{fmt(t)} / {fmt(LENGTH)}</span>
            <span className="ml-auto" />
            <CtrlButton label="Restart" onClick={() => { seek(0); setUserPaused(false); setPlaying(true); }}><RestartIcon /></CtrlButton>
            <CtrlButton label={fullscreen ? "Exit full screen (f)" : "Full screen (f)"} onClick={toggleFullscreen}>
              <FullscreenIcon exit={fullscreen} />
            </CtrlButton>
          </div>
          {!soundOn && !reduced && (
            <button
              type="button"
              onClick={toggleSound}
              className="absolute top-[-2.6rem] right-3 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-card transition-[background-color,transform] duration-150 hover:bg-paper active:scale-[0.97] sm:right-5"
            >
              <SpeakerIcon on={false} /> Sound on
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

function CtrlButton({ label, onClick, pressed, children }: { label: string; onClick: () => void; pressed?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className="grid size-9 shrink-0 place-items-center rounded-full text-white transition-[background-color,transform] duration-150 hover:bg-white/15 active:scale-95 focus-visible:outline-2 focus-visible:outline-white"
    >
      {children}
    </button>
  );
}

const icon = "size-[18px]";
function PlayIcon() { return <svg viewBox="0 0 24 24" className={icon} fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" /></svg>; }
function PauseIcon() { return <svg viewBox="0 0 24 24" className={icon} fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>; }
function ReplayIcon() { return <svg viewBox="0 0 24 24" className={icon} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>; }
function RestartIcon() { return <svg viewBox="0 0 24 24" className={icon} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>; }
function PrevIcon() { return <svg viewBox="0 0 24 24" className={icon} fill="currentColor" aria-hidden="true"><path d="M6 5h2v14H6zM20 5.5v13a1 1 0 0 1-1.55.83l-9.3-6.5a1 1 0 0 1 0-1.66l9.3-6.5A1 1 0 0 1 20 5.5Z" /></svg>; }
function NextIcon() { return <svg viewBox="0 0 24 24" className={icon} fill="currentColor" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5.5v13a1 1 0 0 0 1.55.83l9.3-6.5a1 1 0 0 0 0-1.66l-9.3-6.5A1 1 0 0 0 4 5.5Z" /></svg>; }
function FullscreenIcon({ exit }: { exit: boolean }) {
  return exit
    ? <svg viewBox="0 0 24 24" className={icon} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 3v4a2 2 0 0 1-2 2H3M21 9h-4a2 2 0 0 1-2-2V3M15 21v-4a2 2 0 0 1 2-2h4M3 15h4a2 2 0 0 1 2 2v4" /></svg>
    : <svg viewBox="0 0 24 24" className={icon} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" /></svg>;
}

function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" />
      {on ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m16 9 6 6m0-6-6 6" />}
    </svg>
  );
}

/** Each line rises word by word out of a mask: kinetic type. */
function Headline({ text, big }: { text: string; big?: boolean }) {
  return (
    <p className={`display flex flex-wrap justify-center gap-x-[0.28em] leading-[1.02] text-balance ${big ? "text-[clamp(1.6rem,4.6vw,3.8rem)]" : "text-[clamp(1.4rem,4vw,3.4rem)]"}`}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em]">
          <motion.span
            className="inline-block"
            initial={{ y: "105%" }}
            animate={{ y: "0%" }}
            transition={{ delay: 0.05 + i * 0.07, duration: 0.55, ease: EASE }}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </p>
  );
}

/** The picture under each line of the script. `local` is seconds into the scene. */
function Visual({ scene, local }: { scene: number; local: number }) {
  if (scene === 0 || scene === 1) {
    return (
      <ul className="flex flex-wrap justify-center gap-[clamp(0.4rem,1.2vw,0.9rem)]">
        {tracks.map((tr, i) => {
          const struck = scene === 1 && local > 0.3 + i * 0.6;
          return (
            <motion.li
              key={tr.slug}
              className="relative rounded-xl border border-white/15 bg-white/[0.06] px-[clamp(0.6rem,1.6vw,1.2rem)] py-[clamp(0.35rem,0.9vw,0.7rem)] text-[clamp(0.85rem,1.9vw,1.4rem)] font-extrabold backdrop-blur-sm"
              initial={scene === 0 ? { opacity: 0, y: -30, rotate: i % 2 ? 4 : -4 } : false}
              animate={{ opacity: struck ? 0.4 : 1, y: 0, rotate: 0, x: struck ? [0, -4, 3, 0] : 0 }}
              transition={{ delay: scene === 0 ? 0.1 + i * 0.18 : 0, duration: struck ? 0.25 : 0.5, ease: EASE }}
            >
              {tr.name}
              {scene === 1 && (
                <motion.span
                  className="absolute top-1/2 left-[-6%] h-[3px] w-[112%] origin-left -rotate-[4deg] rounded-full bg-red-soft shadow-[0_0_12px_rgb(240_134_139/0.8)]"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: struck ? 1 : 0 }}
                  transition={{ duration: 0.22, ease: EASE }}
                />
              )}
            </motion.li>
          );
        })}
      </ul>
    );
  }
  if (scene === 2) {
    const i = Math.min(tracks.length - 1, Math.floor(local / ROLE_EVERY));
    const tr = tracks[i];
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={tr.slug}
          className="flex flex-col items-center gap-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.25 }}
        >
          <span className="relative text-[clamp(1rem,2.6vw,2rem)] font-extrabold text-white/40">
            {tr.name}
            <motion.span
              className="absolute top-1/2 left-[-4%] h-[3px] w-[108%] origin-left rounded-full bg-red-soft"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.25, ease: EASE }}
            />
          </span>
          <motion.span
            className="text-[clamp(1.3rem,3.6vw,2.9rem)] font-black tracking-tight"
            initial={{ opacity: 0, scale: 0.9, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ delay: 0.2, duration: 0.4, ease: EASE }}
          >
            <span className="text-red-soft">→ </span>
            {tr.becomes}
          </motion.span>
        </motion.div>
      </AnimatePresence>
    );
  }
  if (scene === 3) {
    const day = Math.min(30, Math.max(1, Math.ceil(((local - 0.3) / COUNT_FOR) * 30)));
    return (
      <div className="flex flex-col items-center gap-[clamp(0.75rem,2vw,1.5rem)] sm:flex-row sm:justify-center sm:gap-12">
        <div className="text-left">
          <span className="block text-xs font-extrabold uppercase tracking-[0.2em] text-white/50">Day</span>
          <span className="display block w-[2.1ch] text-[clamp(3.5rem,11vw,8rem)] leading-none text-white nums">{day}</span>
        </div>
        <div className="grid w-full max-w-md grid-cols-10 gap-[clamp(3px,0.6vw,7px)]">
          {Array.from({ length: 30 }, (_, k) => {
            const n = k + 1;
            const lit = n <= day;
            const checkpoint = n % 7 === 0 && n <= 28;
            return (
              <span
                key={n}
                className={`aspect-square rounded-[4px] transition-[transform,background-color,box-shadow] duration-200 ${
                  lit ? (checkpoint ? "scale-110 bg-red-soft shadow-[0_0_14px_rgb(240_134_139/0.7)]" : "bg-white") : "bg-white/10"
                }`}
              />
            );
          })}
        </div>
      </div>
    );
  }
  if (scene === 4) {
    const items = ["A public portfolio of real work", "4 checkpoints, defended on camera", "2 mock interviews with written feedback"];
    return (
      <ul className="mx-auto flex max-w-2xl flex-col gap-2 text-left sm:gap-3">
        {items.map((it, i) => (
          <motion.li
            key={it}
            className="flex items-center gap-3 rounded-card border border-white/10 bg-white/[0.07] px-4 py-2.5 text-[clamp(0.85rem,1.8vw,1.2rem)] font-bold backdrop-blur-sm sm:py-3.5"
            initial={{ opacity: 0, x: -30, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.55, duration: 0.45, ease: EASE }}
          >
            <motion.span
              className="grid size-6 shrink-0 place-items-center rounded-full bg-red-soft text-xs text-night"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.55 + i * 0.55, type: "spring", stiffness: 500, damping: 18 }}
            >
              ✓
            </motion.span>
            {it}
          </motion.li>
        ))}
      </ul>
    );
  }
  return (
    <motion.div
      className="flex flex-col items-center gap-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5, ease: EASE }}
    >
      <p className="text-[clamp(0.85rem,1.8vw,1.1rem)] text-white/70">
        {HIDE_MONEY ? "30 days" : allFree ? "Free" : `From ${formatINR(priceNow(priceFrom))}`} · Start any day
      </p>
      <div className="relative">
        <span aria-hidden="true" className="cta-pulse absolute inset-0 rounded-lg bg-red-soft/40" />
        <ButtonLink href="/tracks" variant="inverse" soft arrow className="relative px-7 py-3.5">
          Choose your track
        </ButtonLink>
      </div>
      <p className="text-sm font-black tracking-tight text-white/80">KLYMB<span className="text-red-soft">.AI</span></p>
    </motion.div>
  );
}
