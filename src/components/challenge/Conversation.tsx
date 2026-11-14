"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { SkillChat, Turn } from "./claude-chats";

const REDUCED = "(prefers-reduced-motion: reduce)";
/** Phones: the two cards become one swipeable pair (claude-challenge.css uses the same width). */
const PHONE = "(max-width: 760px)";
const useMedia = (query: string) =>
  useSyncExternalStore(
    (cb) => { const m = window.matchMedia(query); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(query).matches,
    () => false,
  );
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** When each turn starts and finishes, in ms: you type, then Claude thinks, then answers. */
function timeline(chat: Turn[], delay: number) {
  let t = delay + 300;
  return chat.map((m) => {
    if (m.role === "user") {
      const start = t, end = t + clamp(m.text.length * 14, 500, 1300);
      t = end + 350;
      return { typing: start, start, end };
    }
    const typing = t, start = t + 800, end = start + clamp(m.text.length * 6, 900, 4200);
    t = end + 400;
    return { typing, start, end };
  });
}
/** Scrolls the phone's card pair to "before" (0) or "after" (1). */
function slide(el: HTMLElement | null, card: HTMLElement | null, i: number) {
  if (!el || !card) return;
  const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
  el.scrollTo({ left: i ? card.offsetLeft - pad : 0, behavior: "smooth" });
}
/** Phones: how long a finished skill stays on screen before the next one starts. */
const NEXT_PAUSE = 2800;
const lastEnd = (chat: Turn[], delay: number) => Math.max(...timeline(chat, delay).map((t) => t.end));

/** Text split on ``` fences: odd parts are code. */
const parts = (text: string) => text.split("```").map((s, i) => ({ code: i % 2 === 1, text: i % 2 === 1 ? s.replace(/^\n|\n$/g, "") : s.replace(/^\n+/, "") })).filter((p) => p.text);

/**
 * One side of a conversation. Every message is laid out from the start (the
 * part not yet typed is hidden), so the card never changes size as the chat
 * plays out. Where the chat has a fixed height (phones), it follows the
 * caret like a messaging app, until the reader scrolls it themselves.
 */
function Chat({ chat, delay, at, run }: { chat: Turn[]; delay: number; at: number; run: number }) {
  const box = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const lastRun = useRef(run);
  const times = timeline(chat, delay);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    if (lastRun.current !== run) { lastRun.current = run; follow.current = true; el.scrollTop = 0; }
    if (!follow.current || el.scrollHeight <= el.clientHeight) return;
    const mark = el.querySelector<HTMLElement>("[data-follow]");
    if (!mark) return;
    const bottom = mark.getBoundingClientRect().bottom - el.getBoundingClientRect().top + el.scrollTop;
    const target = bottom - el.clientHeight + 28;
    if (target > el.scrollTop) el.scrollTop = target;
  });

  const stop = () => { follow.current = false; };

  return (
    <div ref={box} className="kc-chat" aria-hidden="true" onWheel={stop} onTouchStart={stop}>
      {chat.map((m, i) => {
        const tl = times[i];
        const total = m.text.replace(/```/g, "").length;
        const shown = Math.round(clamp((at - tl.start) / (tl.end - tl.start), 0, 1) * total);
        const typing = m.role === "claude" && at >= tl.typing && at < tl.start;
        const streaming = at >= tl.start && shown < total;
        const live = at >= tl.start || typing;
        let left = shown;
        let placed = false;
        return (
          <div key={i} className={`kc-msg kc-msg--${m.role}`} style={{ visibility: live ? "visible" : "hidden" }}>
            {m.role === "claude" && <span className="kc-who">Claude</span>}
            <div className="kc-bubble">
              {typing && <span className="kc-dots" data-follow=""><i /><i /><i /></span>}
              {parts(m.text).map((p, j) => {
                const n = clamp(left, 0, p.text.length);
                const caret = streaming && !placed && left <= p.text.length;
                if (caret) placed = true;
                left -= p.text.length;
                const body = (
                  <>
                    {p.text.slice(0, n)}
                    {caret && <span className="kc-caret" data-follow="" />}
                    <span style={{ visibility: "hidden" }}>{p.text.slice(n)}</span>
                  </>
                );
                return p.code ? <code key={j} className="kc-codeblock">{body}</code> : <span key={j} className="kc-text">{body}</span>;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * The before and after cards for one skill, each a short chat that plays out
 * when the section scrolls into view and again whenever a tab is picked
 * (`runKey`). With reduced motion it is shown finished.
 *
 * On a wide screen the two cards sit side by side and play together. On a
 * phone they are one swipeable pair the height of a screen: "before" plays
 * first, then the pair slides over to "after" and that one plays, unless the
 * reader has already swiped or used the Before/After switch. The skill tabs
 * are hidden there, so the five skills play one after another: a strip shows
 * which one this is, its dot filling as it plays, and a tap on a dot jumps.
 * It stops moving on by itself once the reader has touched the cards.
 */
export function Conversation({ skill, runKey, names, onPick }: { skill: SkillChat; runKey: number; names: string[]; onPick: (i: number) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const afterCard = useRef<HTMLDivElement>(null);
  const touched = useRef(false);
  const reduced = useMedia(REDUCED);
  const phone = useMedia(PHONE);
  const [seen, setSeen] = useState(false);
  const [side, setSide] = useState(0);
  // The elapsed time of the run it belongs to; a new run (another tab) reads as 0 until its first tick.
  const [clock, setClock] = useState({ run: -1, t: 0 });

  useEffect(() => {
    const el = root.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);

  const afterDelay = phone ? lastEnd(skill.before.chat, 0) + 900 : 500;
  const end = Math.max(lastEnd(skill.after.chat, afterDelay), lastEnd(skill.before.chat, 0));

  const slideTo = (i: number) => slide(track.current, afterCard.current, i);

  // Each run starts from the "before" card.
  useEffect(() => {
    touched.current = false;
    track.current?.scrollTo({ left: 0, behavior: "instant" });
  }, [runKey]);

  useEffect(() => {
    if (!seen || reduced) return;
    let t0 = -1;
    let slid = false;
    const timer = setInterval(() => {
      const now = performance.now();
      if (t0 < 0) t0 = now;
      const t = now - t0;
      setClock({ run: runKey, t });
      if (phone && !slid && !touched.current && t >= afterDelay - 400) { slid = true; slide(track.current, afterCard.current, 1); }
      if (t > end + (phone ? NEXT_PAUSE : 200)) {
        clearInterval(timer);
        if (phone && !touched.current) onPick((runKey + 1) % names.length);
      }
    }, 40);
    return () => clearInterval(timer);
  }, [seen, reduced, phone, runKey, afterDelay, end, onPick, names.length]);

  const at = reduced ? Infinity : clock.run === runKey ? clock.t : 0;
  const done = at >= end;
  const transcript = (chat: Turn[]) => chat.map((m) => `${m.role === "user" ? "You" : "Claude"}: ${m.text.replace(/```/g, "")}`).join("\n");

  const onScroll = () => {
    const el = track.current, card = afterCard.current;
    if (el && card) setSide(el.scrollLeft > card.offsetLeft / 2 ? 1 : 0);
  };

  return (
    <div ref={root} id="kc-panel" role="tabpanel" aria-labelledby={`kc-tab-${runKey}`} className="kc-panel">
      <div className="kc-skillbar">
        <span className="kc-skillbar-name">{skill.name}<span className="kc-skillbar-count">{runKey + 1}/{names.length}</span></span>
        <span className="kc-skillbar-dots">
          {names.map((name, i) => (
            <button key={name} type="button" aria-label={name} aria-current={i === runKey ? "step" : undefined} className="kc-dot" onClick={() => onPick(i)}>
              {i === runKey && <span style={{ transform: `scaleX(${reduced ? 1 : clamp(at / (end + NEXT_PAUSE), 0, 1)})` }} />}
            </button>
          ))}
        </span>
      </div>
      <div className="kc-switch" aria-hidden="true">
        {["Before", "After"].map((label, i) => (
          <button key={label} type="button" tabIndex={-1} className="kc-switch-btn" data-on={side === i ? "" : undefined} onClick={() => { touched.current = true; slideTo(i); }}>
            {label}
          </button>
        ))}
        <span className="kc-switch-hint">Swipe to compare</span>
      </div>
      <div ref={track} className="kc-cards" onScroll={onScroll} onTouchStart={() => { touched.current = true; }}>
        <div className="kc-card kc-card--before">
          <span className="kc-eyebrow">Before</span>
          <span className="kc-card-title">{skill.before.title}</span>
          <Chat chat={skill.before.chat} delay={0} at={at} run={runKey} />
          <p className="sr-only">{transcript(skill.before.chat)}</p>
        </div>
        <div ref={afterCard} className="kc-card kc-card--after">
          <span className="kc-eyebrow">After · {skill.week}</span>
          <span className="kc-card-title">{skill.after.title}</span>
          <Chat chat={skill.after.chat} delay={afterDelay} at={at} run={runKey} />
          <p className="sr-only">{transcript(skill.after.chat)}</p>
          <span className="kc-proof" style={{ opacity: done ? 1 : 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
            {skill.after.proof}
          </span>
        </div>
      </div>
    </div>
  );
}
