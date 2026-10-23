"use client";

import { Mascot } from "page-mascot";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { CourseState } from "@/lib/course-app";
import { Icon } from "../icons";
import { track } from "../track";
import type { Act } from "../useCourseApp";

/** `target`: selectors tried in order; the first one on the page is highlighted. */
type Stop = { target: string; text: string };

const STOPS: Record<CourseState["lang"], Stop[]> = {
  en: [
    { target: '[data-tour="path"]', text: "This bar is today’s path. Each step opens after the one before it, and you can tap a finished one to go back." },
    { target: "#lesson-start, #lesson-call, #lesson-watch", text: "Every day starts here: you make your call first, then watch a 3-minute story. Want subtitles? Tap CC." },
    { target: '[data-tour="practice"] | [data-tour="path"]', text: "Under the video: learn what really happened, practise, design, and face the interviewer’s follow-ups. Finish one and I’ll scroll you to the next." },
    { target: '[data-tour="tabs"]', text: "Notes pin to the moment in the video. The transcript lets you jump to any line." },
    { target: "", text: "That’s the tour. You can replay it from Profile any time. Chalo, let’s start!" },
  ],
  hi: [
    { target: '[data-tour="path"]', text: "Yeh bar aaj ka raasta hai. Har step pichle ke baad khulta hai, aur poora hua step tap karke wapas ja sakte ho." },
    { target: "#lesson-start, #lesson-call, #lesson-watch", text: "Har din yahan se shuru: pehle tumhara call, phir 3 minute ki story. Subtitles chahiye? CC dabao." },
    { target: '[data-tour="practice"] | [data-tour="path"]', text: "Video ke neeche: asal mein kya hua, practice, design, aur interviewer ke follow-ups. Ek khatam karo, main agle pe le chalunga." },
    { target: '[data-tour="tabs"]', text: "Notes video ke us moment pe pin hote hain. Transcript se kisi bhi line pe jump karo." },
    { target: "", text: "Bas itna hi. Profile se yeh tour kabhi bhi dobara dekh sakte ho. Chalo, shuru karte hain!" },
  ],
};

/**
 * Kamran's first-visit tour of the lesson screen: a few speech bubbles, each
 * pointing at one part of the page. Skippable, and replayable from Profile.
 */
export function Tour({ s, act }: { s: CourseState; act: Act }) {
  const stops = STOPS[s.lang];
  const [i, setI] = useState(0);
  // The highlighted rect, tagged with the stop it belongs to so a stale one never shows.
  const [seen, setSeen] = useState<{ i: number; rect: DOMRect } | null>(null);
  const stop = stops[i];
  const last = i === stops.length - 1;
  const box = seen?.i === i ? seen.rect : null;

  useEffect(() => {
    const el = stop.target.split(" | ").map((sel) => (sel ? document.querySelector<HTMLElement>(sel) : null)).find(Boolean) ?? null;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const measure = () => setSeen({ i, rect: el.getBoundingClientRect() });
    const t = window.setTimeout(measure, 350);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => { window.clearTimeout(t); window.removeEventListener("scroll", measure); window.removeEventListener("resize", measure); };
  }, [i, stop.target]);

  const end = () => { track("tour", s.cur, null, { action: last ? "finished" : "skipped", at: i + 1 }); act((p) => ({ ...p, toured: true })); };
  const next = () => (last ? end() : setI(i + 1));
  // Keep the bubble out of the way of what it points at.
  const bubbleTop = !!box && typeof window !== "undefined" && box.top + box.height / 2 > window.innerHeight * 0.55;

  // Portalled to <body>: the lesson screen animates in with a transform, which would pin "fixed" boxes to it instead of the window.
  return createPortal(
    <div className="sd-app fixed inset-0 z-[75] bg-transparent" role="dialog" aria-modal="true" aria-label="Tour of the lesson screen">
      {box ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed border-[3px] border-sd-accent transition-all duration-300"
          style={{ left: box.left - 6, top: box.top - 6, width: box.width + 12, height: box.height + 12, boxShadow: "0 0 0 9999px rgba(20,18,17,.55)" }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-[rgba(20,18,17,.55)]" />
      )}
      <div className={`fixed inset-x-3 flex justify-center ${bubbleTop ? "top-3" : "bottom-3"} lg:inset-x-6`}>
        <div key={i} className="sd-a-in flex w-full max-w-[560px] items-end gap-2" style={{ animationDuration: ".3s" }}>
          <Mascot directions="/mascots/kamran-directions.webp" reactions="/mascots/kamran-reactions.webp" size={84} label="Kamran" className="shrink-0 drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]" />
          <div className="sd-shadow-lg flex flex-1 flex-col gap-3 bg-sd-bg p-4">
            <p aria-live="polite" className="m-0 text-[15px] leading-[1.45] font-semibold">{stop.text}</p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-sd-n-700">{i + 1} / {stops.length}</span>
              <div className="flex gap-2">
                {!last && <button type="button" onClick={end} className="sd-btn sd-btn-ghost h-10 px-3 text-sm">Skip</button>}
                <button type="button" onClick={next} className="sd-btn sd-btn-primary h-10 gap-2 px-4 text-sm">{last ? "Start" : "Next"}<Icon name="arrowR" size={16} /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
