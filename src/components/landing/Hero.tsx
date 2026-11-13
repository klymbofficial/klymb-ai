"use client";

import { useRef } from "react";
import { AccountLink } from "@/components/layout/AccountLink";
import { Headline, Pips, useResultsMotion } from "./HeroParts";
import { IconArrowRight, IconCheck, Photo, Stars, unsplash } from "./parts";

/**
 * The hero on tablets and desktops (phones get HeroPhone). It fills exactly
 * one screen under the nav; the photo runs off the right edge.
 */
export function Hero() {
  const results = useRef<HTMLDivElement>(null);
  // The card fades in from 500ms (CSS); its numbers start counting at 700ms.
  useResultsMotion(results, 700);

  return (
    <section className="kl-hero" data-hero="" aria-label="Introduction">
      <div className="kl-hero-stage">
        <div className="kl-hero-photo">
          <Photo src={unsplash("1758876020491-9560594ec362", 2000)} priority />
        </div>
        <div className="kl-hero-grid">
          <div className="kl-hero-left">
            <span className="kl-experts">
              <span className="kl-experts-label">Built by experts from</span>
              <span className="kl-logos">
                {/* eslint-disable-next-line @next/next/no-img-element -- the companies' own wordmarks, as in the design */}
                <img src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg" alt="Amazon" className="kl-logo-amazon" />
                {/* eslint-disable-next-line @next/next/no-img-element -- the companies' own wordmarks, as in the design */}
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" alt="Google" />
                {/* eslint-disable-next-line @next/next/no-img-element -- the companies' own wordmarks, as in the design */}
                <img src="https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg" alt="Microsoft" />
              </span>
            </span>

            <Headline className="kl-h1" />

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
              <a href="#pricing" className="kl-btn kl-btn-primary kl-hero-cta">
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
