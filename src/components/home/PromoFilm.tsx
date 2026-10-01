"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { cohort } from "@/data/config";
import { priceFrom, tracks } from "@/data/tracks";
import { formatDate, formatINR } from "@/lib/format";

/*
 * A 30-second motion-graphics film, drawn in the page rather than shipped as
 * an MP4: sharp at any size, nothing to download, and its last frame is a
 * real, clickable call to action. It plays when it scrolls into view, pauses
 * when it leaves, and can be paused or replayed. With reduced motion it shows
 * the final frame only.
 *
 * Script (also in the reply that introduced it):
 *   0–5s   "Your job title is on a list."            five titles appear
 *   5–10s  "AI now does the routine part."            each title is struck through
 *   10–16s "The work isn't ending. The title is."     old title → new role, one by one
 *   16–21s "30 days. One real problem a day."          day counter, checkpoints light up
 *   21–26s "Proof you can show."                       portfolio · 4 checkpoints · 2 mock interviews
 *   26–30s "Finish all 30 days. Get 100% of your fee back."  CTA: Choose your track
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

function sceneAt(t: number) {
  let i = 0;
  for (let s = 0; s < SCENES.length; s++) if (t >= SCENES[s].from) i = s;
  return i;
}

export function PromoFilm() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(reduced ? LENGTH : 0);
  const [playing, setPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const elapsed = useRef(0);

  // Play while on screen, unless the viewer paused it.
  useEffect(() => {
    if (reduced || !ref.current) return;
    const io = new IntersectionObserver(([e]) => setPlaying(e.isIntersecting && !userPaused), { threshold: 0.5 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [reduced, userPaused]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // Read the step before updating `last`: the state updater runs later.
      const dt = (now - last) / 1000;
      last = now;
      elapsed.current = Math.min(LENGTH, elapsed.current + dt);
      setT(elapsed.current);
      if (elapsed.current >= LENGTH) setPlaying(false); // the end card
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const scene = sceneAt(t);
  const local = t - SCENES[scene].from;
  const ended = t >= LENGTH;

  return (
    <section aria-labelledby="film-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <h2 id="film-title" className="sr-only">Klymb.ai in 30 seconds</h2>
      <div ref={ref} className="relative aspect-[4/5] overflow-hidden rounded-slab bg-night sm:aspect-video text-paper shadow-float">
        {/* A slow red glow behind every scene. */}
        <motion.div
          aria-hidden="true"
          className="absolute -inset-1/4 bg-[radial-gradient(40%_40%_at_50%_50%,rgb(131_5_11/0.55),transparent_70%)]"
          animate={reduced ? undefined : { x: ["-8%", "8%", "-8%"], y: ["-4%", "6%", "-4%"] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative flex h-full flex-col items-center justify-center px-6 pb-12 text-center sm:px-16 sm:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={scene}
              className="flex w-full flex-col items-center"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              <p className="display text-[clamp(1.25rem,3.6vw,3rem)] leading-tight text-balance">{SCENES[scene].line}</p>
              <div className="mt-[clamp(1rem,3vw,2.5rem)] w-full">
                <Visual scene={scene} local={local} />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls and progress. */}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 px-4 pb-3 sm:px-6 sm:pb-4">
          <button
            type="button"
            onClick={() => {
              if (ended) { elapsed.current = 0; setT(0); setUserPaused(false); setPlaying(true); return; }
              setUserPaused(playing);
              setPlaying(!playing);
            }}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-bold transition-colors hover:bg-white/20"
            aria-label={ended ? "Replay" : playing ? "Pause" : "Play"}
          >
            {ended ? "↺" : playing ? "❚❚" : "▶"}
          </button>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
            <div className="h-full rounded-full bg-red-soft" style={{ width: `${(t / LENGTH) * 100}%` }} />
          </div>
          <span className="text-xs font-semibold text-white/60 nums" aria-hidden="true">0:{String(Math.floor(t)).padStart(2, "0")} / 0:30</span>
        </div>
      </div>
    </section>
  );
}

/** The picture under each line of the script. `local` is seconds into the scene. */
function Visual({ scene, local }: { scene: number; local: number }) {
  if (scene === 0 || scene === 1) {
    return (
      <ul className="flex flex-wrap justify-center gap-x-[clamp(0.75rem,2vw,2rem)] gap-y-2">
        {tracks.map((tr, i) => (
          <motion.li
            key={tr.slug}
            className="relative text-[clamp(0.9rem,2.2vw,1.6rem)] font-extrabold"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: scene === 1 && local > 0.6 + i * 0.6 ? 0.35 : 1, y: 0 }}
            transition={{ delay: scene === 0 ? 0.3 + i * 0.25 : 0, duration: 0.4 }}
          >
            {tr.name}
            {scene === 1 && (
              <motion.span
                className="absolute top-[55%] left-[-3%] h-[3px] w-[106%] origin-left rounded-full bg-red-soft"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: local > 0.3 + i * 0.6 ? 1 : 0 }}
                transition={{ duration: 0.4, ease: EASE }}
              />
            )}
          </motion.li>
        ))}
      </ul>
    );
  }
  if (scene === 2) {
    const i = Math.min(tracks.length - 1, Math.floor(local / 1.2));
    const tr = tracks[i];
    return (
      <AnimatePresence mode="wait">
        <motion.p
          key={tr.slug}
          className="flex flex-wrap items-baseline justify-center gap-x-3 text-[clamp(1rem,2.6vw,2rem)] font-extrabold"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.3 }}
        >
          <span className="text-white/40 line-through decoration-red-soft decoration-[3px]">{tr.name}</span>
          <span className="text-red-soft">→</span>
          <span>{tr.becomes}</span>
        </motion.p>
      </AnimatePresence>
    );
  }
  if (scene === 3) {
    const day = Math.min(30, Math.max(1, Math.ceil((local / 4.6) * 30)));
    return (
      <div className="mx-auto grid max-w-xl grid-cols-10 gap-[clamp(3px,0.6vw,8px)]">
        {Array.from({ length: 30 }, (_, k) => {
          const n = k + 1;
          const lit = n <= day;
          const checkpoint = n % 7 === 0 && n <= 28;
          return (
            <span
              key={n}
              className={`grid aspect-square place-items-center rounded-md text-[clamp(8px,1.1vw,12px)] font-bold transition-colors duration-200 ${
                lit ? (checkpoint ? "bg-red-soft text-night" : "bg-white text-night") : "bg-white/10 text-white/40"
              }`}
            >
              {n}
            </span>
          );
        })}
      </div>
    );
  }
  if (scene === 4) {
    const items = ["A public portfolio of real work", "4 checkpoints, defended on camera", "2 mock interviews with feedback"];
    return (
      <ul className="mx-auto flex max-w-2xl flex-col gap-2 text-left sm:gap-3">
        {items.map((it, i) => (
          <motion.li
            key={it}
            className="flex items-center gap-3 rounded-card bg-white/[0.07] px-4 py-2.5 text-[clamp(0.85rem,1.8vw,1.15rem)] font-bold sm:py-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.5, duration: 0.4, ease: EASE }}
          >
            <span className="text-red-soft">✓</span>
            {it}
          </motion.li>
        ))}
      </ul>
    );
  }
  return (
    <motion.div
      className="flex flex-col items-center gap-4"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.5, ease: EASE }}
    >
      <p className="text-[clamp(0.85rem,1.8vw,1.1rem)] text-white/70">
        From {formatINR(priceFrom)} · Cohort starts {formatDate(cohort.startDate)}
      </p>
      <ButtonLink href="/tracks" variant="inverse" soft arrow className="px-6 py-3">
        Choose your track
      </ButtonLink>
    </motion.div>
  );
}
