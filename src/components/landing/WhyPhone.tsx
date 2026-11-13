"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { C, onceVisible, reduceMotion } from "./motion";
import { IconArrowDown, IconCheck, IconClipboardCheck, IconShieldCheck } from "./parts";

/** A step heading in the chat: "01 You do this". */
function Step({ n, children }: { n: string; children: ReactNode }) {
  return (
    <div data-msg="" className="kl-wp-step">
      <b>{n}</b>
      {children}
    </div>
  );
}

const SCORES = [
  ["Problem framing", 92],
  ["Model quality", 84],
  ["Presentation", 88],
] as const;

/** Three dots that bob while "Klymb" is typing, placed just before the message they stand in for. */
function typingDots(before: HTMLElement) {
  const t = document.createElement("div");
  t.className = "kl-wp-typing";
  t.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 3; i++) {
    const d = document.createElement("span");
    d.animate(
      [{ opacity: 0.25, transform: "translateY(0)" }, { opacity: 1, transform: "translateY(-3px)" }, { opacity: 0.25, transform: "translateY(0)" }],
      { duration: 700, delay: i * 120, iterations: Infinity },
    );
    t.appendChild(d);
  }
  before.parentNode?.insertBefore(t, before);
  return t;
}

/**
 * "We don't sell courses." on phones (Claude Design "Klymb Why Mobile"): the
 * four steps told as a chat. Messages arrive one at a time as they scroll
 * into view, Klymb's after a moment of typing dots; the review scores fill,
 * and "You're job-ready." throws confetti. A "Your journey" strip sticks
 * under the nav and fills as you read down the section.
 */
export function WhyPhone() {
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const head = useRef<HTMLHeadingElement>(null);
  const strike = useRef<SVGPathElement>(null);
  const finalCard = useRef<HTMLDivElement>(null);
  const popper = useRef<SVGSVGElement>(null);

  // The strip fills from the moment the section reaches the nav until its end reaches the bottom of the screen.
  useEffect(() => {
    const el = root.current;
    const b = bar.current;
    const f = fill.current;
    if (!el || !b || !f) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      if (el.offsetParent === null) return; // the desktop staircase is showing instead
      const r = el.getBoundingClientRect();
      const top = parseFloat(getComputedStyle(b).getPropertyValue("--kl-nav-h")) || 76;
      const span = r.height - (window.innerHeight - top);
      const p = span > 0 ? Math.min(1, Math.max(0, (top - r.top) / span)) : 0;
      f.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    const el = root.current;
    const h = head.current;
    const p = strike.current;
    if (!el || !h || !p || reduceMotion() || !("IntersectionObserver" in window)) return;
    let alive = true;
    const timers: number[] = [];
    const loops: Animation[] = [];
    const wait = (ms: number) => new Promise<void>((res) => timers.push(window.setTimeout(res, ms)));

    // The strike draws through "courses." once the heading is in view.
    p.style.strokeDasharray = "1 1";
    p.style.strokeDashoffset = "1";
    const stopStrike = onceVisible(h, 0.3, () => {
      p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 700, delay: 600, easing: "cubic-bezier(.6,0,.2,1)", fill: "forwards" }).onfinish = () => {
        p.style.strokeDasharray = "none";
        p.style.strokeDashoffset = "0";
      };
    });

    const celebrate = () => {
      const card = finalCard.current;
      if (!card || !alive) return;
      if (popper.current) {
        loops.push(
          popper.current.animate([{ transform: "rotate(0)" }, { transform: "rotate(-14deg)" }, { transform: "rotate(6deg)" }, { transform: "rotate(0)" }], {
            duration: 1400,
            iterations: Infinity,
            easing: "ease-in-out",
          }),
        );
      }
      card.animate([{ transform: "scale(1)" }, { transform: "scale(1.03)" }, { transform: "scale(1)" }], { duration: 500, easing: "ease-out" });
      // The design's darkest confetti matched the brand red card, so it shows in the lifted red instead.
      const colors = [C.bg, C.red300, C.gold, C.red400];
      for (let i = 0; i < 40; i++) {
        const s = document.createElement("span");
        const sz = 5 + Math.random() * 6;
        const round = Math.random() < 0.4;
        s.className = "kl-wp-confetti";
        Object.assign(s.style, {
          left: `${20 + Math.random() * 60}%`,
          width: `${sz}px`,
          height: `${round ? sz : sz * 0.45}px`,
          borderRadius: round ? "50%" : "2px",
          background: colors[i % colors.length],
        });
        card.appendChild(s);
        const dx = (Math.random() - 0.5) * 260;
        const up = 60 + Math.random() * 90;
        const rot = (Math.random() - 0.5) * 720;
        s.animate(
          [
            { transform: "translate(0,0)", opacity: 1 },
            { transform: `translate(${dx * 0.6}px,${-up}px) rotate(${rot / 2}deg)`, opacity: 1, offset: 0.35 },
            { transform: `translate(${dx}px,${200 - up}px) rotate(${rot}deg)`, opacity: 0 },
          ],
          { duration: 1500 + Math.random() * 600, easing: "cubic-bezier(.2,.7,.4,1)", fill: "forwards" },
        ).onfinish = () => s.remove();
        timers.push(window.setTimeout(() => s.remove(), 2400));
      }
    };

    // Messages wait hidden and arrive in order. Someone scrolling quickly
    // past several at once gets them without the typing pauses, so the chat
    // keeps up with them.
    const msgs = [...el.querySelectorAll<HTMLElement>("[data-msg]")];
    msgs.forEach((m) => (m.style.opacity = "0"));
    let queue = Promise.resolve();
    let waiting = 0;
    const reveal = (m: HTMLElement) => {
      waiting++;
      queue = queue.then(async () => {
        if (!alive) return;
        const side = m.dataset.side;
        const hurry = waiting > 2;
        const dots = side === "us" && !hurry ? typingDots(m) : null;
        await wait(dots ? 650 : hurry ? 40 : 120);
        if (!alive) return;
        if (dots) {
          dots.getAnimations({ subtree: true }).forEach((a) => a.cancel());
          dots.remove();
        }
        m.style.opacity = "";
        const from = side === "me" ? "translate(24px,12px) scale(.9)" : side === "us" ? "translate(-24px,12px) scale(.9)" : "translateY(10px)";
        m.animate([{ opacity: 0, transform: from }, { opacity: 1, transform: "none" }], { duration: 420, easing: "cubic-bezier(.2,.9,.3,1.2)" });
        m.querySelectorAll("[data-bar]").forEach((b, k) =>
          b.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 800, delay: 200 + k * 150, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }),
        );
        if (m.hasAttribute("data-final")) timers.push(window.setTimeout(celebrate, 350));
        await wait(hurry ? 90 : 260);
        waiting--;
      });
    };
    const io = new IntersectionObserver(
      (es) =>
        es
          .filter((e) => e.isIntersecting)
          .sort((a, b) => msgs.indexOf(a.target as HTMLElement) - msgs.indexOf(b.target as HTMLElement))
          .forEach((e) => {
            io.unobserve(e.target);
            reveal(e.target as HTMLElement);
          }),
      { threshold: 0.4 },
    );
    msgs.forEach((m) => io.observe(m));

    return () => {
      alive = false;
      stopStrike();
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      loops.forEach((a) => a.cancel());
      el.querySelectorAll(".kl-wp-typing, .kl-wp-confetti").forEach((n) => n.remove());
      msgs.forEach((m) => (m.style.opacity = ""));
    };
  }, []);

  return (
    <div ref={root} className="kl-why-phone">
      <div ref={bar} className="kl-wp-bar">
        <span className="kl-wp-journey">
          <span className="kl-wp-track" aria-hidden="true">
            <span ref={fill} className="kl-wp-fill" />
          </span>
          Your journey
        </span>
      </div>

      <div className="kl-wp-head">
        <h2 ref={head} className="kl-wp-title">
          <span>We don’t</span>
          <span>sell</span>
          <span className="kl-wp-strike">
            courses.
            <svg aria-hidden="true" viewBox="0 0 200 40" preserveAspectRatio="none" fill="none">
              <path ref={strike} pathLength={1} d="M4 26 C 50 18, 110 12, 196 14" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
            </svg>
          </span>
        </h2>
        <p className="kl-wp-lede">
          <span>We help you get there with a <strong>proven framework</strong>.</span>
          <span>And we help you <strong>evaluate yourself at every important step</strong>.</span>
        </p>
        <span className="kl-wp-hint">
          <IconArrowDown size={14} />
          Scroll to see how it works
        </span>
      </div>

      <div className="kl-wp-chat">
        <Step n="01">You do this</Step>
        <div data-msg="" data-side="me" className="kl-wp-me">I want to become job-ready in AI.</div>
        <div data-msg="" data-side="me" className="kl-wp-enrolled">
          <span className="kl-wp-enrolled-tick">
            <IconCheck size={16} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </span>
          <span className="kl-wp-enrolled-text">
            <strong>Enrolled</strong>
            <span>That’s the only step you take.</span>
          </span>
        </div>

        <Step n="02">We do this</Step>
        <div data-msg="" data-side="us" className="kl-wp-us">
          Welcome. We’ve built your <strong>personal learning plan</strong>.
        </div>
        <div data-msg="" data-side="us" className="kl-wp-us kl-wp-plan">
          <span className="kl-wp-plan-head">
            <span>Today</span>
            <span>12 min</span>
          </span>
          <span className="kl-wp-task">
            <span className="kl-wp-dot" />
            Bite-size daily lesson
          </span>
          <span className="kl-wp-task">
            <span className="kl-wp-dot kl-wp-dot--todo" />
            Expert mentor check-in
          </span>
        </div>
        <div data-msg="" data-side="us" className="kl-wp-us">
          Stuck? Your <strong>expert mentor</strong> is one message away.
        </div>

        <Step n="03">We do this</Step>
        <div data-msg="" data-side="me" className="kl-wp-me kl-wp-me--icon">
          <IconClipboardCheck size={18} />
          Curated assessment
        </div>
        <div data-msg="" data-side="us" className="kl-wp-review">
          <span className="kl-wp-review-head">
            <span className="kl-wp-review-label">AI review</span>
            <span className="kl-wp-review-badge">Job standard</span>
          </span>
          <span className="kl-wp-scores">
            {SCORES.map(([label, score]) => (
              <span key={label} className="kl-wp-score">
                <span className="kl-wp-score-row">
                  <span>{label}</span>
                  <span>{score}</span>
                </span>
                <span className="kl-wp-score-track">
                  <span data-bar="" className="kl-wp-score-fill" style={{ width: `${score}%` }} />
                </span>
              </span>
            ))}
          </span>
          <span className="kl-wp-review-note">Practice tests and instant feedback after every module.</span>
        </div>

        <Step n="04">You get this</Step>
        <div ref={finalCard} data-msg="" data-final="" className="kl-wp-final">
          <svg ref={popper} className="kl-wp-popper" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5.8 11.3 2 22l10.7-3.79" />
            <path d="M4 3h.01" />
            <path d="M22 8h.01" />
            <path d="M15 2h.01" />
            <path d="M22 20h.01" />
            <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" />
            <path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z" />
          </svg>
          <span className="kl-wp-final-title">
            You’re
            <br />
            job-ready.
          </span>
          <span className="kl-wp-final-list">
            <span><IconCheck size={16} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />Connections from 100+ companies</span>
            <span><IconCheck size={16} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />Guaranteed interview call</span>
          </span>
          <span className="kl-wp-refund">
            <IconShieldCheck size={20} className="kl-flex-none" />
            No job? Take your 100% refund.
          </span>
        </div>
      </div>
    </div>
  );
}
