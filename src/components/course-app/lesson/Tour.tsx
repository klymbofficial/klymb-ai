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
    { target: "", text: "Two parts each day: watch the video, then pass the assessment." },
    { target: "#lesson-watch", text: "Every day starts with a short story video. Tap CC for subtitles." },
    { target: "", text: "After the video, the assessment opens here. Score 60% to move on." },
    { target: '[data-tour="tabs"]', text: "All lessons, common doubts, your notes and the transcript." },
    { target: "", text: "That’s it. Replay it from Profile. Chalo, let’s start!" },
  ],
  hi: [
    { target: "", text: "Har din do cheezein: video dekho, phir assessment pass karo." },
    { target: "#lesson-watch", text: "Har din ek chhoti story video se shuru hota hai. Subtitles ke liye CC dabao." },
    { target: "", text: "Video ke baad assessment yahan khulta hai. Aage badhne ke liye 60% score karo." },
    { target: '[data-tour="tabs"]', text: "Course ke saare lessons, aam sawaalon ke jawab, tumhare notes aur transcript." },
    { target: "", text: "Bas itna hi. Profile se dobara dekh sakte ho. Chalo, shuru karte hain!" },
  ],
};

/**
 * Kamran's first-visit tour of the lesson screen: a few speech bubbles, each
 * pointing at one part of the page. Skippable, and replayable from Profile.
 */
export function Tour({ s, act }: { s: CourseState; act: Act }) {
  const stops = STOPS[s.lang];
  const [i, setI] = useState(s.tourStep ?? 0);
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
          className="pointer-events-none fixed border-[3px] border-sd-accent-400 transition-all duration-300"
          style={{ left: box.left - 3, top: box.top - 3, width: box.width + 6, height: box.height + 6, boxShadow: "0 0 0 9999px rgba(20,18,17,.55)" }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-[rgba(20,18,17,.55)]" />
      )}
      <div className={`fixed inset-x-3 flex justify-center ${bubbleTop ? "top-3" : "bottom-3"} lg:inset-x-6`}>
        <div key={i} className="sd-a-in flex w-full max-w-[560px] items-end gap-2" style={{ animationDuration: ".3s" }}>
          <Mascot directions="/mascots/kamran-directions.webp" reactions="/mascots/kamran-reactions.webp" size={64} label="Kamran" className="shrink-0 drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]" />
          <div className="sd-shadow-lg flex flex-1 flex-col gap-3 rounded-xl bg-sd-bg p-4">
            <p aria-live="polite" className="m-0 text-[17px] leading-[1.4] font-bold tracking-[-.01em] [text-wrap:pretty]">{stop.text}</p>
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
