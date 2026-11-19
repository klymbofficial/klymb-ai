"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Countdown } from "./Countdown";

type Props = {
  name: string;
  headline: string;
  sub: string;
  prizePool: string;
  countdown: { targetIso: string; label: string } | null;
  cta: { href: string; label: string } | null;
  /** Opens the padlock: the visitor has a team. */
  registered: boolean;
  /** What the padlock says on hover, focus or tap. */
  message: ReactNode;
};

const CELLS = [
  { c: 1, r: 1, kind: "soft" }, { c: 2, r: 1, kind: "faint" }, { c: 3, r: 2, kind: "soft" }, { c: 7, r: 1, kind: "faint" },
  { c: 10, r: 1, kind: "soft" }, { c: 12, r: 2, kind: "faint" }, { c: 2, r: 4, kind: "soft" }, { c: 5, r: 5, kind: "faint" },
  { c: 9, r: 5, kind: "soft" }, { c: 13, r: 4, kind: "faint" }, { c: 12, r: 6, kind: "soft" }, { c: 4, r: 6, kind: "faint" },
] as const;

const LINES = [
  "M0 180H159L261 246H524L546 282H780",
  "M0 209H44L128 150H283L503 328H780",
  "M0 242H137L234 311H780",
  "M0 328H73L213 218H780",
  "M830 218H1364L1459 288H1611",
  "M860 262H986L1117 338H1282L1349 259H1611",
  "M830 308H1019L1192 164H1451L1539 224H1611",
  "M830 334H1068L1156 262H1305L1402 334H1611",
];
/** Sparks run outward from the lock along the same lines. */
const SPARKS = [
  { reverse: true, dur: 5.4, delay: 0 }, { reverse: true, dur: 6.1, delay: 1.3 }, { reverse: true, dur: 4.8, delay: 2.6 }, { reverse: true, dur: 5.7, delay: 0.7 },
  { reverse: false, dur: 5.1, delay: 0.35 }, { reverse: false, dur: 5.9, delay: 2.1 }, { reverse: false, dur: 6.3, delay: 1 }, { reverse: false, dur: 5.5, delay: 3.1 },
];

/**
 * The hackathon's first screen: a grid background, the headline, a countdown
 * and the call to action, over a circuit scene with a padlock in the middle.
 * The padlock opens once the visitor is registered, and explains itself on
 * hover, focus or tap.
 */
export function Hero({ name, headline, sub, prizePool, countdown, cta, registered, message }: Props) {
  const heroRef = useRef<HTMLElement | null>(null);
  const bgRef = useRef<HTMLDivElement | null>(null);
  const lockRef = useRef<HTMLButtonElement | null>(null);
  const [msgOpen, setMsgOpen] = useState(false);

  // The grid fades out from the padlock's bottom edge down.
  useEffect(() => {
    const hero = heroRef.current, bg = bgRef.current, lock = lockRef.current;
    if (!hero || !bg || !lock) return;
    function syncFade() {
      const h = hero!.getBoundingClientRect(), l = lock!.getBoundingClientRect();
      if (!h.height) return;
      const pct = ((l.bottom - h.top) / h.height) * 100;
      bg!.style.setProperty("--hk-fade-start", `${Math.max(0, Math.min(100, pct)).toFixed(2)}%`);
    }
    syncFade();
    const ro = new ResizeObserver(syncFade);
    ro.observe(hero);
    window.addEventListener("resize", syncFade);
    return () => { ro.disconnect(); window.removeEventListener("resize", syncFade); };
  }, [msgOpen]);

  useEffect(() => {
    if (!msgOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setMsgOpen(false); lockRef.current?.blur(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [msgOpen]);

  const finePointer = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  return (
    <section className={`hk-hero${msgOpen ? " is-msg-open" : ""}`} aria-labelledby="hk-hero-title" ref={heroRef}>
      <div className="hk-hero__bg" aria-hidden="true" ref={bgRef}>
        <div className="hk-hero__lines" />
        <div className="hk-hero__cells">
          {CELLS.map((cell, i) => (
            <i key={i} className={`hk-cell hk-cell--${cell.kind}`} style={{ "--c": String(cell.c), "--r": String(cell.r) } as CSSProperties} />
          ))}
        </div>
      </div>

      <div className="hk-hero__head">
        {prizePool && (
          <p className="hk-prize"><span className="hk-prize__label">Prize pool</span><span className="hk-prize__value">up to {prizePool}</span></p>
        )}
        <h1 className="hk-hero__title" id="hk-hero-title"><em>{name}</em> {headline}</h1>
        <p className="hk-hero__sub">{sub}</p>

        {countdown && <Countdown targetIso={countdown.targetIso} label={countdown.label} />}

        <div className="hk-cta">
          {cta && <Link className="hk-btn hk-btn--primary" href={cta.href}>{cta.label}</Link>}
          <a className="hk-btn hk-btn--ghost" href="#hk-how">
            Learn more
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12h15M13 6l6 6-6 6" /></svg>
          </a>
        </div>
      </div>

      <div className="hk-hero__stage">
        <div className="hk-hero__scene">
          <svg className="hk-circuit" viewBox="0 0 1611 393" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <g fill="none" stroke="currentColor" strokeWidth="1.3" vectorEffect="non-scaling-stroke">
              {LINES.map((d) => <path key={d} d={d} />)}
            </g>
          </svg>
          <svg className="hk-circuit hk-sparks" viewBox="0 0 1611 393" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            {SPARKS.map((p, i) => (
              <circle
                key={i}
                className="hk-spark"
                r={3.2}
                style={{ "--path": `path('${LINES[i]}')`, "--dir": p.reverse ? "reverse" : undefined, "--dur": `${p.dur}s`, "--delay": `${p.delay}s` } as CSSProperties}
              />
            ))}
          </svg>
        </div>

        <div className="hk-hero__lock-stage">
          <button
            className="hk-lock-btn"
            type="button"
            data-state={registered ? "unlocked" : "locked"}
            aria-describedby="hk-lock-msg"
            aria-expanded={msgOpen}
            aria-label={registered ? "You're registered." : "Why register?"}
            ref={lockRef}
            onPointerEnter={(e) => { if (e.pointerType === "mouse" && finePointer()) setMsgOpen(true); }}
            onFocus={() => { if (finePointer()) setMsgOpen(true); }}
            onClick={(e) => { e.preventDefault(); setMsgOpen(finePointer() ? true : !msgOpen); }}
          >
        <svg
          className="hk-lock"
          viewBox="0 0 340 324"
          aria-hidden
          focusable="false"
        >
          <defs>
            <linearGradient
              id="hkShackle"
              gradientUnits="userSpaceOnUse"
              x1="67"
              y1="0"
              x2="273"
              y2="0"
            >
              <stop offset="0%" stopColor="#6E747A" />
              <stop offset="3%" stopColor="#9AA1A7" />
              <stop offset="8.3%" stopColor="#FAFCFD" />
              <stop offset="12%" stopColor="#E2E7EA" />
              <stop offset="17%" stopColor="#AEB5BB" />
              <stop offset="24%" stopColor="#868D94" />
              <stop offset="38%" stopColor="#767D84" />
              <stop offset="50%" stopColor="#8B9299" />
              <stop offset="62%" stopColor="#767D84" />
              <stop offset="76%" stopColor="#868D94" />
              <stop offset="83%" stopColor="#AEB5BB" />
              <stop offset="88%" stopColor="#E2E7EA" />
              <stop offset="91.7%" stopColor="#FAFCFD" />
              <stop offset="97%" stopColor="#9AA1A7" />
              <stop offset="100%" stopColor="#6E747A" />
            </linearGradient>
            <linearGradient
              id="hkShackleRim"
              gradientUnits="userSpaceOnUse"
              x1="67"
              y1="0"
              x2="273"
              y2="0"
            >
              <stop offset="0%" stopColor="#4A5057" />
              <stop offset="50%" stopColor="#5E656C" />
              <stop offset="100%" stopColor="#464C53" />
            </linearGradient>
            <linearGradient
              id="hkSpec"
              gradientUnits="userSpaceOnUse"
              x1="60"
              y1="0"
              x2="290"
              y2="0"
            >
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".85" />
              <stop offset="30%" stopColor="#FFFFFF" stopOpacity=".18" />
              <stop offset="70%" stopColor="#FFFFFF" stopOpacity=".10" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity=".35" />
            </linearGradient>
            <linearGradient id="hkPlate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FBFCFD" />
              <stop offset="16%" stopColor="#E4E8EB" />
              <stop offset="46%" stopColor="#C3C9CE" />
              <stop offset="78%" stopColor="#A0A7AD" />
              <stop offset="100%" stopColor="#7C8389" />
            </linearGradient>
            <linearGradient id="hkPlateSide" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3B4147" stopOpacity=".40" />
              <stop offset="12%" stopColor="#3B4147" stopOpacity="0" />
              <stop offset="88%" stopColor="#3B4147" stopOpacity="0" />
              <stop offset="100%" stopColor="#3B4147" stopOpacity=".40" />
            </linearGradient>
            <linearGradient id="hkBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3D3F43" />
              <stop offset="22%" stopColor="#2A2C30" />
              <stop offset="62%" stopColor="#1D1F22" />
              <stop offset="100%" stopColor="#0D0E10" />
            </linearGradient>
            <linearGradient id="hkSide" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6A6E74" />
              <stop offset="45%" stopColor="#4C5056" />
              <stop offset="100%" stopColor="#33373C" />
            </linearGradient>
            <linearGradient id="hkSideR" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#33373C" />
              <stop offset="55%" stopColor="#4C5056" />
              <stop offset="100%" stopColor="#5C6066" />
            </linearGradient>
            <linearGradient id="hkAO" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#000000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000000" stopOpacity=".55" />
            </linearGradient>
            <radialGradient id="hkSheen" cx="34%" cy="18%" r="78%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".14" />
              <stop offset="55%" stopColor="#FFFFFF" stopOpacity=".03" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
            <pattern
              id="hkBrush"
              width="3"
              height="6"
              patternUnits="userSpaceOnUse"
            >
              <rect width="1" height="6" fill="#FFFFFF" opacity=".05" />
              <rect x="2" width="1" height="6" fill="#000000" opacity=".07" />
            </pattern>
            <filter
              id="hkBlurLg"
              x="-30%"
              y="-60%"
              width="160%"
              height="260%"
            >
              <feGaussianBlur stdDeviation="7" />
            </filter>
            <filter
              id="hkBlurSm"
              x="-60%"
              y="-120%"
              width="220%"
              height="380%"
            >
              <feGaussianBlur stdDeviation="3" />
            </filter>
            <clipPath id="hkBodyClip">
              <rect x="10" y="178" width="320" height="130" rx="13" />
            </clipPath>
          </defs>

          <ellipse
            cx="172"
            cy="313"
            rx="126"
            ry="11"
            fill="#0F172A"
            opacity=".22"
            filter="url(#hkBlurLg)"
          />

          <g className="hk-lock__shackle">
            <path
              d="M84 192V109a86 86 0 0 1 172 0v83"
              fill="none"
              stroke="url(#hkShackleRim)"
              strokeWidth="39"
            />
            <path
              d="M84 192V109a86 86 0 0 1 172 0v83"
              fill="none"
              stroke="url(#hkShackle)"
              strokeWidth="33"
            />
            <path
              d="M100.5 192V109a69.5 69.5 0 0 1 139 0v83"
              fill="none"
              stroke="#2E343A"
              strokeWidth="4.5"
              opacity=".42"
            />
            <path
              d="M71 192V109a99 99 0 0 1 198 0v83"
              fill="none"
              stroke="url(#hkSpec)"
              strokeWidth="3.4"
            />
          </g>

          <g clipPath="url(#hkBodyClip)">
            <rect x="10" y="178" width="320" height="130" fill="url(#hkBody)" />
            <rect x="10" y="178" width="54" height="130" fill="url(#hkSide)" />
            <rect x="276" y="178" width="54" height="130" fill="url(#hkSideR)" />
            <rect x="58" y="178" width="7" height="130" fill="#08090A" opacity=".85" />
            <rect x="275" y="178" width="7" height="130" fill="#08090A" opacity=".85" />
            <rect x="10" y="178" width="320" height="130" fill="url(#hkBrush)" opacity=".55" />
            <rect x="10" y="178" width="320" height="130" fill="url(#hkSheen)" />
            <rect x="10" y="248" width="320" height="60" fill="url(#hkAO)" />
            <rect x="10" y="178" width="320" height="3.5" fill="#8A8E94" opacity=".55" />
            <rect x="10" y="303" width="320" height="3" fill="#4A4E54" opacity=".5" />
          </g>
          <rect
            x="10.6"
            y="178.6"
            width="318.8"
            height="128.8"
            rx="12.6"
            fill="none"
            stroke="#000000"
            opacity=".45"
          />

          <rect x="6" y="146" width="328" height="46" rx="13" fill="url(#hkPlate)" />
          <rect x="6" y="146" width="328" height="46" rx="13" fill="url(#hkPlateSide)" />
          <rect x="9" y="147.5" width="322" height="5" rx="2.5" fill="#FDFEFE" opacity=".92" />
          <rect x="8" y="183" width="324" height="8" rx="4" fill="#6E747A" opacity=".5" />
          <ellipse cx="84" cy="150" rx="23" ry="6" fill="#0B0E12" opacity=".38" filter="url(#hkBlurSm)" />
          <ellipse cx="256" cy="150" rx="23" ry="6" fill="#0B0E12" opacity=".38" filter="url(#hkBlurSm)" />
          <rect x="12" y="190" width="316" height="12" fill="#000000" opacity=".38" filter="url(#hkBlurSm)" clipPath="url(#hkBodyClip)" />

          <g className="hk-lock__leds">
            <g>
              <circle cx="134" cy="243" r="7" fill="#08090A" opacity=".8" />
              <circle cx="134" cy="243" r="5" />
            </g>
            <g>
              <circle cx="158" cy="243" r="7" fill="#08090A" opacity=".8" />
              <circle cx="158" cy="243" r="5" />
            </g>
            <g>
              <circle cx="182" cy="243" r="7" fill="#08090A" opacity=".8" />
              <circle cx="182" cy="243" r="5" />
            </g>
            <g>
              <circle cx="206" cy="243" r="7" fill="#08090A" opacity=".8" />
              <circle cx="206" cy="243" r="5" />
            </g>
          </g>
        </svg>
          </button>

          <div className="hk-lock-msg" id="hk-lock-msg" role="note">
            <span className="hk-lock-msg__badge" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <rect x="4" y="10.5" width="16" height="10.5" rx="2.4" />
                <path d={registered ? "M8 10.5V7.6a4 4 0 0 1 7.6-1.7" : "M8 10.5V7.6a4 4 0 0 1 8 0v2.9"} />
              </svg>
            </span>
            <div className="hk-lock-msg__text">{message}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
