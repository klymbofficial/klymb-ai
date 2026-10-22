"use client";

import clsx from "clsx";
import { useEffect, useRef } from "react";
import { ONBOARDING, QUESTIONS, QUICK_CHECKS } from "@/data/system-design/course-app";
import { answerQuickCheck, closeQuickCheck, fmt, quickCheckAt, startQuiz, type CourseState } from "@/lib/course-app";
import { Icon } from "./icons";
import type { Act } from "./useCourseApp";

/* Overlays sit above the site-wide help launcher (z-60). */

export function Splash({ act }: { act: Act }) {
  return (
    <button
      type="button"
      onClick={() => act((p) => ({ ...p, screen: "onboard", onb: 0 }))}
      aria-label="Klymb.ai System Design. Tap to continue"
      className="fixed inset-0 z-[70] flex cursor-pointer flex-col justify-between bg-sd-accent px-6 pt-[72px] pb-12 text-left text-sd-bg active:scale-100! lg:p-12"
    >
      <span className="sd-a-in text-sm font-extrabold tracking-[0.1em] uppercase">Klymb.ai</span>
      <span className="sd-a-in text-[68px] leading-[0.88] font-extrabold tracking-[-0.05em] lg:text-[128px]" style={{ animationDuration: ".6s", animationDelay: "150ms" }}>System<br />Design</span>
      <span className="block h-[3px] w-full bg-white/30"><span className="block h-full origin-left bg-sd-bg" style={{ animation: "sd-grow 1.8s linear both" }} /></span>
    </button>
  );
}

/** Three intro slides. The last one goes straight to the pre-assessment, so the baseline is set on day one. */
export function Onboarding({ s, act }: { s: CourseState; act: Act }) {
  const i = s.onb;
  const last = i === ONBOARDING.length - 1;
  const anim = i % 2 ? "sd-a-side" : "sd-a-side-b";
  const done = (p: CourseState): CourseState => ({ ...p, onboarded: true });
  const nextSlide = () => act((p) => (p.onb < ONBOARDING.length - 1 ? { ...p, onb: p.onb + 1 } : startQuiz(done(p), "pre")));
  const skip = () => act((p) => ({ ...done(p), screen: "home", tab: "home" }));
  const big = "text-8xl leading-[0.85] font-extrabold tracking-[-0.05em] lg:text-[140px]";

  return (
    <div className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-sd-bg px-5 pt-14 pb-[34px] lg:items-center lg:justify-center lg:p-10" role="dialog" aria-modal="true" aria-label="Welcome">
      <div className="flex flex-1 flex-col gap-[22px] lg:grid lg:w-full lg:max-w-[1000px] lg:flex-none lg:grid-cols-2 lg:items-center lg:gap-14">
        <div key={`art-${i}`} className={clsx(anim, "sd-grid flex h-[300px] flex-none flex-col justify-between p-[22px] [--grid:24px] lg:aspect-square lg:h-auto")} style={{ animationDuration: ".5s" }} aria-hidden="true">
          {i === 0 && (
            <>
              <span className="text-7xl leading-none font-extrabold tracking-[-0.05em] text-white/22 lg:text-[120px]">21</span>
              <div className="flex flex-col items-start">
                <div className="border-2 border-white/55 px-3.5 py-2.5 text-sm font-extrabold">Client</div>
                <div className="ml-6 h-3.5 w-0.5 bg-sd-bg" />
                <div className="border-2 border-sd-accent bg-sd-accent px-3.5 py-2.5 text-sm font-extrabold">Load balancer</div>
                <div className="ml-6 h-3.5 w-0.5 bg-sd-bg" />
                <div className="border-2 border-white/55 px-3.5 py-2.5 text-sm font-extrabold">App servers</div>
              </div>
            </>
          )}
          {i === 1 && (
            <>
              <div className="flex flex-col gap-0.5"><span className="text-xs tracking-[0.08em] uppercase">Before</span><span className="text-[40px] font-extrabold text-white/55">33%</span></div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs tracking-[0.08em] uppercase">After</span>
                <span className={big}>83%</span>
                <span className="self-start bg-sd-accent px-2.5 py-1 text-[13px] font-extrabold">+50 pts</span>
              </div>
            </>
          )}
          {i === 2 && (
            <>
              <div className="flex items-start justify-between"><span className={big}>1</span><span className="text-sd-accent"><Icon name="flame" size={40} /></span></div>
              <div className="grid grid-cols-7 gap-1">
                {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                  <div key={d} className={clsx("aspect-square", d === 0 ? "bg-sd-accent" : "border-[1.5px] border-dashed border-white/50")} />
                ))}
              </div>
            </>
          )}
        </div>
        <div key={`copy-${i}`} className={clsx(anim, "flex flex-1 flex-col gap-3.5 lg:flex-none")} style={{ animationDuration: ".5s", animationDelay: "80ms" }}>
          <div className="grid grid-cols-3 gap-1 lg:max-w-[200px]" aria-label={`Step ${i + 1} of ${ONBOARDING.length}`}>
            {ONBOARDING.map((_, k) => <div key={k} className={clsx("h-[5px] transition-colors duration-300", k <= i ? "bg-sd-accent" : "bg-sd-n-300")} />)}
          </div>
          <h1 className="m-0 text-[34px] leading-[1.02] tracking-[-0.03em] text-pretty lg:text-5xl">{ONBOARDING[i][0]}</h1>
          <p className="m-0 text-[15px] text-pretty text-sd-n-800 lg:text-[17px]">{ONBOARDING[i][1]}</p>
          <div className="mt-auto flex gap-2 lg:mt-3">
            {!last && <button type="button" onClick={skip} className="sd-btn sd-btn-secondary h-[52px] w-24 justify-start">Skip</button>}
            <button type="button" onClick={nextSlide} className="sd-btn sd-btn-primary h-[52px] flex-1 justify-between text-[15px] lg:max-w-[360px]">
              {last ? "Take the 6-question baseline" : "Next"}<Icon name="arrowR" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The ungraded in-video question: a bottom sheet on mobile, a centred card on web. */
export function QuickCheckSheet({ s, act }: { s: CourseState; act: Act }) {
  const qc = QUICK_CHECKS[s.cur];
  const picked = s.qcPick;
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => { first.current?.focus(); }, []);
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-stretch justify-end bg-sd-n-900/50 lg:items-center lg:justify-center">
      <div role="dialog" aria-modal="true" aria-labelledby="sd-qc-q" className="sd-a-in sd-lg-shadow flex flex-col gap-3 border-t-[3px] border-sd-accent bg-sd-bg px-5 pt-[18px] pb-[34px] lg:w-[min(540px,90%)] lg:p-6" style={{ animationDuration: ".35s" }}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold tracking-[0.1em] text-sd-accent-700 uppercase">Quick check · {fmt(quickCheckAt(s.cur))}</span>
          <span className="sd-tag sd-tag-neutral">Not graded</span>
        </div>
        <h3 id="sd-qc-q" className="m-0 text-xl leading-[1.2] tracking-[-0.015em] text-pretty lg:text-2xl">{qc.q}</h3>
        {qc.opts.map((o, i) => {
          const st = picked === null ? "idle" : i === qc.ans ? "ok" : picked === i ? "bad" : "dim";
          return (
            <button
              key={i}
              ref={i === 0 ? first : undefined}
              type="button"
              onClick={() => act((p) => answerQuickCheck(p, i))}
              aria-disabled={picked !== null}
              className={clsx(
                "flex min-h-12 cursor-pointer items-center gap-3 border-2 px-3 py-[11px] text-left text-[15px] transition-[background-color,opacity] duration-250",
                st === "ok" ? "border-sd-ink bg-sd-ink text-sd-bg" : st === "bad" ? "border-sd-accent bg-sd-accent-100" : "border-sd-divider",
                st === "dim" && "opacity-45",
              )}
            >
              <span className="flex size-[26px] flex-none items-center justify-center border-[1.5px] border-current text-xs font-extrabold">
                {st === "ok" ? <Icon name="check" size={14} stroke={3} /> : st === "bad" ? <Icon name="x" size={14} stroke={2.5} /> : String.fromCharCode(65 + i)}
              </span>
              <span>{o}</span>
            </button>
          );
        })}
        {picked !== null ? (
          <>
            <div className="sd-a-in flex flex-col gap-1.5 border-t-2 border-sd-divider pt-3" style={{ animationDuration: ".3s" }} aria-live="polite">
              <span className="text-base font-extrabold">{picked === qc.ans ? "Correct" : `Not quite. The answer is ${String.fromCharCode(65 + qc.ans)}.`}</span>
              <span className="text-sm leading-[1.45]">{qc.why}</span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => act((p) => closeQuickCheck(p, "rewatch"))} className="sd-btn sd-btn-secondary h-12 justify-start gap-1.5"><Icon name="rotL" size={16} />Rewatch 1 min</button>
              <button type="button" onClick={() => act((p) => closeQuickCheck(p, "continue"))} className="sd-btn sd-btn-primary h-12 flex-1 justify-between">Keep watching<Icon name="arrowR" /></button>
            </div>
          </>
        ) : (
          <button type="button" onClick={() => act((p) => closeQuickCheck(p, "skip"))} className="sd-btn sd-btn-ghost self-start">Skip for now</button>
        )}
      </div>
    </div>
  );
}

/** Asked before throwing away a started assessment. "Keep going" is the main choice. */
export function LeaveQuizDialog({ s, act }: { s: CourseState; act: Act }) {
  const stay = useRef<HTMLButtonElement>(null);
  useEffect(() => { stay.current?.focus(); }, []);
  return (
    <div className="sd-a-in fixed inset-0 z-[70] grid place-items-center bg-sd-n-900/50 p-4" style={{ animationDuration: ".2s" }} onKeyDown={(e) => { if (e.key === "Escape") act((p) => ({ ...p, confirmExit: false })); }}>
      <div className="sd-dialog" role="alertdialog" aria-modal="true" aria-labelledby="sd-leave-t" aria-describedby="sd-leave-b">
        <div id="sd-leave-t" className="text-xl font-extrabold">Leave the assessment?</div>
        <div id="sd-leave-b" className="text-sm opacity-85">You’ve answered {Object.keys(s.quiz.answers).length} of {QUESTIONS.length}. If you leave now, these answers won’t be saved.</div>
        <div className="mt-2 flex justify-start gap-2">
          <button ref={stay} type="button" onClick={() => act((p) => ({ ...p, confirmExit: false }))} className="sd-btn sd-btn-primary">Keep going</button>
          <button type="button" onClick={() => act((p) => ({ ...p, screen: p.tab, confirmExit: false }))} className="sd-btn sd-btn-secondary">Leave</button>
        </div>
      </div>
    </div>
  );
}

export function Toast({ text }: { text: string }) {
  return (
    <div role="status" className="sd-a-in sd-shadow-lg fixed top-3 right-3 left-3 z-[80] flex items-center gap-2.5 bg-sd-ink px-3.5 py-3 text-[13px] font-semibold text-sd-bg lg:top-5 lg:right-6 lg:left-auto lg:w-[380px]" style={{ animationDuration: ".35s" }}>
      <span className="flex text-sd-accent-400"><Icon name="check" size={16} /></span>{text}
    </div>
  );
}
