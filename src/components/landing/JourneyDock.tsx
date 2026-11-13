"use client";

import { useEffect, useRef, useState } from "react";
import { reduceMotion } from "./motion";
import { IconArrowUpRight } from "./parts";

/** The step the dock shows while each section is in the middle of the screen. */
const STEPS: Record<string, string> = {
  why: "02",
  who: "03",
  pricing: "04",
  stories: "05",
  faq: "06",
  close: "07",
};

/** The progress ring's circumference (r = 19). */
const RING = 119.4;

/**
 * "Start your journey", docked at the bottom once the hero has scrolled
 * fully away (never over the hero's own button). Its ring fills with how far
 * down the page you are, and its number follows the section in view, with a
 * little bump on each change.
 */
export function JourneyDock() {
  const dock = useRef<HTMLAnchorElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const [on, setOn] = useState(false);
  const [step, setStep] = useState("01");

  useEffect(() => {
    const d = dock.current;
    // The dock stays away while any part of the hero is on screen, so it never sits over the hero's own
    // "Start your journey". Both heroes are watched (desktop and phone); the hidden one never shows.
    const heroes = [...document.querySelectorAll("[data-hero]")];
    if (!d || !heroes.length || !("IntersectionObserver" in window)) return;
    let shown = "01";

    const inView = new Set<Element>();
    const heroIO = new IntersectionObserver(
      (es) => {
        es.forEach((e) => (e.isIntersecting ? inView.add(e.target) : inView.delete(e.target)));
        setOn(inView.size === 0);
      },
      { threshold: 0 },
    );
    heroes.forEach((h) => heroIO.observe(h));

    const sectionIO = new IntersectionObserver(
      (es) =>
        es.forEach((en) => {
          if (!en.isIntersecting) return;
          const next = STEPS[en.target.id];
          if (!next || shown === next) return;
          shown = next;
          setStep(next);
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
        <span className="kl-dock-step">{step}</span>
      </span>
      <span className="kl-dock-title">Start your journey</span>
      <span className="kl-dock-go">
        <IconArrowUpRight size={18} />
      </span>
    </a>
  );
}
