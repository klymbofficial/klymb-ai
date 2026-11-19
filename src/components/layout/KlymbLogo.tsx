"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useRef, type RefObject } from "react";
import { reduceMotion } from "@/components/landing/motion";

/**
 * The wordmark's climb, as on the homepage's nav: the letters bounce in turn
 * while the full stop hops across them and lands back in place with a little
 * pop. On load, every five seconds and on hover; never twice within one run.
 * `link` holds the letters ([data-logo-l]) and the stop ([data-logo-dot]).
 */
export function useLogoClimb(link: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = link.current;
    if (!el || reduceMotion()) return;
    const letters = [...el.querySelectorAll<HTMLElement>("[data-logo-l]")];
    const dot = el.querySelector<HTMLElement>("[data-logo-dot]");
    if (!dot) return;

    const play = () => {
      letters.forEach((l, k) =>
        l.animate(
          [{ transform: "translateY(0)" }, { transform: `translateY(${-0.08 * (k + 1)}em)`, offset: 0.45 }, { transform: "translateY(0)" }],
          { duration: 900, delay: k * 60, easing: "cubic-bezier(.3,.7,.3,1)" },
        ),
      );
      const dx = letters.map((l) => l.offsetLeft + l.offsetWidth / 2 - dot.offsetLeft - dot.offsetWidth / 2);
      const frames: Keyframe[] = [{ transform: `translate(${dx[0]}px,0)`, opacity: 0 }];
      letters.forEach((_, k) => {
        const t = (k + 1) / (letters.length + 1);
        frames.push({ transform: `translate(${dx[k]}px,${-0.5 - k * 0.12}em)`, opacity: 1, offset: t - 0.08 });
        frames.push({ transform: `translate(${(dx[k] + (dx[k + 1] ?? 0)) / 2}px,${-0.75 - k * 0.12}em)`, offset: t });
      });
      frames.push({ transform: "translate(0,0)", opacity: 1 });
      dot.animate(frames, { duration: 1300, easing: "ease-in-out" });
      dot.animate([{ transform: "scale(1)" }, { transform: "scale(1.6)" }, { transform: "scale(1)" }], { duration: 300, delay: 1300, easing: "ease-out", composite: "add" });
    };

    // On load, then every 5 seconds, and on hover; never twice within one run (1.6s).
    // Not while it isn't drawn: the learner frame has one in the sidebar and one in the phone bar, and shows one.
    let last = 0;
    const replay = () => {
      if (!el.getClientRects().length || Date.now() - last < 1600) return;
      last = Date.now();
      play();
    };
    const first = window.setTimeout(replay, 400);
    const every = window.setInterval(replay, 5000);
    el.addEventListener("mouseenter", replay);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
      el.removeEventListener("mouseenter", replay);
    };
  }, [link]);
}

/**
 * The homepage's wordmark, "Klymb." with its climb, outside the homepage's
 * .kl styles: for the learner's sidebar and top bar. `short` is "K." for the
 * narrow sidebar on lesson pages.
 */
export function KlymbLogo({ href, label, short = false, className }: { href: string; label: string; short?: boolean; className?: string }) {
  const link = useRef<HTMLAnchorElement>(null);
  useLogoClimb(link);
  return (
    <Link ref={link} href={href} aria-label={label} className={clsx("flex items-center font-heading text-[22px] font-extrabold tracking-[-0.03em] text-ink", className)}>
      <span aria-hidden="true" className="relative inline-flex items-baseline">
        {(short ? "K" : "Klymb").split("").map((ch, i) => (
          <span key={i} data-logo-l="" className="inline-block">{ch}</span>
        ))}
        <span data-logo-dot="" className="inline-block text-red">.</span>
      </span>
    </Link>
  );
}
