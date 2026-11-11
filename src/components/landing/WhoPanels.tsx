"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { EASE, onceVisible, reduceMotion } from "./motion";
import { Brand, IconArrowRight, Photo, unsplash } from "./parts";

const PANELS = [
  {
    tab: "Students",
    title: "Students and graduates",
    label: ["Students and", "graduates"],
    body: "Graduate with AI skills and a portfolio that gets you past the first interview.",
    tags: ["Start from zero", "Portfolio-first", "Internship-ready"],
    photo: "1758270705518-b61b40527e76",
  },
  {
    tab: "Job seekers",
    title: "Job seekers",
    label: ["Job", "seekers"],
    body: "Build the skills entry-level AI roles ask for, and show them with graded project work.",
    tags: ["Role-mapped skills", "Graded projects", "Hiring network"],
    photo: "1758874573194-a98be0ed3ff5",
  },
  {
    tab: "Professionals",
    title: "Working professionals",
    label: ["Working", "professionals"],
    body: "Add AI to the job you already do and go after the salary hike you deserve.",
    tags: ["15 minutes a day", "Salary hike", "Career switch"],
    photo: "1758611972589-0012481178f9",
  },
];

/** How long each audience stays open while the panels play on their own. */
const DWELL = 5000;

/**
 * "Who is it for?" Three photo panels; the open one is three times as wide,
 * in colour, with its details. They take turns every five seconds, with a
 * progress bar on the matching tab, until a visitor points at, taps or tabs
 * to one.
 */
export function WhoPanels() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const fills = useRef<(HTMLSpanElement | null)[]>([]);
  const wrap = useRef<HTMLDivElement>(null);

  const choose = (i: number) => {
    setAuto(false);
    setActive(i);
  };

  useEffect(() => {
    if (!auto) return;
    const t = window.setInterval(() => setActive((a) => (a + 1) % PANELS.length), DWELL);
    return () => window.clearInterval(t);
  }, [auto]);

  // The open audience's tab fills over its five seconds; once a visitor has chosen, it just shows full.
  useEffect(() => {
    fills.current.forEach((b, k) => {
      if (!b) return;
      b.getAnimations().forEach((a) => a.cancel());
      if (k !== active) {
        b.style.transform = "scaleX(0)";
        return;
      }
      if (auto && !reduceMotion()) {
        b.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: DWELL, easing: "linear", fill: "forwards" });
      } else {
        b.style.transform = "scaleX(1)";
      }
    });
  }, [active, auto]);

  // The panels deal in from below, each tilted a little, when the row comes into view.
  useEffect(() => {
    const w = wrap.current;
    if (!w || reduceMotion()) return;
    const panels = [...w.children] as HTMLElement[];
    panels.forEach((p) => (p.style.opacity = "0"));
    const stop = onceVisible(w, 0.25, () => {
      panels.forEach((p, k) =>
        p.animate([{ opacity: 0, transform: `translateY(60px) rotate(${(k - 1) * 2}deg)` }, { opacity: 1, transform: "none" }], {
          duration: 900,
          delay: k * 140,
          easing: EASE,
          fill: "backwards",
        }),
      );
      panels.forEach((p) => (p.style.opacity = ""));
    });
    return () => {
      stop();
      panels.forEach((p) => (p.style.opacity = ""));
    };
  }, []);

  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    choose(i);
  };

  return (
    <section id="who" className="kl-who" aria-labelledby="who-title">
      <div className="kl-section-head">
        <h2 id="who-title" className="kl-h2">
          Who is it <em>for?</em>
        </h2>
        <div className="kl-tabs">
          {PANELS.map((p, i) => (
            <button key={p.tab} type="button" className="kl-tab" aria-label={`Show ${p.tab}`} aria-pressed={active === i} onClick={() => choose(i)}>
              <span className="kl-tab-track">
                <span ref={(el) => { fills.current[i] = el; }} className="kl-tab-fill" />
              </span>
              {p.tab}
            </button>
          ))}
        </div>
      </div>

      <div ref={wrap} className="kl-panels" onMouseEnter={() => setAuto(false)}>
        {PANELS.map((p, i) => (
          <div
            key={p.tab}
            role="button"
            tabIndex={0}
            aria-label={p.title}
            aria-pressed={active === i}
            className={active === i ? "kl-panel is-active" : "kl-panel"}
            onMouseEnter={() => choose(i)}
            onFocus={() => choose(i)}
            onClick={() => choose(i)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <div className="kl-panel-photo">
              <Photo src={unsplash(p.photo, 1400)} />
            </div>
            <div className="kl-panel-shade" />
            <span className="kl-panel-num" aria-hidden="true">0{i + 1}</span>
            <span className="kl-panel-vlabel" aria-hidden="true">
              {p.label[0]}
              <br />
              {p.label[1]}
            </span>
            <div className="kl-panel-detail">
              <span className="kl-panel-for">For</span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              <ul className="kl-panel-tags">
                {p.tags.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <a href="#pricing" className="kl-btn kl-btn-primary kl-pill-cta">
        Start your journey <IconArrowRight size={18} />
      </a>

      <div id="teams" className="kl-teams">
        <p>
          <strong>Training a team?</strong> <Brand /> for Business assesses your workforce&apos;s AI skills and builds custom upskilling programs.
        </p>
        <Link href="/organizations" className="kl-btn kl-teams-btn">Talk to our team</Link>
      </div>
    </section>
  );
}
