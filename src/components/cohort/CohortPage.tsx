"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { reduceMotion } from "@/components/landing/motion";
import type { CardDetails } from "@/data/course-cards";
import "./cohort.css";

/**
 * The 31 Days AI Cohort page, built from the Claude Design file "Klymb AI
 * Cohort". The hero plays the 31 days once (a day every 220 ms) and stops on
 * day 31; touching the slider or a layer card takes over. The chat bubbles
 * rise in, staggered, whenever the day crosses into a new stage.
 *
 * Reduced motion: no play, no bubble animation, it opens on day 31.
 */

interface Stage {
  from: number;
  /** Index of the last layer built so far (-1: none yet). */
  layer: number;
  title: string;
  status: string;
  dot: string;
  q: string;
  a: string;
  tag: string;
}

const AMBER = "oklch(0.8 0.15 85)";

const STAGES: Stage[] = [
  { from: 1, layer: -1, title: "A bot that just talks", status: "Local · prototype", dot: "#9a9796", q: "What are the side effects of my BP medicine?", a: "Blood pressure medicines can have various side effects. Please consult a doctor.", tag: "" },
  { from: 4, layer: 0, title: "RAG: answers from real documents", status: "Local · reading 120 docs", dot: AMBER, q: "What are the side effects of my BP medicine?", a: "For amlodipine, the most common are ankle swelling, headache and flushing.", tag: "Source: drug-leaflet.pdf, p.2" },
  { from: 12, layer: 1, title: "Agents: it takes action", status: "Staging · 2 tools", dot: AMBER, q: "My ankles are swollen. Can I see someone this week?", a: "That can be a side effect. I found a slot with Dr Rao on Thursday, 4 pm. Book it?", tag: "tool_call: find_appointment()" },
  { from: 19, layer: 2, title: "MCP: plugged into real systems", status: "Staging · calendar + records", dot: AMBER, q: "Yes, book it and add it to my calendar.", a: "Booked for Thursday, 4 pm, and added to your calendar. Your last BP reading is attached for the doctor.", tag: "mcp: calendar.create · records.read" },
  { from: 26, layer: 3, title: "Deploy: live for real users", status: "Production · live", dot: "oklch(0.75 0.17 150)", q: "Remind me to take my medicine at 9 pm.", a: "Done. I’ll remind you every day at 9 pm.", tag: "health-assistant.app · 99.9% uptime" },
];

const LAYERS = [
  { name: "RAG", days: "4–11", from: 4 },
  { name: "Agents", days: "12–18", from: 12 },
  { name: "MCP", days: "19–25", from: 19 },
  { name: "Deploy", days: "26–31", from: 26 },
];

const PERKS = [
  { n: "01", t: "Start together, ship together" },
  { n: "02", t: "Daily task, under an hour" },
  { n: "03", t: "Your work reviewed every week" },
];

const stageOf = (day: number) => STAGES.reduce((s, x) => (day >= x.from ? x : s), STAGES[0]);

const LEVEL_BARS: Record<CardDetails["level"], number> = { Beginner: 1, Intermediate: 2, Advanced: 3 };

/** 12400 → "12.4k", 640 → "640". */
const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n));

/** `facts` is the cohort's card on /courses, so the two always say the same. */
export function CohortPage({ facts }: { facts: CardDetails | null }) {
  const [day, setDay] = useState(1);
  const chat = useRef<HTMLDivElement>(null);
  const touched = useRef(false);
  const timers = useRef<{ tick?: number; stop?: number }>({});
  const prevStage = useRef<Stage>(STAGES[0]);

  const stopAuto = useCallback(() => {
    window.clearInterval(timers.current.tick);
    window.clearTimeout(timers.current.stop);
  }, []);

  // Play the 31 days once on load.
  useEffect(() => {
    if (reduceMotion()) {
      const id = window.setTimeout(() => setDay(31), 0);
      return () => window.clearTimeout(id);
    }
    let d = 1;
    timers.current.tick = window.setInterval(() => {
      if (touched.current || d >= 31) return stopAuto();
      d += 1;
      setDay(d);
    }, 220);
    return stopAuto;
  }, [stopAuto]);

  const st = stageOf(day);

  // The bubbles rise in, one after another, when the stage changes.
  useEffect(() => {
    const prev = prevStage.current;
    prevStage.current = st;
    const box = chat.current;
    if (prev === st || !box || reduceMotion()) return;
    const raf = requestAnimationFrame(() =>
      [...box.children].forEach((c, k) =>
        c.animate(
          [{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }],
          { duration: 380, delay: k * 120, easing: "cubic-bezier(.2,.9,.3,1.2)", fill: "backwards" },
        ),
      ),
    );
    return () => cancelAnimationFrame(raf);
  }, [st]);

  const pick = (n: number) => {
    touched.current = true;
    stopAuto();
    setDay(n);
  };

  return (
    <div className="kl kc">
      <div className="kc-main">
        <section className="kc-hero" aria-label="Hero">
          <h1 className="kc-h1">
            Build a real
            <br />
            AI chatbot in <em>31 days.</em>
          </h1>

          {/* Above the chat card and the day counter, so it shows without scrolling. */}
          <div className="kc-intro">
            {facts && <Facts d={facts} />}
            <a href="#join" className="kc-btn kc-btn-primary kc-hero-cta">
              Join the cohort, free <Arrow />
            </a>
          </div>

          <div className="kc-hero-grid">
            <div className="kc-chat">
              <div className="kc-chat-head">
                <span className="kc-chat-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 8V4H8" />
                    <rect width="16" height="12" x="4" y="8" rx="2" />
                    <path d="M2 14h2" />
                    <path d="M20 14h2" />
                    <path d="M15 13v2" />
                    <path d="M9 13v2" />
                  </svg>
                </span>
                <span className="kc-chat-who">
                  <strong>Health assistant</strong>
                  <span>{st.status}</span>
                </span>
                <span className="kc-chat-dot" style={{ background: st.dot }} aria-hidden="true" />
              </div>
              <div ref={chat} className="kc-chat-body" aria-live="off">
                <span className="kc-q">{st.q}</span>
                <span className="kc-a">{st.a}</span>
                {st.tag && (
                  <span className="kc-tag">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--kl-red-400)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    {st.tag}
                  </span>
                )}
              </div>
              <div className="kc-stack">
                {LAYERS.map((l, i) => (
                  <span
                    key={l.name}
                    style={{
                      background: i <= st.layer ? "var(--kl-red)" : "transparent",
                      color: i <= st.layer ? "var(--kl-bg)" : "color-mix(in srgb, var(--kl-bg) 55%, transparent)",
                    }}
                  >
                    {l.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="kc-side">
              <div className="kc-day">
                <span className="kc-eyebrow">Day</span>
                <span className="kc-daynum">
                  <span>{String(day).padStart(2, "0")}</span>
                  <span>/31</span>
                </span>
                <span className="kc-daytitle">{st.title}</span>
              </div>
              <div className="kc-slider">
                <div className="kc-track">
                  <div className="kc-rail"><div style={{ width: `${((day - 1) / 30) * 100}%` }} /></div>
                  <input
                    className="kc-range"
                    type="range"
                    min={1}
                    max={31}
                    step={1}
                    value={day}
                    onChange={(e) => pick(+e.target.value)}
                    aria-label="Day of the cohort"
                  />
                </div>
                <div className="kc-ticks"><span>RAG</span><span>Agents</span><span>MCP</span><span>Deploy</span></div>
                <span className="kc-hint">Drag to watch your chatbot grow.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="kc-section" aria-label="Stages">
          <h2 className="kc-h2">4 layers. <em>1 product.</em></h2>
          <div className="kc-layers">
            {LAYERS.map((l, i) => (
              <button
                key={l.name}
                type="button"
                className={i === st.layer ? "kc-layer is-on" : "kc-layer"}
                onClick={() => {
                  pick(l.from);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <span>Days {l.days}</span>
                <span>{l.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="kc-section kc-cohort" aria-label="Cohort">
          <h2 className="kc-h2">Build alone?<br /><em>Never.</em></h2>
          <div className="kc-perks">
            {PERKS.map((p) => (
              <span key={p.n} className="kc-perk"><span>{p.n}</span>{p.t}</span>
            ))}
          </div>
        </section>

        <section id="join" className="kc-join" aria-label="Join">
          <div className="kc-dots" aria-hidden="true">
            {Array.from({ length: 31 }, (_, i) => <span key={i} className={i < day ? "is-on" : undefined} />)}
          </div>
          <h2>31 days from now,<br />it’s live.</h2>
          <Link href="/register" className="kc-btn">
            Join the cohort, free <Arrow />
          </Link>
        </section>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

/** Level, length and the rating row, as on the course cards. */
function Facts({ d }: { d: CardDetails }) {
  const on = LEVEL_BARS[d.level];
  return (
    <div className="kc-facts">
      <ul>
        <li>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            {[[1, 8, 5], [5.5, 5, 8], [10, 2, 11]].map(([x, y, h], i) => (
              <rect key={x} x={x} y={y} width="3" height={h} rx="1" fill={i < on ? "var(--kl-red)" : "#d6d4d3"} />
            ))}
          </svg>
          {d.level}
        </li>
        <li>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <span className="kc-n">{d.hours}</span> hours
        </li>
        <li className="kc-muted"><span className="kc-n">{d.lessons}</span> {d.unit ?? "lessons"}</li>
      </ul>
      {d.rating !== undefined && d.reviews !== undefined && d.learners !== undefined && (
        <p>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#b4461f" aria-hidden="true">
            <path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
          </svg>
          <strong className="kc-n">{d.rating.toFixed(1)}</strong>
          <span className="kc-muted kc-n">({compact(d.reviews)})</span>
          <span aria-hidden="true" className="kc-sep">·</span>
          <span className="kc-muted kc-n">{compact(d.learners)} learners</span>
        </p>
      )}
    </div>
  );
}
