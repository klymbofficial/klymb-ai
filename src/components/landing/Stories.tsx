"use client";

import { useEffect, useRef } from "react";
import { EASE, onceVisible, reduceMotion } from "./motion";
import { IconArrowRight, IconBadgeCheck, IconCircleCheck, IconStar, Photo, Stars, unsplash } from "./parts";

const REVIEWS = [
  { quote: "Fifteen minutes a day was enough. Three months later I was building AI tools for my own team.", role: "Working professional → AI lead", photo: "1758876201935-0d85989a52e2" },
  { quote: "The mentors answered every question. I never felt stuck or alone.", role: "Final-year student", photo: "1758600588375-f472270a98f9" },
  { quote: "I had zero coding background. The starting test put me exactly where I needed to be.", role: "Commerce graduate → Analyst", photo: "1758874573194-a98be0ed3ff5" },
  { quote: "The placement advice got me three interview calls in my first month.", role: "Job seeker → Data analyst", photo: "1758611972589-0012481178f9" },
  { quote: "Detailed feedback on my project, not just a pass or fail. That made the difference.", role: "Fresher → ML intern", photo: "1758270705518-b61b40527e76" },
  { quote: "My manager noticed the change in my work within weeks.", role: "Marketing professional", photo: "1758876020491-9560594ec362" },
];

const AVATARS = ["1758876201935-0d85989a52e2", "1758600588375-f472270a98f9", "1758874573194-a98be0ed3ff5", "1758611972589-0012481178f9"];

function Review({ r, copy }: { r: (typeof REVIEWS)[number]; copy?: boolean }) {
  return (
    <figure className="kl-review" aria-hidden={copy || undefined}>
      <div className="kl-review-top">
        <span className="kl-stars" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => <IconStar key={i} size={14} />)}
        </span>
        <blockquote>“{r.quote}”</blockquote>
      </div>
      <figcaption>
        <span className="kl-avatar">
          {/* eslint-disable-next-line @next/next/no-img-element -- a 48px Unsplash crop, already sized */}
          <img src={unsplash(r.photo, 160, true)} alt="" loading="lazy" decoding="async" />
        </span>
        <span className="kl-review-who">
          <strong>Learner name</strong>
          <span>{r.role}</span>
        </span>
        <IconBadgeCheck size={18} className="kl-review-badge" aria-label="Verified learner" aria-hidden={undefined} role="img" />
      </figcaption>
    </figure>
  );
}

/**
 * "Real learners. Real jobs." A featured story that rises into place, then
 * a row of reviews drifting left on a loop (paused under the pointer). The
 * row is two copies of the reviews, so sliding by exactly one copy loops
 * without a seam.
 */
export function Stories() {
  const feature = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = track.current;
    if (!t) return;
    if (reduceMotion()) {
      t.parentElement?.classList.add("is-still");
      return;
    }
    const a = t.animate([{ transform: "translateX(0)" }, { transform: "translateX(-50%)" }], { duration: 48000, iterations: Infinity, easing: "linear" });
    const pause = () => a.pause();
    const play = () => a.play();
    t.addEventListener("mouseenter", pause);
    t.addEventListener("mouseleave", play);
    return () => {
      a.cancel();
      t.removeEventListener("mouseenter", pause);
      t.removeEventListener("mouseleave", play);
    };
  }, []);

  useEffect(() => {
    const f = feature.current;
    if (!f || reduceMotion()) return;
    f.style.opacity = "0";
    const stop = onceVisible(f, 0.2, () => {
      f.style.opacity = "";
      f.animate([{ opacity: 0, transform: "translateY(50px) scale(.97)" }, { opacity: 1, transform: "none" }], { duration: 900, easing: EASE, fill: "backwards" });
    });
    return () => {
      stop();
      f.style.opacity = "";
    };
  }, []);

  return (
    <section id="stories" className="kl-stories" aria-labelledby="stories-title">
      <div className="kl-section-head">
        <h2 id="stories-title" className="kl-h2">
          Real learners. <em>Real jobs.</em>
        </h2>
        <div className="kl-proof">
          <span className="kl-avatars" aria-hidden="true">
            {AVATARS.map((id) => (
              // eslint-disable-next-line @next/next/no-img-element -- a 40px Unsplash crop, already sized
              <img key={id} src={unsplash(id, 120, true)} alt="" loading="lazy" decoding="async" />
            ))}
          </span>
          <span className="kl-proof-text">
            <Stars size={14} />
            <span>
              <strong>4.5/5</strong> from 2,000 learner reviews
            </span>
          </span>
        </div>
      </div>

      <figure ref={feature} className="kl-feature kl-dark">
        <div className="kl-feature-photo">
          <Photo src={unsplash("1758876201935-0d85989a52e2", 1200)} />
          <div className="kl-feature-chips">
            <span className="kl-feature-chip">Before: <strong>Fresh graduate</strong></span>
            <IconArrowRight size={18} strokeWidth={2.5} className="kl-feature-arrow" />
            <span className="kl-feature-chip kl-feature-chip--now">Now: <strong>AI analyst</strong></span>
          </div>
        </div>
        <div className="kl-feature-quote">
          <span className="kl-quote-mark" aria-hidden="true">“</span>
          <span className="kl-eyebrow-soft">Learner story</span>
          <blockquote>
            The capstone review told me exactly what a hiring manager would push back on. I fixed it <span>before my interview.</span>
          </blockquote>
          <figcaption>
            <span className="kl-feature-who">
              <strong>Learner name</strong>
              <span>AI analyst at company</span>
            </span>
            <span className="kl-verified">
              <IconCircleCheck size={14} />
              Verified learner
            </span>
          </figcaption>
        </div>
      </figure>

      <div className="kl-reviews">
        <div ref={track} className="kl-review-track">
          {REVIEWS.map((r) => <Review key={r.quote} r={r} />)}
          {REVIEWS.map((r) => <Review key={`copy-${r.quote}`} r={r} copy />)}
        </div>
      </div>
    </section>
  );
}
