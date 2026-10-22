"use client";

import clsx from "clsx";
import { useState } from "react";
import type { Lang, Question } from "@/data/system-design/types";

const UI = {
  en: { right: "Nailed it!", close: "Close. The best move is in green.", next: "Next", done: "Done" },
  hi: { right: "Sahi pakde!", close: "Close. Best move green mein hai.", next: "Next", done: "Done" },
};

/**
 * One scenario at a time. A pick locks the question and explains both the
 * pick and the best move: no gotchas, the "why" is the lesson.
 */
export function LessonQuiz({
  questions, label, lang, onDone,
}: { questions: Question[]; label: string; lang: Lang; onDone: (picks: number[]) => void }) {
  const ui = UI[lang];
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const q = questions[i];
  const picked = picks[i];
  const answered = picked !== undefined;
  const last = i === questions.length - 1;

  return (
    <div>
      <div className="flex items-center justify-between text-xs font-bold text-muted">
        <span>{label} · {i + 1} / {questions.length}</span>
        <span className="flex gap-1" aria-hidden="true">
          {questions.map((x, k) => (
            <span key={x.id} className={clsx("h-1.5 w-6 rounded-full transition-colors", k < i || (k === i && answered) ? "bg-red-strong" : "bg-line/30")} />
          ))}
        </span>
      </div>

      {q.scenario && <p className="mt-4 rounded-lg bg-surface/70 px-4 py-3 text-[15px] leading-snug">{q.scenario}</p>}
      <h3 className="mt-4 text-xl font-extrabold leading-tight">{q.prompt}</h3>

      <ul className="mt-4 flex flex-col gap-2.5">
        {q.choices.map((c, k) => {
          const mine = picked === k;
          return (
            <li key={c.text}>
              <button
                type="button"
                disabled={answered}
                onClick={() => setPicks((p) => { const n = [...p]; n[i] = k; return n; })}
                className={clsx(
                  "w-full rounded-xl border-2 px-4 py-3.5 text-left text-[15px] leading-snug font-semibold transition-[border-color,background-color,transform] duration-150 active:scale-[0.99]",
                  !answered && "border-line/25 bg-card hover:border-ink/50",
                  answered && c.best && "border-emerald-600 bg-emerald-50",
                  answered && mine && !c.best && "border-red-strong bg-red-tint",
                  answered && !mine && !c.best && "border-line/15 bg-card opacity-55",
                )}
              >
                <span className="flex items-start gap-3">
                  <span className={clsx(
                    "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 text-xs font-extrabold",
                    answered && c.best ? "border-emerald-600 bg-emerald-600 text-white" : answered && mine ? "border-red-strong bg-red-strong text-white" : "border-line/40 text-muted",
                  )}>
                    {answered && c.best ? "✓" : answered && mine ? "✕" : String.fromCharCode(65 + k)}
                  </span>
                  <span>{c.text}</span>
                </span>
                {answered && (mine || c.best) && (
                  <span className="mt-2 block pl-9 text-sm font-normal leading-relaxed text-ink/80">{c.why}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {answered && (
        <div className="mt-5 flex items-center justify-between gap-4">
          <p role="status" className={clsx("text-sm font-bold", q.choices[picked].best ? "text-emerald-700" : "text-red-deep")}>
            {q.choices[picked].best ? ui.right : ui.close}
          </p>
          <button
            type="button"
            onClick={() => (last ? onDone(picks) : setI(i + 1))}
            className="rounded-lg bg-ink px-5 py-3 text-sm font-bold text-paper transition-transform active:scale-[0.97]"
          >
            {last ? ui.done : ui.next} →
          </button>
        </div>
      )}
    </div>
  );
}

export function score(questions: Question[], picks: number[]) {
  return picks.filter((p, k) => questions[k]?.choices[p]?.best).length;
}
