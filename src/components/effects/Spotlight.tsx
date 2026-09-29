"use client";

import clsx from "clsx";
import { useRef } from "react";

/**
 * A soft light that follows the pointer across its children, after the
 * holographic card on vgpu.sh. It only writes two CSS variables; the glow
 * itself is the `.spotlight` rule in globals.css, so touch screens and
 * reduced-motion users simply never see it.
 */
export function Spotlight({ className, children, tone = "red" }: { className?: string; children: React.ReactNode; tone?: "red" | "white" }) {
  const ref = useRef<HTMLDivElement>(null);

  function move(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  return (
    <div ref={ref} onPointerMove={move} className={clsx("spotlight", tone === "white" && "spotlight-white", className)}>
      {children}
    </div>
  );
}
