"use client";

import { useEffect, useRef } from "react";

/**
 * "404" as a small spatial object: the digits sit on stacked glass planes at
 * different depths, and the stack tilts toward the pointer on a damped spring,
 * so nearer layers travel further than deeper ones (real parallax, not a
 * flat skew). Without a pointer it drifts slowly on its own.
 *
 * Decorative: aria-hidden, transform-only (compositor), paused off-screen and
 * in background tabs, and still for reduced motion.
 */
const LAYERS = [
  { z: -90, className: "text-red-strong/10 blur-[2px]" },
  { z: -45, className: "text-red-strong/20" },
  { z: 0, className: "text-red-strong" },
  { z: 55, className: "text-transparent [-webkit-text-stroke:1.5px_var(--color-red-strong)] opacity-60" },
];

export function Spatial404({ className }: { className?: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const object = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stage.current, obj = object.current, sh = shadow.current;
    if (!el || !obj || !sh) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = { x: 0, y: 0 };
    const tilt = { x: 0, y: 0, vx: 0, vy: 0 };
    let pointerAt = 0;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      // -1..1 around the object's centre, clamped so far-away pointers don't over-rotate.
      target.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
      target.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
      pointerAt = performance.now();
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(el);

    const start = performance.now();
    let last = start;
    let raf = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // Idle for 2s (or touch only): a slow figure-eight drift instead.
      if (now - pointerAt > 2000) {
        const t = (now - start) / 1000;
        target.x = Math.sin(t * 0.5) * 0.45;
        target.y = Math.sin(t * 0.8) * 0.25;
      }
      for (const axis of ["x", "y"] as const) {
        const v = axis === "x" ? "vx" : "vy";
        tilt[v] += ((target[axis] - tilt[axis]) * 70 - tilt[v] * 12) * dt; // stiffness 70, damping 12
        tilt[axis] += tilt[v] * dt;
      }
      obj.style.transform = `rotateX(${(-tilt.y * 16).toFixed(2)}deg) rotateY(${(tilt.x * 22).toFixed(2)}deg)`;
      sh.style.transform = `translate3d(${(-tilt.x * 26).toFixed(1)}px, 0, 0) scaleX(${(1 - Math.abs(tilt.x) * 0.12).toFixed(3)})`;
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div ref={stage} aria-hidden="true" className={className} style={{ perspective: "900px" }}>
      <div ref={object} className="relative mx-auto grid w-fit place-items-center will-change-transform" style={{ transformStyle: "preserve-3d" }}>
        {LAYERS.map((l) => (
          <span
            key={l.z}
            className={`display select-none text-[clamp(7rem,24vw,15rem)] leading-none tabular-nums [grid-area:1/1] ${l.className}`}
            style={{ transform: `translateZ(${l.z}px)` }}
          >
            404
          </span>
        ))}
        {/* A glass pane between the layers, so depth reads even when still. */}
        <span
          className="pointer-events-none absolute inset-x-[-6%] inset-y-[18%] rounded-[2rem] border border-white/60 bg-white/25 shadow-[inset_0_1px_0_rgb(255_255_255/0.7)] backdrop-blur-[2px]"
          style={{ transform: "translateZ(28px)" }}
        />
      </div>
      <div
        ref={shadow}
        className="mx-auto mt-2 h-5 w-[min(70%,22rem)] rounded-[50%] bg-ink/15 blur-xl will-change-transform"
      />
    </div>
  );
}
