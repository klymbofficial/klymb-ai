"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { EASE, onceVisible, reduceMotion } from "./motion";
import { IconArrowUpRight } from "./parts";

/**
 * The closing red banner. "Upskill / yourself / in AI." is set as a
 * staircase; the lines climb in one after another and the arrow keeps
 * nudging up and to the right.
 */
export function CloseBanner() {
  const head = useRef<HTMLHeadingElement>(null);
  const arrow = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const h = head.current;
    if (!h || reduceMotion()) return;
    const lines = [...h.querySelectorAll<HTMLElement>("[data-climb]")];
    const anims: Animation[] = [];
    lines.forEach((l) => (l.style.opacity = "0"));
    const stop = onceVisible(h, 0.35, () => {
      lines.forEach((l, k) => {
        l.style.opacity = "";
        l.animate([{ opacity: 0, transform: "translate(-0.6em,0.7em)" }, { opacity: 1, transform: "none" }], { duration: 800, delay: k * 220, easing: EASE, fill: "backwards" });
      });
      if (arrow.current) {
        anims.push(
          arrow.current.animate([{ transform: "translate(0,0)" }, { transform: "translate(0.12em,-0.12em)" }, { transform: "translate(0,0)" }], {
            duration: 1600,
            delay: 1200,
            iterations: Infinity,
            easing: "ease-in-out",
          }),
        );
      }
    });
    return () => {
      stop();
      anims.forEach((a) => a.cancel());
      lines.forEach((l) => (l.style.opacity = ""));
    };
  }, []);

  return (
    <section id="close" className="kl-close" aria-labelledby="close-title">
      <div className="kl-close-inner">
        <div className="kl-close-eyebrow" data-reveal="">Your next step</div>
        <h2 ref={head} id="close-title" aria-label="Upskill yourself in AI.">
          <span data-climb="" className="kl-climb" style={{ "--n": 0 } as CSSProperties} aria-hidden="true">
            <span>Upskill</span>
          </span>
          <span data-climb="" className="kl-climb" style={{ "--n": 1 } as CSSProperties} aria-hidden="true">
            <span>yourself</span>
          </span>
          <span data-climb="" className="kl-climb kl-climb--last" style={{ "--n": 2 } as CSSProperties} aria-hidden="true">
            <span>in</span>
            <em>AI.</em>
            <IconArrowUpRight ref={arrow} className="kl-climb-arrow" />
          </span>
        </h2>
      </div>
    </section>
  );
}
