"use client";

import { useEffect, useRef } from "react";

/**
 * Light that follows or is drawn by the pointer, on a 2D canvas.
 *
 * `beam`  : a slow red beam that swings towards the pointer (the hero).
 * `paint` : moving the pointer leaves glowing light that fades (the red band),
 *           after vgpu.sh's radiance-cascades example, without the GPU cost.
 *
 * Nothing runs on touch-only devices or with reduced motion, and the loop
 * pauses while the canvas is off screen.
 */
export function LightCanvas({ mode, className }: { mode: "beam" | "paint"; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reduced) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const host = canvas.parentElement!;
    let w = 0, h = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = host.clientWidth; h = host.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // Target and eased pointer position, in canvas pixels.
    const target = { x: w * 0.7, y: h * 0.35, active: false };
    const eased = { ...target };
    let last = { x: target.x, y: target.y };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      target.x = e.clientX - r.left; target.y = e.clientY - r.top; target.active = true;
    };
    const onLeave = () => { target.active = false; };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);

    let visible = true;
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    io.observe(canvas);

    let raf = 0;
    let t = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      t += 1 / 60;
      const k = mode === "beam" ? 0.06 : 0.35;
      eased.x += (target.x - eased.x) * k;
      eased.y += (target.y - eased.y) * k;

      if (mode === "beam") {
        ctx.clearRect(0, 0, w, h);
        // Idle drift when the pointer is away, so the light never looks frozen.
        const x = target.active ? eased.x : w * (0.62 + 0.08 * Math.sin(t * 0.4));
        const y = target.active ? eased.y : h * (0.32 + 0.06 * Math.cos(t * 0.3));
        const src = { x: w * 1.02, y: -h * 0.1 };
        const ang = Math.atan2(y - src.y, x - src.x);
        const len = Math.hypot(x - src.x, y - src.y) * 1.6;
        ctx.save();
        ctx.translate(src.x, src.y);
        ctx.rotate(ang);
        const g = ctx.createLinearGradient(0, 0, len, 0);
        g.addColorStop(0, "rgba(131,5,11,0.00)");
        g.addColorStop(0.35, "rgba(131,5,11,0.10)");
        g.addColorStop(1, "rgba(131,5,11,0.00)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(len, -len * 0.16);
        ctx.lineTo(len, len * 0.16);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        const glow = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * 0.28);
        glow.addColorStop(0, "rgba(131,5,11,0.16)");
        glow.addColorStop(1, "rgba(131,5,11,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);
      } else {
        // Fade what was drawn, then add light along the pointer's path.
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "rgba(0,0,0,0.045)";
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = "lighter";
        if (target.active) {
          const steps = Math.max(1, Math.ceil(Math.hypot(eased.x - last.x, eased.y - last.y) / 6));
          for (let i = 1; i <= steps; i++) {
            const px = last.x + ((eased.x - last.x) * i) / steps;
            const py = last.y + ((eased.y - last.y) * i) / steps;
            const g = ctx.createRadialGradient(px, py, 0, px, py, 70);
            g.addColorStop(0, "rgba(255,236,220,0.16)");
            g.addColorStop(0.4, "rgba(255,170,120,0.06)");
            g.addColorStop(1, "rgba(255,120,80,0)");
            ctx.fillStyle = g;
            ctx.fillRect(px - 70, py - 70, 140, 140);
          }
        }
        ctx.globalCompositeOperation = "source-over";
        last = { x: eased.x, y: eased.y };
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, [mode]);

  return <canvas ref={ref} aria-hidden="true" className={className ?? "pointer-events-none absolute inset-0 h-full w-full"} />;
}
