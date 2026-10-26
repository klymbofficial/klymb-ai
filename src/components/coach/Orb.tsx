"use client";

import { useEffect, useRef } from "react";
import type { CoachStatus, Levels } from "@/components/coach/useVoiceSession";

/**
 * The orb: one focal point on the screen, driven by the actual audio.
 *
 * It is a meter, not decoration. The learner cannot see a microphone working
 * and cannot tell whether they were heard, so the orb answers both: it swells
 * with their own voice while they speak and with the playback while the coach
 * speaks, which is also how they know an interruption landed. An avatar would
 * promise a face the model does not have.
 *
 * 2D canvas rather than WebGL, the same call as src/components/effects:
 * three.js is already in this project, but a shader for a fluid sphere costs
 * a GPU context and a chunk of JavaScript for something a few sine harmonics
 * do convincingly at this size.
 *
 * With reduced motion the idle drift, the orbiting particles and the wobble
 * all stop; the orb still answers the voice, because that is information
 * rather than flourish.
 */

export type OrbState = "idle" | "connecting" | "ready" | "listening" | "thinking" | "speaking" | "muted" | "off";

export function orbState(status: CoachStatus, muted: boolean): OrbState {
  if (status === "error" || status === "ended") return "off";
  if (status === "idle") return "idle";
  if (muted && (status === "ready" || status === "listening")) return "muted";
  if (status === "connecting") return "connecting";
  return status;
}

/** r, g, b. The brand red is unreadable on the night ground, so its lifted form is used. */
const RED_SOFT = [240, 134, 139] as const;
const WARM = [255, 232, 224] as const;
const GREY = [143, 140, 139] as const;

/**
 * Grey means something: muted, or nothing connected. Everything the learner
 * can speak to is lit, including the orb sitting there before they start —
 * it is an invitation at that point, not a dead control.
 */
const LOOK: Record<OrbState, { tint: readonly number[]; base: number; gain: number; glow: number }> = {
  //                        colour      resting size   how much the audio moves it   outer glow
  idle: { tint: RED_SOFT, base: 0.55, gain: 0, glow: 0.55 },
  connecting: { tint: RED_SOFT, base: 0.56, gain: 0, glow: 0.6 },
  ready: { tint: RED_SOFT, base: 0.58, gain: 0.1, glow: 0.7 },
  listening: { tint: WARM, base: 0.58, gain: 0.42, glow: 0.8 },
  thinking: { tint: RED_SOFT, base: 0.56, gain: 0.06, glow: 0.7 },
  speaking: { tint: RED_SOFT, base: 0.6, gain: 0.34, glow: 0.95 },
  muted: { tint: GREY, base: 0.5, gain: 0, glow: 0.3 },
  off: { tint: GREY, base: 0.46, gain: 0, glow: 0.2 },
};

const rgba = (tint: readonly number[], alpha: number) => `rgba(${tint[0]},${tint[1]},${tint[2]},${alpha})`;

export function Orb({
  state,
  sample,
  className,
}: {
  state: OrbState;
  /** Called once per frame; returns 0–1 for the microphone and the playback. */
  sample: () => Levels;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  // The draw loop reads these rather than closing over the props, so a state
  // change does not restart the animation mid-wobble. Written in an effect
  // because a ref must not be touched during render.
  const stateRef = useRef(state);
  const sampleRef = useRef(sample);
  useEffect(() => {
    stateRef.current = state;
    sampleRef.current = sample;
  }, [state, sample]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let calm = motion.matches;
    const onMotion = (e: MediaQueryListEvent) => {
      calm = e.matches;
    };
    motion.addEventListener("change", onMotion);

    const host = canvas.parentElement!;
    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = host.clientWidth;
      h = host.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(canvas);

    let raf = 0;
    let t = 0;
    let eased = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;

      const look = LOOK[stateRef.current];
      const levels = sampleRef.current();
      // Whichever side of the conversation is making sound drives the orb;
      // with echo cancellation on they do not overlap in practice.
      const level = Math.max(levels.mic, levels.voice);
      eased += (level - eased) * (calm ? 0.08 : 0.25);
      if (!calm) t += 1 / 60;

      const cx = w / 2;
      const cy = h / 2;
      const unit = Math.min(w, h) / 2;
      const radius = unit * (look.base + eased * look.gain);

      ctx.clearRect(0, 0, w, h);

      // Outer glow, lifted by the level so the whole panel breathes.
      const halo = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, unit * 1.25);
      halo.addColorStop(0, rgba(look.tint, 0.14 * look.glow * (0.7 + eased)));
      halo.addColorStop(1, rgba(look.tint, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      // The body: a circle made slightly liquid by three harmonics, their
      // amplitude following the voice. Flat when motion is reduced.
      ctx.beginPath();
      const steps = 120;
      for (let i = 0; i <= steps; i += 1) {
        const a = (i / steps) * Math.PI * 2;
        // Nearly round at rest and liquid once there is a voice: the
        // harmonics are scaled by the level too, so the shape itself is part
        // of the meter rather than a permanent wobble.
        const fluid = 0.3 + eased;
        const wobble = calm
          ? 1
          : 1 +
            fluid * (0.035 * Math.sin(3 * a + t * 1.1) + 0.025 * Math.sin(5 * a - t * 0.8)) +
            eased * 0.16 * Math.sin(2 * a + t * 1.7);
        const r = radius * wobble;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Lit from above left, so it reads as a sphere rather than a disc.
      const body = ctx.createRadialGradient(cx - radius * 0.28, cy - radius * 0.32, radius * 0.04, cx, cy, radius * 1.05);
      body.addColorStop(0, rgba(WARM, 0.95));
      body.addColorStop(0.28, rgba(look.tint, 0.85));
      body.addColorStop(0.72, rgba(look.tint, 0.42));
      body.addColorStop(1, rgba(look.tint, 0.06));
      ctx.fillStyle = body;
      ctx.fill();

      ctx.strokeStyle = rgba(WARM, 0.18 + eased * 0.25);
      ctx.lineWidth = 1;
      ctx.stroke();

      // Preparing the reply: one arc going round, so the wait has a shape.
      if (stateRef.current === "thinking" || stateRef.current === "connecting") {
        const sweep = calm ? 0 : t * 2.2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.22, sweep, sweep + Math.PI * 0.45);
        ctx.strokeStyle = rgba(WARM, calm ? 0.3 : 0.55);
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      // Particles: a sparse ring that drifts, brightening with the level.
      const dots = 42;
      for (let i = 0; i < dots; i += 1) {
        const a = (i / dots) * Math.PI * 2 + (calm ? 0 : t * 0.14);
        const spread = 1.38 + 0.1 * Math.sin(i * 2.4 + (calm ? 0 : t * 0.9));
        const x = cx + Math.cos(a) * radius * spread;
        const y = cy + Math.sin(a) * radius * spread;
        ctx.globalAlpha = Math.min(0.8, 0.2 + eased * 0.6) * (0.45 + 0.55 * Math.abs(Math.sin(i * 1.7)));
        ctx.fillStyle = rgba(look.tint, 1);
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.8, unit * 0.012), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      io.disconnect();
      motion.removeEventListener("change", onMotion);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={className ?? "absolute inset-0 h-full w-full"} />;
}
