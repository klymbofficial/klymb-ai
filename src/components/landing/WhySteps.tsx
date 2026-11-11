"use client";

import { useEffect, useRef } from "react";
import { C, EASE, onceVisible, reduceMotion } from "./motion";
import { IconCheck, IconPartyPopper, IconShieldCheck } from "./parts";

const STEPS = [
  { tag: "You do this", title: "Enroll", items: ["That’s the only step you take."] },
  { tag: "We do this", title: "We guide you daily", items: ["Personal learning plan", "Expert mentor guidance", "Bite-size daily lessons"] },
  { tag: "We do this", title: "We review your work", items: ["AI review on every project", "Practice tests, instant feedback", "Capstone graded to job standards"] },
];

function Item({ children }: { children: string }) {
  return (
    <span className="kl-step-item">
      <span className="kl-step-tick"><IconCheck size={14} strokeWidth={3} /></span>
      {children}
    </span>
  );
}

/** Confetti from the top of the "You're job-ready" bar, falling out of the screen's own layer. */
function burst(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const colors = [C.red400, C.red300, C.bg, C.gold, C.red];
  for (let i = 0; i < 46; i++) {
    const p = document.createElement("span");
    const sz = 6 + Math.random() * 7;
    const round = Math.random() < 0.4;
    Object.assign(p.style, {
      position: "fixed",
      left: `${r.left + r.width * (0.2 + Math.random() * 0.6)}px`,
      top: `${r.top + 24}px`,
      width: `${sz}px`,
      height: `${round ? sz : sz * 0.45}px`,
      borderRadius: round ? "50%" : "2px",
      background: colors[i % colors.length],
      pointerEvents: "none",
      zIndex: "70",
    });
    p.setAttribute("aria-hidden", "true");
    p.dataset.klConfetti = "";
    document.body.appendChild(p);
    const dx = (Math.random() - 0.5) * r.width * 1.6;
    const up = 60 + Math.random() * 110;
    const fall = 140 + Math.random() * 180;
    const rot = (Math.random() - 0.5) * 900;
    p.animate(
      [
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx * 0.6}px,${-up}px) rotate(${rot * 0.5}deg)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${dx}px,${fall - up}px) rotate(${rot}deg)`, opacity: 0 },
      ],
      { duration: 1400 + Math.random() * 700, easing: "cubic-bezier(.2,.7,.4,1)", fill: "forwards" },
    ).onfinish = () => p.remove();
    window.setTimeout(() => p.remove(), 2600);
  }
}

/**
 * "We don't sell courses." The strike draws through "courses", then the four
 * steps rise like a staircase; the last one throws confetti, keeps glowing
 * and waving its flag, and throws more whenever it is hovered.
 */
export function WhySteps() {
  const head = useRef<HTMLHeadingElement>(null);
  const strike = useRef<SVGPathElement>(null);
  const steps = useRef<HTMLOListElement>(null);
  const goal = useRef<HTMLLIElement>(null);
  const flag = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const h = head.current;
    const path = strike.current;
    const list = steps.current;
    const last = goal.current;
    if (!h || !path || !list || !last || reduceMotion() || !("IntersectionObserver" in window)) return;

    const bars = [...list.children] as HTMLElement[];
    const loops: Animation[] = [];
    const timers: number[] = [];
    let burstAt = 0;
    let bound = false;

    const celebrate = () => {
      if (!bound) {
        bound = true;
        last.addEventListener("mouseenter", celebrate);
        if (flag.current) {
          loops.push(
            flag.current.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(-10deg)" }, { transform: "rotate(4deg)" }, { transform: "rotate(0deg)" }], {
              duration: 1400,
              iterations: Infinity,
              easing: "ease-in-out",
            }),
          );
        }
        loops.push(
          // The design's glow is its accent at 60%; the brand red is too dark to show on this ground, so the ring is its lifted red.
          last.animate([{ boxShadow: "0 0 0 0 rgba(240, 134, 139, 0.6)" }, { boxShadow: "0 0 0 14px rgba(240, 134, 139, 0)" }], { duration: 2000, iterations: Infinity, easing: "ease-out" }),
        );
      }
      if (Date.now() - burstAt < 1500) return;
      burstAt = Date.now();
      burst(last);
    };

    bars.forEach((b) => (b.style.transform = "scaleY(0)"));
    path.style.strokeDasharray = "1 1";
    path.style.strokeDashoffset = "1";

    const stopBars = onceVisible(list, 0.3, () => {
      timers.push(window.setTimeout(celebrate, bars.length * 120 + 600));
      bars.forEach((b, k) => {
        b.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 700, delay: k * 120, easing: EASE, fill: "forwards" }).onfinish = () => {
          b.style.transform = "none";
        };
      });
    });
    const stopStrike = onceVisible(h, 0.3, () => {
      path.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 700, delay: 250, easing: "cubic-bezier(.6,0,.2,1)", fill: "forwards" }).onfinish = () => {
        path.style.strokeDasharray = "none";
        path.style.strokeDashoffset = "0";
      };
    });

    return () => {
      stopBars();
      stopStrike();
      timers.forEach((t) => window.clearTimeout(t));
      loops.forEach((a) => a.cancel());
      last.removeEventListener("mouseenter", celebrate);
      document.querySelectorAll("[data-kl-confetti]").forEach((p) => p.remove());
    };
  }, []);

  return (
    <section id="why" className="kl-why kl-dark" aria-labelledby="why-title">
      <div className="kl-why-inner">
        <div className="kl-why-head">
          <h2 ref={head} id="why-title" className="kl-why-title">
            We don’t sell{" "}
            <span className="kl-strike">
              courses
              <svg aria-hidden="true" viewBox="0 0 200 40" preserveAspectRatio="none" fill="none">
                <path ref={strike} pathLength={1} d="M4 26 C 50 18, 110 12, 196 14" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
              </svg>
            </span>
            .
          </h2>
          <p className="kl-why-lede">
            <span>We help you get there with a <strong>proven framework</strong>.</span>
            <span>And we help you <strong>evaluate yourself at every important step</strong>.</span>
          </p>
        </div>
        <div className="kl-steps-scroll">
          <ol ref={steps} className="kl-steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className={`kl-step kl-step--${i + 1}`}>
                <span className="kl-step-tag">{s.tag}</span>
                <span className="kl-step-num">0{i + 1}</span>
                <span className="kl-step-title">{s.title}</span>
                {s.items.map((it) => <Item key={it}>{it}</Item>)}
              </li>
            ))}
            <li ref={goal} className="kl-step kl-step--4">
              <span className="kl-step-tag">You get this</span>
              <IconPartyPopper ref={flag} size={26} className="kl-flag" />
              <span className="kl-step-num">04</span>
              <span className="kl-step-title">You’re <span className="kl-nowrap">job-ready</span></span>
              <Item>Connections from 100+ companies</Item>
              <Item>Guaranteed interview call</Item>
              <span className="kl-refund">
                <IconShieldCheck size={18} className="kl-flex-none" />
                No job? Take your 100% refund.
              </span>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
