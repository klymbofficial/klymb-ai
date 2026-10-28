"use client";

import clsx from "clsx";
import { useState } from "react";
import { createPortal } from "react-dom";
import type { Lang, Question } from "@/data/system-design/types";
import { CHECK_SIZE, PASS_MARK, checkPct, passed, submitCheck, type CourseState, type LessonProgress } from "@/lib/course-app";
import { shuffledOrder } from "@/lib/shuffle";
import { Icon } from "../icons";
import { stagger, useCountUp } from "../ui";
import type { Act } from "../useCourseApp";

const PASS = Math.round(PASS_MARK * 100);

const UI = {
  en: {
    kicker: "Lesson assessment", title: "Check what you learned",
    intro: `Score ${PASS}% to unlock the next lesson. Answers and explanations come at the end.`,
    count: `${CHECK_SIZE} questions`, time: "About 5 min", mark: `Pass mark ${PASS}%`, start: "Start assessment", retake: "Retake assessment",
    skip: "Skip", next: "Next", finish: "Finish", of: (n: number, t: number) => `${n} of ${t} correct`,
    passed: "Passed", passedBody: (next: boolean) => (next ? "Next lesson unlocked." : `Pass mark is ${PASS}%.`),
    failed: "Not passed yet", failedBody: `You need ${PASS}% to unlock the next lesson. Rewatch the lesson, then retake the assessment.`,
    answer: "Answer", yours: "You picked", skipped: "Skipped",
    rewatch: "Rewatch the lesson", rewatchFirst: "Watch the video again to unlock the retake.", continue: "Continue",
    results: "Results", tries: (n: number) => `Attempt ${n}`, passedWith: (n: number) => `Passed with ${n}%`, see: "See answers",
    close: "Close", leave: "Leave the assessment? Your answers so far won’t be saved.",
  },
  hi: {
    kicker: "Lesson assessment", title: "Dekho kitna samjha",
    intro: `Agla lesson kholne ke liye ${PASS}% chahiye. Jawab aur explanation end mein milenge.`,
    count: `${CHECK_SIZE} sawaal`, time: "Lagbhag 5 min", mark: `Pass mark ${PASS}%`, start: "Assessment shuru karo", retake: "Assessment dobara do",
    skip: "Skip", next: "Next", finish: "Finish", of: (n: number, t: number) => `${t} mein se ${n} sahi`,
    passed: "Pass", passedBody: (next: boolean) => (next ? "Agla lesson khul gaya." : `Pass mark ${PASS}% hai.`),
    failed: "Abhi pass nahi", failedBody: `Agla lesson kholne ke liye ${PASS}% chahiye. Lesson dobara dekho, phir assessment do.`,
    answer: "Jawab", yours: "Tumne chuna", skipped: "Skip kiya",
    rewatch: "Lesson dobara dekho", rewatchFirst: "Retake kholne ke liye video phir se dekho.", continue: "Aage chalo",
    results: "Results", tries: (n: number) => `Attempt ${n}`, passedWith: (n: number) => `${n}% se pass`, see: "Jawab dekho",
    close: "Band karo", leave: "Assessment chhodna hai? Ab tak ke jawab save nahi honge.",
  },
};

/** One question at a time, no feedback until the end, so the score is honest. */
function Questions({ questions, lang, onDone }: { questions: Question[]; lang: Lang; onDone: (picks: number[]) => void }) {
  const ui = UI[lang];
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const q = questions[i];
  const last = i === questions.length - 1;
  const go = (n: number[]) => (last ? onDone(n) : setI(i + 1));
  const anim = i % 2 ? "sd-a-side" : "sd-a-side-b";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="sd-kicker text-sd-accent-700">{ui.kicker}</span>
        <span className="text-[15px] font-extrabold">{i + 1} / {questions.length}</span>
      </div>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${questions.length}, minmax(0, 1fr))` }} aria-hidden="true">
        {questions.map((x, k) => <span key={x.id} className={clsx("h-[5px] rounded-full transition-colors duration-400", k < i ? "bg-sd-accent" : k === i ? "bg-sd-ink" : "bg-sd-n-300")} />)}
      </div>
      <div key={q.id} className={clsx(anim, "flex flex-col gap-3 pt-2")}>
        {q.scenario && <p className="m-0 border-l-[3px] border-sd-accent pl-3 text-[15px] leading-[1.45]">{q.scenario}</p>}
        <h3 className="m-0 text-[22px] leading-[1.2] tracking-[-0.015em] text-pretty lg:text-[26px]">{q.prompt}</h3>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label={q.prompt}>
          {shuffledOrder(q.id, q.choices.length).map((k, pos) => {
            const sel = picks[i] === k;
            return (
              <button
                key={q.choices[k].text}
                type="button"
                role="radio"
                aria-checked={sel}
                onClick={() => setPicks((p) => { const n = [...p]; n[i] = k; return n; })}
                className={clsx("sd-a-in flex min-h-[52px] cursor-pointer items-center gap-3 rounded-lg border-2 p-3 text-left text-[15px] hover:border-sd-accent", sel ? "border-sd-accent bg-sd-accent-100" : "border-sd-divider")}
                style={stagger(pos, 60, 80)}
              >
                <span className={clsx("flex size-7 flex-none items-center justify-center rounded-lg border-[1.5px] text-[13px] font-extrabold", sel ? "border-sd-accent bg-sd-accent text-sd-bg" : "border-sd-divider")}>{String.fromCharCode(65 + pos)}</span>
                <span className="font-semibold">{q.choices[k].text}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-1 flex gap-2">
        <button type="button" onClick={() => go(picks)} className="sd-btn sd-btn-secondary h-[52px] w-24 justify-start">{ui.skip}</button>
        <button type="button" onClick={() => go(picks)} disabled={picks[i] === undefined} className="sd-btn sd-btn-primary h-[52px] flex-1 justify-between text-base lg:max-w-[260px]">
          {last ? ui.finish : ui.next}<Icon name="arrowR" />
        </button>
      </div>
    </div>
  );
}

/** The score, the verdict, and every question with its answer explained. */
function Results({ questions, lang, picks, hasNext, children }: { questions: Question[]; lang: Lang; picks: number[]; hasNext: boolean; children: React.ReactNode }) {
  const ui = UI[lang];
  const pct = checkPct(questions, picks);
  const shown = useCountUp(pct);
  const ok = passed(pct);
  const right = questions.filter((q, k) => q.choices[picks[k]]?.best).length;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 lg:flex-row lg:items-end lg:gap-6">
        <span className="text-[88px] leading-[0.9] font-extrabold tracking-[-0.05em] lg:text-[104px]" aria-label={`${pct}%`}>{shown}%</span>
        <span className="text-[15px] lg:pb-2">{ui.of(right, questions.length)}</span>
      </div>
      <div role="status" className={clsx("sd-a-in flex flex-col gap-1 rounded-xl p-4 text-sd-bg", ok ? "bg-sd-ink" : "bg-sd-accent")} style={{ animationDuration: ".6s", animationDelay: "450ms" }}>
        <span className="text-xl font-extrabold">{ok ? ui.passed : ui.failed}</span>
        <span className="text-sm leading-[1.4]">{ok ? ui.passedBody(hasNext) : ui.failedBody}</span>
      </div>
      <ol className="m-0 flex list-none flex-col border-t-2 border-sd-divider p-0">
        {questions.map((q, k) => {
          const mine = q.choices[picks[k]];
          const best = q.choices.find((c) => c.best)!;
          const good = !!mine?.best;
          return (
            <li key={q.id} className="sd-a-in grid grid-cols-[1fr_28px] items-start gap-3 border-b border-sd-divider py-3" style={stagger(k, 70, 600)}>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-sm font-semibold">{q.prompt}</span>
                {!good && <span className="text-xs text-sd-n-700">{ui.yours}: {mine ? mine.text : ui.skipped}</span>}
                <span className="text-[13px] font-semibold">{ui.answer}: {best.text}</span>
                <span className="text-xs leading-[1.45] text-pretty text-sd-n-700">{best.why}</span>
              </div>
              <span className={clsx("flex size-7 items-center justify-center rounded-lg border-[1.5px]", good ? "border-sd-ink bg-sd-ink text-sd-bg" : "border-sd-divider text-sd-n-600")} aria-label={good ? "Correct" : "Wrong"}>
                <Icon name={good ? "check" : "x"} size={14} stroke={good ? 3 : 2.5} />
              </span>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

/**
 * The lesson check, in place of a plain "Prove it": an intro, five questions
 * with no feedback until the end, then the score and every answer explained.
 * 60% passes and unlocks the next lesson; a miss means rewatching first.
 */
export function LessonCheck({ s, act, id, title, questions, hasNext, next, onPass, onRewatch }: {
  s: CourseState; act: Act; id: string; title: string; questions: Question[]; hasNext: boolean;
  /** The next step's button label, shown once passed. */
  next: string; onPass: () => void; onRewatch: () => void;
}) {
  const ui = UI[s.lang];
  const p: LessonProgress = s.lessons[id] ?? {};
  const [stage, setStage] = useState<"intro" | "q" | "result" | "passed">(p.failed ? "result" : p.post ? "passed" : "intro");
  const tries = p.tries ?? 0;

  let content: React.ReactNode;
  if (stage === "q") {
    content = (
      <Questions
        key={`${s.lang}-${tries}`}
        questions={questions}
        lang={s.lang}
        onDone={(picks) => { act((q) => submitCheck(q, id, questions, picks)); setStage("result"); }}
      />
    );
  } else if (stage === "passed" && p.post) {
    content = (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-extrabold">
          <span className="flex size-6 items-center justify-center rounded-md bg-sd-ink text-sd-bg"><Icon name="check" size={14} stroke={3} /></span>
          {ui.passedWith(p.check ?? checkPct(questions, p.post))}
        </span>
        <span className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setStage("result")} className="sd-btn sd-btn-ghost h-10">{ui.see}</button>
          <button type="button" onClick={onPass} className="sd-btn sd-btn-secondary h-10 gap-2">{next}<Icon name="down" size={16} /></button>
        </span>
      </div>
    );
  } else if (stage === "result" && p.checkPicks) {
    const ok = !!p.post && !p.failed;
    content = (
      <Results questions={questions} lang={s.lang} picks={p.checkPicks} hasNext={hasNext}>
        {ok && <button type="button" onClick={() => { setStage("passed"); onPass(); }} className="sd-btn sd-btn-primary h-12 justify-between gap-3 px-4">{ui.continue}<Icon name="arrowR" /></button>}
        {!ok && !p.rewatched && (
          <>
            <button type="button" onClick={onRewatch} className="sd-btn sd-btn-primary h-12 gap-2 px-4"><Icon name="rotL" size={16} />{ui.rewatch}</button>
            <span className="text-xs text-sd-n-700">{ui.rewatchFirst}</span>
          </>
        )}
        {!ok && p.rewatched && <button type="button" onClick={() => setStage("q")} className="sd-btn sd-btn-primary h-12 justify-between gap-3 px-4">{ui.retake} · {ui.count}<Icon name="arrowR" /></button>}
        {tries > 1 && <span className="text-xs text-sd-n-700">{ui.tries(tries)}</span>}
      </Results>
    );
  } else {
    content = (
    <div className="flex flex-col gap-3.5 rounded-xl bg-sd-surface p-4 lg:p-5">
      <span className="sd-kicker text-sd-accent-700">{ui.kicker}</span>
      <h3 className="m-0 text-[26px] leading-[1.05] tracking-[-0.03em] lg:text-[32px]">{ui.title}</h3>
      <p className="m-0 text-[15px] text-pretty text-sd-n-800">{ui.intro}</p>
      <div className="flex flex-wrap gap-2">
        <span className="sd-tag sd-tag-neutral">{ui.count}</span>
        <span className="sd-tag sd-tag-neutral">{ui.time}</span>
        <span className="sd-tag sd-tag-accent">{ui.mark}</span>
      </div>
      <button type="button" onClick={() => setStage("q")} className="sd-btn sd-btn-primary h-[52px] justify-between text-base lg:w-[280px]">
        {p.failed ? ui.retake : ui.start}<Icon name="arrowR" />
      </button>
    </div>
    );
  }

  const full = s.checkFull && stage !== "passed";
  const close = () => {
    if (stage === "q" && !window.confirm(ui.leave)) return;
    act((q) => ({ ...q, checkFull: false }));
    if (stage === "q") setStage(p.failed ? "result" : p.post ? "passed" : "intro");
  };
  if (!full) {
    // On the page: a compact card. Starting it opens the check full screen.
    if (stage === "passed") return content;
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sd-surface p-4">
        <span className="flex flex-col">
          <span className="sd-kicker text-sd-accent-700">{ui.kicker}</span>
          <span className="text-[17px] font-extrabold">{p.failed ? ui.failed : ui.title}</span>
          <span className="text-xs text-sd-n-700">{ui.count} · {ui.mark}</span>
        </span>
        <button type="button" onClick={() => { if (stage === "intro" && !p.failed) setStage("q"); act((q) => ({ ...q, checkFull: true })); }} className="sd-btn sd-btn-primary h-11 gap-2">
          {p.failed ? (p.rewatched ? ui.retake : ui.results) : stage === "result" ? ui.results : ui.start}<Icon name="arrowR" size={16} />
        </button>
      </div>
    );
  }
  // Full screen: nothing else on the page until the check is done.
  return createPortal(
    <div className="sd-app fixed inset-0 z-[72] flex flex-col bg-sd-bg" role="dialog" aria-modal="true" aria-label={ui.kicker}>
      <div className="flex flex-none items-center justify-between gap-3 border-b-2 border-sd-divider px-4 py-3 lg:px-8">
        <span className="min-w-0 truncate text-xs font-extrabold tracking-[0.08em] uppercase">{ui.kicker} · {title}</span>
        <button type="button" onClick={close} aria-label={ui.close} className="sd-btn sd-btn-secondary h-9 gap-1.5 px-3 text-xs"><Icon name="x" size={14} />{ui.close}</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[720px] px-5 py-6 lg:py-10">{content}</div>
      </div>
    </div>,
    document.body,
  );
}
