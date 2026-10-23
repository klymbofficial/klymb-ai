"use client";

import clsx from "clsx";
import { useEffect, useRef } from "react";
import { QUESTIONS, QUICK_CHECKS, WELCOME } from "@/data/system-design/course-app";
import { StudyBuddy } from "@/components/learner/StudyBuddy";
import { answerQuickCheck, closeQuickCheck, fmt, openLesson, quickCheckAt, startQuiz, type CourseState } from "@/lib/course-app";
import { Icon } from "./icons";
import { track } from "./track";
import { GoogleButton, firstName, useCourseUser } from "./user";
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

/** Signed out: Google first (it saves progress to your name), Day 0 without signing in as the quiet option. Signed in: straight to Day 0. */
function StartButtons({ user, startDay0, baseline }: { user: boolean; startDay0: () => void; baseline: () => void }) {
  const link = "cursor-pointer self-center py-1.5 text-sm font-semibold text-sd-n-700 underline underline-offset-4 hover:text-sd-ink lg:self-start";
  if (user) {
    return (
      <div className="flex flex-col gap-1">
        <button type="button" onClick={startDay0} className="sd-btn sd-btn-primary h-[56px] justify-between text-[16px]">Start Day 0<Icon name="arrowR" /></button>
        <button type="button" onClick={baseline} className={link}>Or take the 6-question baseline first</button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <GoogleButton lesson="0-0" where="welcome" label="Continue with Google" className="h-[56px] border-2 border-sd-ink text-[16px]" />
      <span className="text-center text-xs text-sd-n-700 lg:text-left">Saves your progress and streak to your name.</span>
      <button type="button" onClick={startDay0} className={link}>Or try Day 0 without signing in</button>
    </div>
  );
}

/** The welcome: Kamran says hello, the page says what the course gives you, and one button starts Day 0. */
export function Onboarding({ act }: { s: CourseState; act: Act }) {
  const user = useCourseUser();
  const first = firstName(user);
  const done = (p: CourseState): CourseState => ({ ...p, onboarded: true });
  const startDay0 = () => { track("welcome", null, null, { choice: "day0" }); act((p) => openLesson(done(p), "0-0")); };
  const baseline = () => { track("welcome", null, null, { choice: "baseline" }); act((p) => startQuiz(done(p), "pre")); };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-sd-bg px-5 pt-10 pb-8 lg:items-center lg:justify-center lg:p-10" role="dialog" aria-modal="true" aria-label="Welcome">
      <div className="flex w-full flex-col gap-6 lg:grid lg:max-w-[1080px] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-14">
        <div className="sd-a-side-b flex flex-col gap-5" style={{ animationDuration: ".5s" }}>
          <span className="sd-kicker text-sd-accent-700">Klymb.ai · System Design in 21 Days</span>
          <StudyBuddy tone="light" size={96} message={`Hi${first ? ` ${first}` : ""}, I’m Kamran. I’ll walk you through it. Day 0 takes about 12 minutes.`} />
          <h1 className="m-0 text-[38px] leading-[1] tracking-[-0.04em] text-pretty lg:text-[60px]">System design, phone pe.</h1>
          <p className="m-0 text-[15px] text-pretty text-sd-n-800 lg:text-[17px]">Here’s what you get, every day for 21 days. No experience needed: Day 0 starts from what system design even is.</p>
          <div className="hidden max-w-[360px] lg:block"><StartButtons user={!!user} startDay0={startDay0} baseline={baseline} /></div>
        </div>
        <ol className="sd-a-side m-0 grid list-none gap-px border-2 border-sd-ink bg-sd-ink p-0 sm:grid-cols-2" style={{ animationDuration: ".5s", animationDelay: "80ms" }}>
          {WELCOME.map(([title, detail], i) => (
            <li key={title} className="flex flex-col gap-1 bg-sd-bg p-4">
              <span className="text-sm font-extrabold text-sd-accent">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-[16px] leading-[1.2] font-extrabold">{title}</span>
              <span className="text-[13px] leading-[1.4] text-sd-n-800">{detail}</span>
            </li>
          ))}
        </ol>
        <div className="sticky -bottom-8 -mx-5 border-t-2 border-sd-divider bg-sd-bg px-5 pt-3 pb-8 lg:hidden">
          <StartButtons user={!!user} startDay0={startDay0} baseline={baseline} />
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
