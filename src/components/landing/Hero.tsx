"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { AccountLink } from "@/components/layout/AccountLink";
import { AmazonMark, Brand, GoogleMark, IconArrowRight, IconCheck, MicrosoftMark, Photo, Stars, unsplash } from "./parts";
import { C, EASE, countUp, reduceMotion } from "./motion";

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

function Pips() {
  return (
    <span className="kl-pips" data-pips="" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => <span key={i} />)}
    </span>
  );
}

export function Hero() {
  const h1 = useRef<HTMLHeadingElement>(null);
  const results = useRef<HTMLDivElement>(null);

  // The two headlines take turns: words blur out, the next set rises in and its red word is underlined.
  useEffect(() => {
    const h = h1.current;
    if (!h) return;
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

    // The first headline's entrance is CSS (landing.css), so it plays from the first paint.
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

  // The results card: tallies count up, the pips light in a chase, "+1"s float off the numbers, the live dot blinks (CSS).
  useEffect(() => {
    const card = results.current;
    if (!card) return;
    const counters = [...card.querySelectorAll<HTMLElement>("[data-count-to]")];
    if (reduceMotion()) {
      counters.forEach((n) => (n.textContent = n.dataset.countTo ?? ""));
      return;
    }
    const anims: Animation[] = [];
    const stops: (() => void)[] = [];
    const timers: number[] = [];

    // The numbers start at 0 in the HTML and always count up: 700ms into the card's fade-in (CSS, from 500ms), or at once if it is already in.
    const entrance = card.getAnimations().find((a) => a instanceof CSSAnimation);
    const elapsed = entrance && entrance.currentTime != null ? Number(entrance.currentTime) : 700;
    counters.forEach((n, k) => stops.push(countUp(n, Number(n.dataset.countTo), Math.max(0, 700 - elapsed) + k * 150, 1400)));

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
  }, []);

  return (
    <section className="kl-hero" aria-label="Introduction">
      <div className="kl-hero-stage">
        <div className="kl-hero-photo">
          <Photo src={unsplash("1758876020491-9560594ec362", 2000)} priority />
        </div>
        <div className="kl-hero-grid">
          <div className="kl-hero-left">
            <span className="kl-experts">
              <span className="kl-experts-label">Built by experts from</span>
              {/* Phones show the marks (one line); wider screens the full wordmarks. */}
              <span className="kl-logos kl-logos--marks">
                <AmazonMark />
                <GoogleMark />
                <MicrosoftMark />
              </span>
              <span className="kl-logos kl-logos--words">
                {/* eslint-disable-next-line @next/next/no-img-element -- the companies' own wordmarks, as in the design */}
                <img src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg" alt="Amazon" className="kl-logo-amazon" />
                {/* eslint-disable-next-line @next/next/no-img-element -- the companies' own wordmarks, as in the design */}
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" alt="Google" />
                {/* eslint-disable-next-line @next/next/no-img-element -- the companies' own wordmarks, as in the design */}
                <img src="https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg" alt="Microsoft" />
              </span>
            </span>

            <h1 ref={h1} className="kl-h1" aria-label="Upskill yourself in AI with Klymb. Get placed within the Klymb network.">
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

            <div className="kl-rating">
              <Stars size={20} />
              <span className="kl-rating-text">
                <strong>4.5/5</strong> from 2,000 learner reviews
              </span>
            </div>

            <div ref={results} className="kl-results">
              <div className="kl-results-head">
                <span className="kl-results-label">Results · Learners placed</span>
                <span className="kl-results-live">
                  <span className="kl-live-dot" />
                  Still counting
                </span>
              </div>
              <div className="kl-results-body">
                <div className="kl-results-col">
                  <span className="kl-region">USA</span>
                  <span className="kl-tally" data-tally="" aria-hidden="true">
                    <span data-count-to="15">0</span>+
                  </span>
                  <span className="sr-only">15+</span>
                  <span className="kl-results-note">placements</span>
                  <Pips />
                </div>
                <span className="kl-results-rule" aria-hidden="true" />
                <div className="kl-results-col">
                  <span className="kl-region kl-region--india">INDIA</span>
                  <span className="kl-tally kl-tally--india" data-tally="" aria-hidden="true">
                    <span data-count-to="200">0</span>+
                  </span>
                  <span className="sr-only">200+</span>
                  <span className="kl-results-note">placements</span>
                  <Pips />
                </div>
              </div>
            </div>

            <div className="kl-cta-row">
              <a href="#pricing" data-hero-cta="" className="kl-btn kl-btn-primary kl-hero-cta">
                Start your journey <IconArrowRight size={20} className="kl-hero-arrow" />
              </a>
              <AccountLink className="kl-btn kl-btn-secondary kl-hero-login" />
            </div>
          </div>

          <div className="kl-hero-right">
            <div className="kl-chip">
              <IconCheck size={18} strokeWidth={2.5} />
              Expert-led lessons
            </div>
            <div className="kl-chip">
              <IconCheck size={18} strokeWidth={2.5} />
              Job-oriented
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
