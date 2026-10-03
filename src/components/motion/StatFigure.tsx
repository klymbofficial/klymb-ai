"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts a display figure like "92M", "56%" or "3x" up from zero the first
 * time it scrolls into view. The prefix and suffix stay put; only the number
 * moves. Figures with no leading number render as-is. Plain rAF, so the
 * animation library is not needed on first load.
 */
export function StatFigure({ value, className }: { value: string; className?: string }) {
  const match = value.match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
  const ref = useRef<HTMLSpanElement>(null);
  const hasNumber = match !== null;
  const target = match ? Number(match[2]) : 0;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!hasNumber || !el) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setShown(target);
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / 1200);
        setShown(Math.round(target * (1 - Math.pow(1 - p, 4))));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, { rootMargin: "-60px" });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, hasNumber]);

  if (!match) return <span className={className}>{value}</span>;
  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true">{match[1]}{shown}{match[3]}</span>
    </span>
  );
}
