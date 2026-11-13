"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";
import { Brand } from "./parts";
import { C, EASE, countUp, reduceMotion } from "./motion";

/*
 * Pieces both heroes share (Hero on wider screens, HeroPhone on phones):
 * the cycling headline, the placement card's pips and its motion. Only one
 * hero shows at a time; the hidden one's motion doesn't run.
 */

/** The hand-drawn underline under the red word of each headline. */
function Swoosh() {
  return (
    <svg className="kl-swoosh" viewBox="0 0 200 24" preserveAspectRatio="none" fill="none" aria-hidden="true">
      <path data-swoosh="" pathLength={1} d="M4 16 C 50 6, 120 4, 196 10" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

/** One word of the headline; `i` staggers its entrance. */
function W({ i, accent, children }: { i: number; accent?: boolean; children: ReactNode }) {
  return (
    <span data-w="" className={accent ? "kl-w kl-w-accent" : "kl-w"} style={{ "--i": i } as CSSProperties}>
      {children}
      {accent && <Swoosh />}
    </span>
  );
}

/**
 * "Upskill yourself in AI with Klymb." and "Get placed within the Klymb
 * network." take turns: words blur out, the next set rises in and its red
 * word is underlined. The first one's entrance is CSS (landing.css), so it
 * plays from the first paint.
 */
export function Headline({ className }: { className: string }) {
  const h1 = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const h = h1.current;
    if (!h || h.offsetParent === null) return;
    const layers = [...h.querySelectorAll<HTMLElement>("[data-hl]")];
    const reduce = reduceMotion();
    const words = (l: HTMLElement) => [...l.querySelectorAll<HTMLElement>("[data-w]")];
    let timer = 0;
    let alive = true;

    const show = (l: HTMLElement) => {
      l.style.visibility = "visible";
      if (reduce) return;
      const ws = words(l);
      ws.forEach((w, k) =>
        w.animate(
          [{ transform: "translateY(0.6em) rotate(5deg)", opacity: 0, filter: "blur(8px)" }, { transform: "none", opacity: 1, filter: "blur(0)" }],
          { duration: 700, delay: k * 80, easing: EASE, fill: "backwards" },
        ),
      );
      const p = l.querySelector<SVGPathElement>("[data-swoosh]");
      if (p) {
        p.style.strokeDasharray = "1 1";
        p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 600, delay: ws.length * 80 + 300, easing: "cubic-bezier(.6,0,.2,1)", fill: "both" });
      }
    };

    const hide = (l: HTMLElement) => {
      if (reduce) {
        l.style.visibility = "hidden";
        return Promise.resolve();
      }
      const ws = words(l);
      ws.forEach((w, k) =>
        w.animate(
          [{ transform: "none", opacity: 1, filter: "blur(0)" }, { transform: "translateY(-0.5em) rotate(-4deg)", opacity: 0, filter: "blur(8px)" }],
          { duration: 450, delay: k * 45, easing: "cubic-bezier(.6,0,.8,.4)", fill: "forwards" },
        ),
      );
      return new Promise<void>((res) => {
        timer = window.setTimeout(() => {
          l.style.visibility = "hidden";
          l.getAnimations({ subtree: true }).forEach((a) => a.cancel());
          res();
        }, 450 + ws.length * 45 + 30);
      });
    };

    let i = 0;
    const cycle = () => {
      timer = window.setTimeout(() => {
        hide(layers[i]).then(() => {
          if (!alive) return;
          i = (i + 1) % layers.length;
          show(layers[i]);
          cycle();
        });
      }, 4200);
    };
    cycle();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <h1 ref={h1} className={className} aria-label="Upskill yourself in AI with Klymb. Get placed within the Klymb network.">
      <span data-hl="" data-first="" className="kl-hl" aria-hidden="true">
        <span className="kl-hl-line">
          <W i={0}>Upskill</W> <W i={1}>yourself</W>
        </span>
        <span className="kl-hl-line">
          <W i={2}>in</W> <W i={3} accent>AI</W> <W i={4}>with</W> <W i={5}><Brand /></W>
        </span>
      </span>
      <span data-hl="" className="kl-hl" aria-hidden="true" style={{ visibility: "hidden" }}>
        <span className="kl-hl-line">
          <W i={0}>Get</W> <W i={1} accent>placed</W> <W i={2}>within</W>
        </span>
        <span className="kl-hl-line">
          <W i={3}>the</W> <W i={4}><Brand /></W> <W i={5}>network.</W>
        </span>
      </span>
    </h1>
  );
}

/** The row of dashes under a tally that light up in a chase. */
export function Pips() {
  return (
    <span className="kl-pips" data-pips="" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => <span key={i} />)}
    </span>
  );
}

/**
 * The placement card's motion: its numbers count up from 0 (`countAt` ms
 * into the card's CSS fade-in), the pips light in a chase, and "+1"s float
 * off the numbers. A card that isn't showing just shows its numbers.
 */
export function useResultsMotion(ref: RefObject<HTMLElement | null>, countAt: number) {
  useEffect(() => {
    const card = ref.current;
    if (!card) return;
    const counters = [...card.querySelectorAll<HTMLElement>("[data-count-to]")];
    if (reduceMotion() || card.offsetParent === null) {
      counters.forEach((n) => (n.textContent = n.dataset.countTo ?? ""));
      return;
    }
    const anims: Animation[] = [];
    const stops: (() => void)[] = [];
    const timers: number[] = [];

    const entrance = card.getAnimations().find((a) => a instanceof CSSAnimation);
    const elapsed = entrance && entrance.currentTime != null ? Number(entrance.currentTime) : countAt;
    counters.forEach((n, k) => stops.push(countUp(n, Number(n.dataset.countTo), Math.max(0, countAt - elapsed) + k * 150, 1400)));

    card.querySelectorAll<HTMLElement>("[data-pips]").forEach((row, r) => {
      const lit = r ? C.red400 : C.bg;
      [...row.children].forEach((p, k) =>
        anims.push(
          p.animate([{ background: C.pip }, { background: lit, offset: 0.15 }, { background: lit, offset: 0.8 }, { background: C.pip }], {
            duration: 3200,
            delay: 900 + k * 180 + r * 500,
            iterations: Infinity,
            easing: "ease-out",
          }),
        ),
      );
    });

    const pop = (el: HTMLElement, accent: boolean) => {
      if (!el.isConnected) return;
      const b = document.createElement("span");
      b.textContent = "+1";
      b.className = "kl-pop";
      b.style.color = accent ? C.red400 : C.bg;
      el.appendChild(b);
      b.animate(
        [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "translateY(0)", offset: 0.3 }, { opacity: 0, transform: "translateY(-14px)" }],
        { duration: 1400, easing: "ease-out", fill: "forwards" },
      ).onfinish = () => b.remove();
      // A tab in the background doesn't finish animations; don't let the "+1"s pile up there.
      timers.push(window.setTimeout(() => b.remove(), 1600));
    };
    card.querySelectorAll<HTMLElement>("[data-tally]").forEach((t, k) => {
      const loop = () => {
        pop(t, k === 1);
        timers[k] = window.setTimeout(loop, (k ? 2600 : 5200) + Math.random() * 1200);
      };
      timers[k] = window.setTimeout(loop, 2600 + k * 900);
    });

    return () => {
      anims.forEach((a) => a.cancel());
      stops.forEach((s) => s());
      timers.forEach((t) => window.clearTimeout(t));
      card.querySelectorAll(".kl-pop").forEach((b) => b.remove());
    };
  }, [ref, countAt]);
}
