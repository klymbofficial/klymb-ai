"use client";

import { useEffect, useRef } from "react";
import { EASE, onceVisible, reduceMotion } from "./motion";
import { IconArrowRight, IconBadgeCheck, IconCircleCheck, IconStar, Photo, Stars, unsplash, type Face } from "./parts";

/*
 * Mock learners for the demo: made-up names and lines, each on one face cut
 * from the design's Unsplash photos. Replace with real reviews before this
 * goes live.
 */
interface Review { quote: string; name: string; role: string; photo: string; face: Face }

const REVIEWS: Review[] = [
  { quote: "Fifteen minutes a day was enough. Three months later I was building AI tools for my own team.", name: "Daniel Carter", role: "Operations manager → AI lead, Chicago", photo: "1758270705518-b61b40527e76", face: { x: 0.29, y: 0.16, z: 3.2 } },
  { quote: "The mentors answered every question. I never felt stuck or alone.", name: "Liam O'Connor", role: "Final-year student, Boston", photo: "1758600588375-f472270a98f9", face: { x: 0.56, y: 0.3, z: 2.4 } },
  { quote: "I had zero coding background. The starting test put me exactly where I needed to be.", name: "Marcus Reed", role: "Business graduate → Analyst, Houston", photo: "1758874573194-a98be0ed3ff5", face: { x: 0.43, y: 0.28, z: 2.6 } },
  { quote: "The placement advice got me three interview calls in my first month.", name: "Nia Thompson", role: "Job seeker → Data analyst, New York", photo: "1758611972589-0012481178f9", face: { x: 0.4, y: 0.36, z: 2.2 } },
  { quote: "Detailed feedback on my project, not just a pass or fail. That made the difference.", name: "Rohan Mehta", role: "Fresher → ML intern, Pune", photo: "1758270705518-b61b40527e76", face: { x: 0.665, y: 0.5, z: 3.4 } },
  { quote: "My manager noticed the change in my work within weeks.", name: "Elena Ruiz", role: "Marketing manager, Austin", photo: "1758876020491-9560594ec362", face: { x: 0.42, y: 0.25, z: 2.6 } },
];

/** The featured story's learner (the full photo beside the quote). */
const FEATURED = { name: "Amara Johnson", role: "AI analyst at a health-tech startup, Atlanta" };

/** The faces stacked beside the rating: the first four reviewers. */
const AVATARS = REVIEWS.slice(0, 4);

function ReviewCard({ r, copy }: { r: Review; copy?: boolean }) {
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
          <img src={unsplash(r.photo, 160, r.face)} alt="" loading="lazy" decoding="async" />
        </span>
        <span className="kl-review-who">
          <strong>{r.name}</strong>
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
      <div className="kl-section-head" data-reveal="">
        <h2 id="stories-title" className="kl-h2">
          Real learners. <em>Real jobs.</em>
        </h2>
        <div className="kl-proof">
          <span className="kl-avatars" aria-hidden="true">
            {AVATARS.map((r) => (
              // eslint-disable-next-line @next/next/no-img-element -- a 40px Unsplash crop, already sized
              <img key={r.name} src={unsplash(r.photo, 120, r.face)} alt="" loading="lazy" decoding="async" />
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
              <strong>{FEATURED.name}</strong>
              <span>{FEATURED.role}</span>
            </span>
            <span className="kl-verified">
              <IconCircleCheck size={14} />
              Verified learner
            </span>
          </figcaption>
        </div>
      </figure>

      <div className="kl-reviews" data-reveal="">
        <div ref={track} className="kl-review-track">
          {REVIEWS.map((r) => <ReviewCard key={r.name} r={r} />)}
          {REVIEWS.map((r) => <ReviewCard key={`copy-${r.name}`} r={r} copy />)}
        </div>
      </div>
    </section>
  );
}
