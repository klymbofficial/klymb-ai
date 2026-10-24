"use client";

import clsx from "clsx";
import { useState } from "react";
import type { Lang, Question } from "@/data/system-design/types";
import { shuffledOrder } from "@/lib/shuffle";
import { Icon } from "../icons";
import { stagger } from "../ui";

const UI = {
  en: { right: "Best move.", close: "Close. The best move is marked.", next: "Next", done: "Done" },
  hi: { right: "Sahi pakde!", close: "Close. Best move mark hai.", next: "Next", done: "Done" },
};

/**
 * One scenario at a time. A pick locks the question and explains both the
 * pick and the best move: no gotchas, the "why" is the lesson. Used for
 * "Your call" before the video and "Prove it" after it.
 */
export function ChoiceQuiz({ questions, label, lang, onDone }: { questions: Question[]; label: string; lang: Lang; onDone: (picks: number[]) => void }) {
  const ui = UI[lang];
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const q = questions[i];
  const picked = picks[i];
  const answered = picked !== undefined;
  const last = i === questions.length - 1;

  return (
    <div key={q.id} className="sd-a-side flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs font-semibold text-sd-n-700">
        <span className="sd-kicker text-sd-accent-700">{label} · {i + 1} / {questions.length}</span>
        <span className="flex gap-1" aria-hidden="true">
          {questions.map((x, k) => <span key={x.id} className={clsx("h-[5px] w-6 rounded-full", k < i || (k === i && answered) ? "bg-sd-accent" : "bg-sd-n-300")} />)}
        </span>
      </div>
      {q.scenario && <p className="m-0 border-l-[3px] border-sd-accent pl-3 text-[15px] leading-[1.45]">{q.scenario}</p>}
      <h3 className="m-0 text-[22px] tracking-[-0.02em] lg:text-[26px]">{q.prompt}</h3>

      <div className="flex flex-col gap-2" role="radiogroup">
        {shuffledOrder(q.id, q.choices.length).map((k, pos) => {
          const c = q.choices[k];
          const mine = picked === k;
          return (
            <button
              key={c.text}
              type="button"
              role="radio"
              aria-checked={mine}
              disabled={answered}
              onClick={() => setPicks((p) => { const n = [...p]; n[i] = k; return n; })}
              className={clsx(
                "sd-a-in flex cursor-pointer flex-col gap-1.5 rounded-lg border-2 p-3 text-left text-[15px] disabled:cursor-default lg:p-4",
                !answered && "border-sd-divider hover:border-sd-accent",
                answered && c.best && "border-sd-ink bg-sd-ink text-sd-bg",
                answered && mine && !c.best && "border-sd-accent bg-sd-accent-100",
                answered && !mine && !c.best && "border-sd-divider opacity-50",
              )}
              style={stagger(pos, 60, 80)}
            >
              <span className="flex items-start gap-3">
                <span className={clsx(
                  "flex size-7 flex-none items-center justify-center rounded-lg border-[1.5px] text-[13px] font-extrabold",
                  answered && c.best ? "border-sd-bg bg-sd-bg text-sd-ink" : answered && mine ? "border-sd-accent bg-sd-accent text-sd-bg" : "border-sd-divider",
                )}>
                  {answered && c.best ? <Icon name="check" size={14} stroke={3} /> : answered && mine ? <Icon name="x" size={14} stroke={3} /> : String.fromCharCode(65 + pos)}
                </span>
                <span className="pt-0.5 font-semibold">{c.text}</span>
              </span>
              {answered && (mine || c.best) && <span className={clsx("pl-10 text-sm leading-[1.45]", c.best ? "text-sd-bg/85" : "text-sd-n-800")}>{c.why}</span>}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="sd-a-in flex items-center justify-between gap-3" style={{ animationDuration: ".3s" }}>
          <span role="status" className={clsx("text-sm font-extrabold", q.choices[picked].best ? "text-sd-ink" : "text-sd-accent-700")}>{q.choices[picked].best ? ui.right : ui.close}</span>
          <button type="button" onClick={() => (last ? onDone(picks) : setI(i + 1))} className="sd-btn sd-btn-primary h-11 gap-2">{last ? ui.done : ui.next}<Icon name="arrowR" size={16} /></button>
        </div>
      )}
    </div>
  );
}

export function score(questions: Question[], picks: number[]) {
  return picks.filter((p, k) => questions[k]?.choices[p]?.best).length;
}
