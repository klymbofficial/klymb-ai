"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { cohort } from "@/data/config";
import { priceFrom, tracks } from "@/data/tracks";
import { formatDate, formatINR } from "@/lib/format";
import { FilmAudio } from "./filmAudio";

/*
 * A 30-second motion-graphics film with a synthesised soundtrack, drawn in the
 * page rather than shipped as an MP4: sharp at any size, nothing to download,
 * and its last frame is a real, clickable call to action. It plays silently
 * when it scrolls into view (browsers forbid sound before a tap); "Sound on"
 * turns the soundtrack on. Pause, replay, and reduced motion (end card only)
 * are all supported.
 *
 * Script:
 *   0–5s   "Your job title is on a list."             titles drop in, a pluck each
 *   5–10s  "AI now does the routine part."             each title slashed through, a blade swipe each
 *   10–16s "The work isn't ending. The title is."      old title → new role, one by one, a rising sweep each
 *   16–21s "30 days. One real problem a day."           giant day counter, ticks; checkpoints ring
 *   21–26s "Proof you can show."                        three proof points, a chime each
 *   26–30s "Finish all 30 days. Get 100% of your fee back."  CTA, a swelling chord
 */
const LENGTH = 30;
const SCENES = [
  { from: 0, line: "Your job title is on a list." },
  { from: 5, line: "AI now does the routine part." },
  { from: 10, line: "The work isn't ending. The title is." },
  { from: 16, line: "30 days. One real problem a day." },
  { from: 21, line: "Proof you can show." },
  { from: 26, line: "Finish all 30 days. Get 100% of your fee back." },
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
  ...tracks.map((_, i) => ({ at: 0.35 + i * 0.25, play: (a: FilmAudio) => a.pluck(i * 2) })),
  ...tracks.map((_, i) => ({ at: 5.3 + i * 0.6, play: (a: FilmAudio) => a.slash() })),
  ...tracks.map((_, i) => ({ at: 10.25 + i * ROLE_EVERY, play: (a: FilmAudio) => a.rise() })),
  ...Array.from({ length: 30 }, (_, i) => ({ at: 16.3 + (i / 30) * COUNT_FOR, play: (a: FilmAudio) => a.tick((i + 1) % 7 === 0 && i < 28) })),
  ...[0, 1, 2].map((i) => ({ at: 21.4 + i * 0.55, play: (a: FilmAudio) => a.chime(i) })),
  { at: 26.2, play: (a: FilmAudio) => a.swell() },
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

  const scene = sceneAt(t);
  const local = t - SCENES[scene].from;
  const ended = t >= LENGTH;

  return (
    <section aria-labelledby="film-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <h2 id="film-title" className="sr-only">Klymb.ai in 30 seconds</h2>
      <div ref={ref} className="relative aspect-[4/5] overflow-hidden rounded-slab bg-[#0d0b0b] text-paper shadow-float sm:aspect-video">
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
            <li key={s.from} className={`h-1 rounded-full transition-all duration-500 ${i === scene ? "w-6 bg-red-soft" : i < scene ? "w-2 bg-white/60" : "w-2 bg-white/20"}`} />
          ))}
        </ol>

        {/* Controls. */}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 px-4 pb-3 sm:px-6 sm:pb-4">
          <button
            type="button"
            onClick={() => {
              if (ended) { elapsed.current = 0; setT(0); setUserPaused(false); setPlaying(true); return; }
              setUserPaused(playing);
              setPlaying(!playing);
            }}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-bold backdrop-blur transition-colors hover:bg-white/20"
            aria-label={ended ? "Replay" : playing ? "Pause" : "Play"}
          >
            {ended ? "↺" : playing ? "❚❚" : "▶"}
          </button>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
            <div className="h-full rounded-full bg-red-soft" style={{ width: `${(t / LENGTH) * 100}%` }} />
          </div>
          <span className="hidden text-xs font-semibold text-white/60 nums sm:inline" aria-hidden="true">0:{String(Math.floor(t)).padStart(2, "0")} / 0:30</span>
          {!reduced && (
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={soundOn}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold backdrop-blur transition-colors ${
                soundOn ? "bg-white/10 hover:bg-white/20" : "bg-white text-ink hover:bg-paper"
              }`}
            >
              <SpeakerIcon on={soundOn} />
              {soundOn ? "Sound off" : "Sound on"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
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
              transition={{ delay: scene === 0 ? 0.3 + i * 0.25 : 0, duration: struck ? 0.25 : 0.5, ease: EASE }}
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
                className={`aspect-square rounded-[4px] transition-all duration-200 ${
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
        From {formatINR(priceFrom)} · Cohort starts {formatDate(cohort.startDate)}
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
