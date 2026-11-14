/**
 * Motion helpers for the homepage. The timings, easings and keyframes are the
 * ones in the Claude Design file (Klymb Landing v3), run through the Web
 * Animations API as the design does.
 */

/** The design's "settle" curve: quick start, long soft landing. */
export const EASE = "cubic-bezier(.2,.8,.2,1)";

/**
 * Token values for keyframes. Custom properties are scoped to .kl, and a
 * keyframe or a node appended to <body> cannot always read them, so the few
 * colours an animation needs are spelled out here (they match landing.css).
 */
export const C = {
  bg: "#f3f2f2",
  red: "#83050b",
  red300: "#e8b4b7",
  red400: "#f0868b",
  red600: "#690409",
  pip: "rgba(243, 242, 242, 0.22)",
  gold: "oklch(0.85 0.15 90)",
} as const;

export const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Runs `fn` once, the first time `el` is at least `threshold` in view (at once where that can't be watched). Returns a cleanup. */
export function onceVisible(el: Element, threshold: number, fn: () => void): () => void {
  if (!("IntersectionObserver" in window)) {
    fn();
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      fn();
    },
    { threshold },
  );
  io.observe(el);
  return () => io.disconnect();
}

/** Counts an element's text up from 0 to `to` (cubic ease-out), starting `delay` ms from now. Returns a cancel that leaves the final number. */
export function countUp(el: HTMLElement, to: number, delay: number, duration: number): () => void {
  const t0 = performance.now() + delay;
  let raf = 0;
  el.textContent = "0";
  const step = (now: number) => {
    const t = Math.min(1, Math.max(0, (now - t0) / duration));
    el.textContent = String(Math.round(to * (1 - Math.pow(1 - t, 3))));
    if (t < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => {
    cancelAnimationFrame(raf);
    el.textContent = String(to);
  };
}
