"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Brand, IconShieldCheck } from "./parts";
import { reduceMotion } from "./motion";

const LINKS = [
  { href: "#why", label: <>Why <Brand className="kl-brandword--nav" /></> },
  { href: "#who", label: "Who it's for" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

/**
 * The floating pill nav. The wordmark plays its climb on load and again on
 * hover: the letters bounce in turn while the full stop hops across them and
 * lands back in place with a little pop.
 */
export function LandingNav() {
  const brand = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const link = brand.current;
    if (!link || reduceMotion()) return;
    const letters = [...link.querySelectorAll<HTMLElement>("[data-logo-l]")];
    const dot = link.querySelector<HTMLElement>("[data-logo-dot]");
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

    const first = window.setTimeout(play, 400);
    let last = 0;
    const onEnter = () => {
      if (Date.now() - last > 1600) {
        last = Date.now();
        play();
      }
    };
    link.addEventListener("mouseenter", onEnter);
    return () => {
      window.clearTimeout(first);
      link.removeEventListener("mouseenter", onEnter);
    };
  }, []);

  return (
    <div className="kl-navbar">
      <nav className="kl-nav" aria-label="Main">
        <Link href="/" ref={brand} className="kl-brand" aria-label="Klymb home">
          <span className="kl-logo" aria-hidden="true">
            {"Klymb".split("").map((ch, i) => (
              <span key={i} data-logo-l="">{ch}</span>
            ))}
            <span data-logo-dot="" className="kl-dot">.</span>
          </span>
        </Link>
        <div className="kl-navlinks">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="kl-navlink">{l.label}</a>
          ))}
          <a href="#teams" className="kl-navlink kl-navlink--teams">For Teams</a>
        </div>
        <span className="kl-pulse">
          <IconShieldCheck size={16} />
          100% money back
        </span>
      </nav>
    </div>
  );
}
