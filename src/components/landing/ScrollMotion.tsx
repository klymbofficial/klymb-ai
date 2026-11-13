"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useEffect } from "react";
import { reduceMotion } from "./motion";

/** How far a photo drifts, as a share of its own height, either way (its 10% overscan in landing.css keeps the edges hidden). */
const DRIFT = 0.045;

let smooth: Lenis | null = null;

/** Glides to a section the way in-page links do (or jumps, where smooth scrolling is off). */
export function glideTo(selector: string) {
  if (smooth) {
    smooth.scrollTo(selector);
    return;
  }
  document.querySelector(selector)?.scrollIntoView();
}

/**
 * The homepage's scrolling, all in one place:
 *
 * - Smooth, weighted scrolling (Lenis) for mouse wheels and trackpads; phones
 *   keep their own touch scrolling. In-page links (#pricing, #faq…) glide to
 *   their section and stop clear of the nav. Scrollable boxes inside the page,
 *   such as Kamran's chat, still scroll on their own.
 * - Anything marked data-reveal rises in the first time it comes into view
 *   (a --kl-delay on it staggers a group).
 * - Photos drift a little slower than the page (parallax).
 *
 * Nothing of this runs for visitors who ask for reduced motion.
 */
export function ScrollMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".kl");
    if (!root || reduceMotion()) return;

    // Anchor links stop at the site's scroll-padding-top (globals.css), which Lenis reads, so they land clear of the nav.
    const lenis = new Lenis({ autoRaf: true, lerp: 0.09, anchors: true, allowNestedScroll: true, stopInertiaOnNavigate: true });
    smooth = lenis;

    // Reveals. What is already on screen shows at once, so nothing blinks out on load.
    // State goes in data attributes, never classes: React rewrites an element's
    // className when it re-renders (an FAQ item opening), which would wipe a
    // class added here and hide the item again.
    const items = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
    items.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.setAttribute("data-in", "");
    });
    root.setAttribute("data-motion", "");
    const reveal = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.setAttribute("data-in", "");
          reveal.unobserve(e.target);
        }),
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    items.forEach((el) => {
      if (!el.hasAttribute("data-in")) reveal.observe(el);
    });

    // Parallax: only photos near the screen are moved, once per frame at most.
    const near = new Set<HTMLElement>();
    let raf = 0;
    const watch = new IntersectionObserver(
      (es) => {
        es.forEach((e) => (e.isIntersecting ? near.add(e.target as HTMLElement) : near.delete(e.target as HTMLElement)));
        onScroll(); // place photos that are already in view, before any scrolling
      },
      { rootMargin: "15% 0px" },
    );
    root.querySelectorAll<HTMLElement>(".kl-photo").forEach((p) => watch.observe(p));
    const drift = () => {
      raf = 0;
      const h = window.innerHeight;
      near.forEach((p) => {
        const r = p.getBoundingClientRect();
        // -1 as the photo enters at the bottom, 0 when centred, 1 as it leaves at the top.
        const t = Math.max(-1, Math.min(1, (h / 2 - (r.top + r.height / 2)) / (h / 2 + r.height / 2)));
        p.style.setProperty("--kl-py", `${(t * r.height * DRIFT).toFixed(1)}px`);
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(drift);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    return () => {
      lenis.destroy();
      smooth = null;
      reveal.disconnect();
      watch.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      root.removeAttribute("data-motion");
    };
  }, []);

  return null;
}
