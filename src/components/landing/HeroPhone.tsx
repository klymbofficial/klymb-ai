"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type MouseEvent, type PointerEvent } from "react";
import { Headline, Pips, useResultsMotion } from "./HeroParts";
import { reduceMotion } from "./motion";
import { AmazonMark, GoogleMark, IconArrowUpRight, IconCheck, MicrosoftMark, Photo, Stars, unsplash } from "./parts";
import { AVATARS } from "./Stories";

/** Where "Start your journey" takes you: the course library. */
const TARGET = "/courses";

/**
 * "Start your journey" as a slider: drag the knob across (or just tap) and
 * the red fills the track, the label turns to "Let's climb!" and it opens
 * the course library. It nudges every few seconds to show it moves, and
 * resets itself once you've gone.
 */
function SlideToStart() {
  const router = useRouter();
  const track = useRef<HTMLAnchorElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const knob = useRef<HTMLSpanElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const dragged = useRef(false);
  const busy = useRef(false);
  const timers = useRef<number[]>([]);

  const span = () => {
    const t = track.current;
    const k = knob.current;
    return t && k ? t.clientWidth - k.offsetWidth - 8 : 0;
  };

  const place = (x: number, max: number) => {
    if (knob.current) knob.current.style.transform = `translateX(${x}px)`;
    if (fill.current) fill.current.style.width = `${x + 60}px`;
    if (label.current) label.current.style.opacity = String(max ? 1 - x / max : 1);
  };

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const reset = () => {
    const k = knob.current;
    const f = fill.current;
    const l = label.current;
    if (!k || !f || !l) return;
    k.style.transition = f.style.transition = "none";
    l.style.transition = "none";
    l.classList.remove("is-done");
    place(0, span());
    busy.current = false;
  };

  const done = () => {
    busy.current = true;
    later(() => {
      label.current?.classList.add("is-done");
      if (label.current) {
        label.current.style.transition = "opacity .3s";
        label.current.style.opacity = "1";
      }
    }, 450);
    later(() => router.push(TARGET), 700);
    later(reset, 2600);
  };

  const grab = (e: PointerEvent<HTMLSpanElement>) => {
    const t = track.current;
    const k = knob.current;
    const f = fill.current;
    if (!t || !k || !f || busy.current) return;
    e.preventDefault();
    dragged.current = false;
    const max = span();
    const x0 = e.clientX;
    k.style.transition = f.style.transition = "none";
    k.setPointerCapture(e.pointerId);
    const move = (ev: globalThis.PointerEvent) => {
      const x = Math.max(0, Math.min(max, ev.clientX - x0));
      if (x > 4) dragged.current = true;
      place(x, max);
    };
    const up = (ev: globalThis.PointerEvent) => {
      k.removeEventListener("pointermove", move);
      k.removeEventListener("pointerup", up);
      k.removeEventListener("pointercancel", up);
      const x = Math.max(0, Math.min(max, ev.clientX - x0));
      if (x > max * 0.7) {
        place(max, max);
        done();
      } else {
        k.animate([{ transform: `translateX(${x}px)` }, { transform: "translateX(0)" }], { duration: 300, easing: "cubic-bezier(.2,.9,.3,1.2)" });
        place(0, max);
      }
    };
    k.addEventListener("pointermove", move);
    k.addEventListener("pointerup", up);
    k.addEventListener("pointercancel", up);
  };

  // A tap (or Enter) slides it across for you.
  const go = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    e.stopPropagation(); // the glide happens after the slide, not at once
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    if (busy.current) return;
    const k = knob.current;
    const f = fill.current;
    if (!k || !f) return;
    k.style.transition = f.style.transition = "transform .5s cubic-bezier(.7,0,.2,1), width .5s cubic-bezier(.7,0,.2,1)";
    if (label.current) label.current.style.transition = "opacity .3s";
    place(span(), span());
    f.style.width = "100%";
    done();
  };

  // Every few seconds the knob nudges right, to show it slides.
  useEffect(() => {
    const k = knob.current;
    if (!k || reduceMotion() || k.offsetParent === null) return;
    const nudge = () => {
      if (dragged.current || busy.current) return;
      k.animate(
        [{ transform: "translateX(0)" }, { transform: "translateX(26px)" }, { transform: "translateX(0)" }, { transform: "translateX(12px)" }, { transform: "translateX(0)" }],
        { duration: 1100, easing: "ease-in-out" },
      );
    };
    const first = window.setTimeout(nudge, 2000);
    const every = window.setInterval(nudge, 3600);
    const pending = timers.current;
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
      pending.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <a ref={track} href={TARGET} className="kl-slide" aria-label="Start your journey" onClick={go}>
      <span ref={fill} className="kl-slide-fill" aria-hidden="true" />
      <span ref={label} className="kl-slide-label" aria-hidden="true">
        <span className="kl-slide-go">
          Start your journey<span className="kl-slide-hint">· slide</span>
        </span>
        <span className="kl-slide-done">Let’s climb!</span>
      </span>
      <span ref={knob} className="kl-slide-knob" onPointerDown={grab} aria-hidden="true">
        <IconArrowUpRight size={22} strokeWidth={2.6} />
      </span>
    </a>
  );
}

/**
 * The hero on phones (Claude Design "Klymb Hero Mobile"): the photo fills the
 * top half and steps down like a staircase as it wipes in, with the two
 * chips and a compact placement card over it; below, the headline, the
 * rating and the slide-to-start control. It is exactly one screen tall.
 */
export function HeroPhone() {
  const results = useRef<HTMLDivElement>(null);
  // The card fades in from 1.2s (CSS); its numbers start counting at 1.3s.
  useResultsMotion(results, 1300);

  return (
    <section className="kl-hero-phone" data-hero="" aria-label="Introduction">
      <div className="kl-hp-media">
        <div className="kl-hp-photo">
          <Photo src={unsplash("1758876020491-9560594ec362", 900)} />
        </div>
        <span className="kl-hp-chip kl-hp-chip--a">
          <IconCheck size={14} strokeWidth={3} />
          Expert-led lessons
        </span>
        <span className="kl-hp-chip kl-hp-chip--b">
          <IconCheck size={14} strokeWidth={3} />
          Job-oriented
        </span>
        <div ref={results} className="kl-hp-results">
          <span className="kl-hp-results-head">
            <span className="kl-hp-results-label">Learners placed</span>
            <span className="kl-hp-live">
              <span className="kl-live-dot" />
              Still counting
            </span>
          </span>
          <span className="kl-hp-results-body">
            <span className="kl-hp-col">
              <span className="kl-hp-region">USA</span>
              <span className="kl-hp-tally" data-tally="" aria-hidden="true">
                <span data-count-to="15">0</span>+
              </span>
              <span className="sr-only">15+ placements in the USA</span>
              <Pips />
            </span>
            <span className="kl-hp-rule" aria-hidden="true" />
            <span className="kl-hp-col">
              <span className="kl-hp-region">INDIA</span>
              <span className="kl-hp-tally kl-hp-tally--india" data-tally="" aria-hidden="true">
                <span data-count-to="200">0</span>+
              </span>
              <span className="sr-only">200+ placements in India</span>
              <Pips />
            </span>
          </span>
        </div>
      </div>

      <div className="kl-hp-body">
        <span className="kl-hp-experts">
          Built by experts from
          <span className="kl-hp-marks">
            <AmazonMark size={18} />
            <GoogleMark size={15} />
            <MicrosoftMark size={14} />
          </span>
        </span>
        <Headline className="kl-h1 kl-hp-h1" />
        <span className="kl-hp-rating">
          <Stars size={14} />
          <span>
            <strong>4.5/5</strong> from 2,000 learner reviews
          </span>
        </span>
        <div className="kl-hp-cta">
          <SlideToStart />
          <span className="kl-hp-join">
            <span className="kl-hp-avatars" aria-hidden="true">
              {AVATARS.map((r) => (
                // eslint-disable-next-line @next/next/no-img-element -- a 24px Unsplash crop, already sized
                <img key={r.name} src={unsplash(r.photo, 80, r.face)} alt="" loading="lazy" decoding="async" />
              ))}
            </span>
            Join 2,000+ learners already climbing
          </span>
        </div>
      </div>
    </section>
  );
}
