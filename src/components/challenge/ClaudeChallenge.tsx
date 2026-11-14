"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { JourneyDock } from "@/components/landing/JourneyDock";
import { reduceMotion } from "@/components/landing/motion";
import type { CardDetails } from "@/data/course-cards";
import "@/components/landing/landing.css";
import "./claude-challenge.css";
import { SKILLS } from "./claude-chats";
import { Conversation } from "./Conversation";

const STEPS = [
  { n: "01", t: "A task a day" },
  { n: "02", t: "Build in public" },
  { n: "03", t: "Weekly quiz" },
  { n: "04", t: "Badges to share" },
];

/** The dock's number for each section in the middle of the screen; the hero and the start banner hide it. */
const DOCK_STEPS = { skills: "02", days: "03" };

/** 12400 → "12.4k", 640 → "640" (as on the course cards). */
const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n));
const LEVEL_BARS = { Beginner: 1, Intermediate: 2, Advanced: 3 } as const;

/** What the course card in /courses says about the challenge: level, length, rating, learners. */
function Facts({ d }: { d: CardDetails }) {
  return (
    <ul className="kc-facts" aria-label="About this challenge">
      <li>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          {[[1, 8, 5], [5.5, 5, 8], [10, 2, 11]].map(([x, y, h], i) => <rect key={x} x={x} y={y} width="3" height={h} rx="1" fill={i < LEVEL_BARS[d.level] ? "var(--kl-red)" : "#d6d4d3"} />)}
        </svg>
        {d.level}
      </li>
      <li>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
        {d.hours} hours
      </li>
      <li>{d.lessons} {d.unit ?? "lessons"}</li>
      {d.rating !== undefined && d.reviews !== undefined && (
        <li>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#b4461f" aria-hidden="true"><path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" /></svg>
          <strong>{d.rating.toFixed(1)}</strong>
          <span className="kc-facts-dim">({compact(d.reviews)} reviews)</span>
        </li>
      )}
      {d.learners !== undefined && <li>{compact(d.learners)} learners</li>}
    </ul>
  );
}

/** Day i (0-based) belongs to week 1 to 9: seven days each, the last one four. */
const weekOf = (i: number) => Math.min(8, Math.floor(i / 7));

const Tick = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
);
const Arrow = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
);

/**
 * /challenges/claude, from the Claude Design file "Klymb Claude Challenge":
 * a drag-to-compare hero (it sweeps once on its own), the five skills as real
 * before-and-after conversations (claude-chats.ts), the 60 squares filling in, and the start banner.
 *
 * `weeks` are the nine week names of the challenge's curriculum; `start` is
 * the registration link; `facts` is what its card in /courses shows. As on the
 * homepage, "Start the challenge, free" docks at the bottom once the hero's
 * own button has scrolled away, and steps aside for the start banner.
 */
export function ClaudeChallenge({ weeks, start, facts }: { weeks: string[]; start: string; facts: CardDetails | null }) {
  const [skill, setSkill] = useState(0);
  const [day, setDay] = useState(0);

  const compare = useRef<HTMLDivElement>(null);
  const beforePane = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLDivElement>(null);
  const pos = useRef(0.5);
  const raf = useRef(0);
  const dragged = useRef(false);
  const grid = useRef<HTMLDivElement>(null);
  const hovering = useRef(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const setPos = useCallback((p: number) => {
    pos.current = p;
    if (beforePane.current) beforePane.current.style.clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`;
    if (handle.current) handle.current.style.left = `${p * 100}%`;
    compare.current?.setAttribute("aria-valuenow", String(Math.round(p * 100)));
  }, []);

  // The hero sweeps left, right and back to the middle once, until the visitor takes hold of it.
  useEffect(() => {
    setPos(0.5);
    if (reduceMotion()) return;
    const seq = [0.5, 0.18, 0.82, 0.5];
    const t0 = performance.now() + 700;
    const run = (now: number) => {
      if (dragged.current) return;
      const t = (now - t0) / 2600;
      if (t < 0) { raf.current = requestAnimationFrame(run); return; }
      if (t >= 1) { setPos(0.5); return; }
      const seg = Math.min(seq.length - 2, Math.floor(t * (seq.length - 1)));
      const lt = t * (seq.length - 1) - seg;
      const e = lt < 0.5 ? 2 * lt * lt : 1 - Math.pow(-2 * lt + 2, 2) / 2;
      setPos(seq[seg] + (seq[seg + 1] - seq[seg]) * e);
      raf.current = requestAnimationFrame(run);
    };
    raf.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf.current);
  }, [setPos]);

  // The 60 squares fill one by one while they are on screen, and rest when they are not or motion is reduced.
  useEffect(() => {
    const el = grid.current;
    if (!el || reduceMotion()) return;
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(el);
    const timer = setInterval(() => {
      if (visible && !hovering.current) setDay((d) => (d + 1) % 60);
    }, 260);
    return () => { io.disconnect(); clearInterval(timer); clearTimeout(hoverTimer.current); };
  }, []);

  const grab = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = compare.current;
    if (!el) return;
    dragged.current = true;
    cancelAnimationFrame(raf.current);
    const r = el.getBoundingClientRect();
    const at = (x: number) => setPos(Math.max(0.04, Math.min(0.96, (x - r.left) / r.width)));
    at(e.clientX);
    el.setPointerCapture?.(e.pointerId);
    const move = (ev: PointerEvent) => at(ev.clientX);
    const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  const nudge = (e: React.KeyboardEvent) => {
    const d = e.key === "ArrowLeft" ? -0.05 : e.key === "ArrowRight" ? 0.05 : 0;
    if (!d) return;
    e.preventDefault();
    dragged.current = true;
    cancelAnimationFrame(raf.current);
    setPos(Math.max(0.04, Math.min(0.96, pos.current + d)));
  };

  const pick = (i: number) => setSkill(i);

  const showDay = (i: number) => {
    hovering.current = true;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => { hovering.current = false; }, 2500);
    setDay(i);
  };

  const cur = SKILLS[skill];
  const curWeek = weekOf(day);

  return (
    <div className="kl kc">
      <div className="kc-main">
        <section aria-labelledby="kc-title" className="kc-hero" data-hero="">
          <div className="kc-hero-head">
            <div className="kc-hero-title">
              <span className="kc-eyebrow kc-kicker">Claude Challenge · 60 days</span>
              <h1 id="kc-title" className="kc-h1">Same you.<br /><span className="kc-em">60 days</span> apart.</h1>
            </div>
            <div className="kc-hero-aside">
              <Link href={start} className="kc-cta kc-cta--red">Start the challenge, free <Arrow /></Link>
              {facts && <Facts d={facts} />}
            </div>
          </div>

          <div
            ref={compare}
            className="kc-compare"
            onPointerDown={grab}
            onKeyDown={nudge}
            tabIndex={0}
            role="slider"
            aria-label="Day 1 against day 60"
            aria-valuemin={4}
            aria-valuemax={96}
            aria-valuenow={50}
            aria-valuetext="Drag, or use the arrow keys, to compare day 1 with day 60"
          >
            <div className="kc-pane kc-pane--after">
              <span className="kc-eyebrow kc-pane-label">Day 60 · You + Claude</span>
              <div className="kc-pane-list">
                <span className="kc-chip"><Tick />Portfolio site, live</span>
                <span className="kc-chip"><Tick />Your own Claude agent</span>
                <span className="kc-chip"><Tick />60 projects on GitHub</span>
                <span className="kc-chip kc-chip--hot">60 LinkedIn posts. Recruiters noticing.</span>
              </div>
              <span className="kc-big">Shipping.</span>
            </div>
            <div ref={beforePane} className="kc-pane kc-pane--before">
              <span className="kc-eyebrow kc-pane-label">Day 1 · You</span>
              <div className="kc-pane-list">
                <span className="kc-chip">“write me a resume”</span>
                <span className="kc-chip kc-chip--muted">Generic answer. Copy. Paste. Done?</span>
                <span className="kc-chip kc-chip--empty">0 projects to show</span>
              </div>
              <span className="kc-big">Chatting.</span>
            </div>
            <div ref={handle} className="kc-handle" aria-hidden="true">
              <span className="kc-knob">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18-6-6 6-6" /><path d="m15 6 6 6-6 6" /></svg>
              </span>
            </div>
          </div>

          <p className="kc-hint">Drag the line to see the difference.</p>
        </section>

        <section id="skills" aria-labelledby="kc-skills" className="kc-section">
          <h2 id="kc-skills" className="kc-h2">Five skills. <span className="kc-em">See each one.</span></h2>
          <div role="tablist" aria-label="Skills" className="kc-tabs">
            {SKILLS.map((s, i) => (
              <button key={s.name} type="button" role="tab" id={`kc-tab-${i}`} aria-selected={i === skill} aria-controls="kc-panel" tabIndex={i === skill ? 0 : -1} className="kc-tab" onClick={() => pick(i)}
                onKeyDown={(e) => {
                  const n = e.key === "ArrowRight" ? (i + 1) % SKILLS.length : e.key === "ArrowLeft" ? (i + SKILLS.length - 1) % SKILLS.length : -1;
                  if (n < 0) return;
                  e.preventDefault();
                  pick(n);
                  document.getElementById(`kc-tab-${n}`)?.focus();
                }}>
                {s.name}
              </button>
            ))}
          </div>
          <Conversation skill={cur} runKey={skill} names={SKILLS.map((s) => s.name)} onPick={setSkill} />
        </section>

        <section id="days" aria-labelledby="kc-days" className="kc-section">
          <div className="kc-days-head">
            <h2 id="kc-days" className="kc-h2">60 squares.<br />Fill them all.</h2>
          </div>
          <div className="kc-days">
            <div ref={grid} className="kc-grid" aria-hidden="true">
              {Array.from({ length: 60 }, (_, i) => (
                <span
                  key={i}
                  className="kc-sq"
                  onPointerEnter={() => showDay(i)}
                  onClick={() => showDay(i)}
                  style={{
                    background: i < day ? "var(--kl-red)" : i === day ? "var(--kl-ink)" : "color-mix(in srgb, var(--kl-ink) 10%, transparent)",
                    outline: weekOf(i) === curWeek ? "2px solid var(--kl-red-300)" : "none",
                    outlineOffset: 1,
                  }}
                />
              ))}
            </div>
            <div className="kc-weekcard">
              <span className="kc-eyebrow">Day {day + 1} · Week {curWeek + 1}</span>
              <span className="kc-card-title">{weeks[curWeek]}</span>
              <p>Hover any square to see its week. Quiz at the end of each week.</p>
            </div>
          </div>
        </section>

        <section id="start" aria-labelledby="kc-start" className="kc-start" data-hero="">
          <ol className="kc-steps">
            {STEPS.map((s) => <li key={s.n}><span>{s.n}</span><span>{s.t}</span></li>)}
          </ol>
          <h2 id="kc-start" className="kc-h2">Day 1 is today.</h2>
          <Link href={start} className="kc-cta kc-cta--light">Start the challenge, free <Arrow /></Link>
        </section>
      </div>
      <JourneyDock href={start} label="Start the challenge, free" short="Start free" steps={DOCK_STEPS} />
    </div>
  );
}
