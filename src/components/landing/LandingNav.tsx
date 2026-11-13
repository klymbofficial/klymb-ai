"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AccountLink } from "@/components/layout/AccountLink";
import { Brand, IconShieldCheck } from "./parts";
import { reduceMotion } from "./motion";

const LINKS = [
  { href: "#why", label: <>Why <Brand className="kl-brandword--nav" /></> },
  { href: "#who", label: "Who it's for" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

/**
 * The floating pill nav. The wordmark plays its climb on load, every five
 * seconds and on hover: the letters bounce in turn while the full stop hops
 * across them and lands back in place with a little pop.
 *
 * `site`: the (site) pages use it too. There the section links go back to the
 * homepage (/#why), and Log in shows on desktop as well, since those pages
 * have no hero with a Log in button of their own.
 */
export function LandingNav({ site = false }: { site?: boolean }) {
  const base = site ? "/" : "";
  const brand = useRef<HTMLAnchorElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  // The nav's height, as --kl-nav-h on the page, for anything that sticks just below it.
  useEffect(() => {
    const el = bar.current;
    const page = el?.closest<HTMLElement>(".kl");
    if (!el || !page) return;
    const set = () => page.style.setProperty("--kl-nav-h", `${Math.round(el.getBoundingClientRect().height)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

    // On load, then every 5 seconds, and on hover; never twice within one run (1.6s).
    let last = 0;
    const replay = () => {
      if (Date.now() - last < 1600) return;
      last = Date.now();
      play();
    };
    const first = window.setTimeout(replay, 400);
    const every = window.setInterval(replay, 5000);
    link.addEventListener("mouseenter", replay);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
      link.removeEventListener("mouseenter", replay);
    };
  }, []);

  return (
    <div ref={bar} className={site ? "kl-navbar kl-navbar--site" : "kl-navbar"}>
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
            <a key={l.href} href={base + l.href} className="kl-navlink">{l.label}</a>
          ))}
          <a href={`${base}#teams`} className="kl-navlink kl-navlink--teams">For Teams</a>
        </div>
        {site && <AccountLink className="kl-btn kl-btn-secondary kl-navlogin" />}
        <span className="kl-pulse">
          <IconShieldCheck size={16} />
          100% money back
        </span>
        <PhoneMenu base={base} />
      </nav>
    </div>
  );
}

/**
 * Phones: a round menu button beside the money-back pill. It opens a card
 * with the sections and Log in (the hero on phones has no Log in button of
 * its own). The two bars turn into a cross; a link, Escape or a tap outside
 * closes it.
 */
function PhoneMenu({ base }: { base: string }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onDown = (e: globalThis.PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <div ref={wrap} className="kl-menu">
      <button
        ref={button}
        type="button"
        className={open ? "kl-menu-btn is-open" : "kl-menu-btn"}
        aria-label={open ? "Close menu" : "Menu"}
        aria-expanded={open}
        aria-controls="kl-menu-panel"
        onClick={() => setOpen(!open)}
      >
        <span />
        <span />
      </button>
      <div id="kl-menu-panel" className={open ? "kl-menu-panel is-open" : "kl-menu-panel"} inert={!open}>
        <ul>
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={base + l.href} onClick={() => setOpen(false)}>{l.label}</a>
            </li>
          ))}
          <li>
            <a href={`${base}#teams`} className="kl-menu-teams" onClick={() => setOpen(false)}>For Teams</a>
          </li>
        </ul>
        <AccountLink className="kl-btn kl-btn-secondary kl-menu-login" />
      </div>
    </div>
  );
}
