"use client";

import { useEffect, useRef, useState } from "react";
import { reduceMotion } from "./motion";
import { IconArrowUpRight } from "./parts";

/** The step the dock shows while each section is in the middle of the screen. */
const STEPS: Record<string, [string, string]> = {
  why: ["02", "4 steps to job-ready"],
  who: ["03", "Students, job seekers and professionals"],
  pricing: ["04", "Courses from ₹499"],
  stories: ["05", "Join 2,000+ learners"],
  faq: ["06", "Still unsure? 100% money back"],
  close: ["07", "Your next step starts here"],
};

/** The progress ring's circumference (r = 19). */
const RING = 119.4;

/**
 * "Start your journey", docked at the bottom once the hero's own button has
 * scrolled away. Its ring fills with how far down the page you are, and its
 * number and hint follow the section in view, with a little bump on each
 * change.
 */
export function JourneyDock() {
  const dock = useRef<HTMLAnchorElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const shown = useRef("01");
  const [on, setOn] = useState(false);
  const [step, setStep] = useState<[string, string]>(["01", "4 steps to job-ready"]);
  const [hintOn, setHintOn] = useState(true);

  useEffect(() => {
    const d = dock.current;
    const hero = document.querySelector("[data-hero-cta]");
    if (!d || !hero || !("IntersectionObserver" in window)) return;
    let swap = 0;

    const heroIO = new IntersectionObserver((es) => setOn(!es[0].isIntersecting), { threshold: 0 });
    heroIO.observe(hero);

    const sectionIO = new IntersectionObserver(
      (es) =>
        es.forEach((en) => {
          if (!en.isIntersecting) return;
          const next = STEPS[en.target.id];
          if (!next || shown.current === next[0]) return;
          shown.current = next[0];
          setHintOn(false);
          window.clearTimeout(swap);
          swap = window.setTimeout(() => {
            setStep(next);
            setHintOn(true);
          }, 200);
          if (!reduceMotion()) d.animate([{ scale: 1 }, { scale: 1.06 }, { scale: 1 }], { duration: 450, easing: "ease-out" });
        }),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    Object.keys(STEPS).forEach((id) => {
      const s = document.getElementById(id);
      if (s) sectionIO.observe(s);
    });

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      ring.current?.setAttribute("stroke-dashoffset", (RING * (1 - p)).toFixed(1));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      heroIO.disconnect();
      sectionIO.disconnect();
      window.clearTimeout(swap);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <a
      ref={dock}
      href="#pricing"
      className={on ? "kl-dock is-on" : "kl-dock"}
      aria-label="Start your journey"
      aria-hidden={!on}
      tabIndex={on ? 0 : -1}
    >
      <span className="kl-dock-ring">
        <svg viewBox="0 0 44 44" aria-hidden="true">
          <circle className="kl-dock-track" cx="22" cy="22" r="19" fill="none" strokeWidth="3" />
          <circle ref={ring} className="kl-dock-progress" cx="22" cy="22" r="19" fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={RING} />
        </svg>
        <span className="kl-dock-step">{step[0]}</span>
      </span>
      <span className="kl-dock-text">
        <span className="kl-dock-title">Start your journey</span>
        <span className="kl-dock-hint" style={{ opacity: hintOn ? 1 : 0 }}>{step[1]}</span>
      </span>
      <span className="kl-dock-go">
        <IconArrowUpRight size={18} />
      </span>
    </a>
  );
}
