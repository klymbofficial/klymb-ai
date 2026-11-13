"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { EASE, countUp, onceVisible, reduceMotion } from "./motion";
import { IconArrowRight, IconCheck, IconShieldCheck } from "./parts";

function Tick({ red }: { red?: boolean }) {
  return (
    <span className={red ? "kl-tick kl-tick--red" : "kl-tick"}>
      <IconCheck size={12} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
    </span>
  );
}

/**
 * "Pick your plan." Two cards deal in tilted from below, and both prices
 * count up from zero. The "Most popular" sticker rocks gently.
 */
export function Plans() {
  const wrap = useRef<HTMLDivElement>(null);
  const sticker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const w = wrap.current;
    if (!w || reduceMotion()) return;
    const anims: Animation[] = [];
    const stops: (() => void)[] = [];
    if (sticker.current) {
      anims.push(
        sticker.current.animate([{ transform: "rotate(-12deg)" }, { transform: "rotate(-4deg)" }, { transform: "rotate(-12deg)" }], {
          duration: 3000,
          iterations: Infinity,
          easing: "ease-in-out",
        }),
      );
    }
    const plans = [...w.querySelectorAll<HTMLElement>("[data-plan]")];
    const nums = [...w.querySelectorAll<HTMLElement>("[data-count]")];
    plans.forEach((p) => (p.style.opacity = "0"));
    const stop = onceVisible(w, 0.3, () => {
      plans.forEach((p, k) => {
        p.style.opacity = "";
        p.animate([{ opacity: 0, transform: `translateY(60px) rotate(${k ? 2 : -2}deg)` }, { opacity: 1, transform: "none" }], {
          duration: 900,
          delay: k * 160,
          easing: EASE,
          fill: "backwards",
        });
      });
      nums.forEach((n, k) => stops.push(countUp(n, Number(n.dataset.count), 250 + k * 160, 1100)));
    });
    return () => {
      stop();
      anims.forEach((a) => a.cancel());
      stops.forEach((s) => s());
      plans.forEach((p) => (p.style.opacity = ""));
    };
  }, []);

  return (
    <section id="pricing" className="kl-pricing" aria-labelledby="pricing-title">
      <div className="kl-section-head" data-reveal="">
        <h2 id="pricing-title" className="kl-h2">
          Pick your <em>plan.</em>
        </h2>
        <span className="kl-badge">
          <IconShieldCheck size={16} />
          Every plan: 100% money back
        </span>
      </div>

      <div ref={wrap} className="kl-plans">
        <div data-plan="" className="kl-plan kl-plan--single">
          <div className="kl-plan-head">
            <span className="kl-kicker">01 · Single course</span>
            <span className="kl-plan-sub">Learn one skill, end to end.</span>
          </div>
          <div className="kl-price">
            <span className="kl-price-cur">₹</span>
            <span className="kl-price-num" data-count="499">499</span>
            <span className="kl-price-per">one-time<br />payment</span>
          </div>
          <ul className="kl-plan-list">
            <li><Tick />One course of your choice</li>
            <li><Tick />All lessons and assessments</li>
            <li><Tick />AI-reviewed capstone</li>
            <li><Tick />Verified certificate</li>
          </ul>
          <Link href="/courses" className="kl-btn kl-btn-secondary kl-plan-cta">
            Buy for ₹499 <IconArrowRight size={18} />
          </Link>
        </div>

        <div data-plan="" className="kl-plan kl-plan--all">
          <div className="kl-plan-glow" aria-hidden="true" />
          <div className="kl-plan-body">
            <div className="kl-plan-top">
              <div className="kl-plan-head">
                <span className="kl-kicker">02 · All-access</span>
                <span className="kl-plan-sub">Everything, plus help getting hired.</span>
              </div>
              <span ref={sticker} className="kl-sticker">Most<br />popular</span>
            </div>
            <div className="kl-price">
              <span className="kl-price-cur">₹</span>
              <span className="kl-price-num" data-count="2999">2999</span>
              <span className="kl-price-per">per<br />month</span>
            </div>
            <ul className="kl-plan-list">
              <li><Tick />Every course on Klymb</li>
              <li><Tick />Unlimited AI-reviewed capstones</li>
              <li><Tick red /><strong className="kl-semibold">Placement advice</strong><span className="kl-included">Included</span></li>
              <li><Tick red /><strong className="kl-semibold">1:1 career guidance</strong><span className="kl-included">Included</span></li>
            </ul>
            <Link href="/courses" className="kl-btn kl-btn-primary kl-plan-cta">
              Get all-access <IconArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
