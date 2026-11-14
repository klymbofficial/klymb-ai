"use client";

import clsx from "clsx";
import { useState } from "react";
import { submitQuiz } from "@/app/(learn)/learn/actions";
import { Button } from "@/components/ui/Button";
import type { QuizResult } from "@/lib/quiz-score";

interface Quiz {
  week: number;
  title: string;
  questions: { question: string; options: string[] }[];
}

/**
 * A challenge's weekly multiple-choice quiz. The browser holds only the
 * questions; the server scores the answers and sends back the right option
 * and the reason for each, which show once it is marked.
 */
export function WeeklyQuiz({ track, quiz, best }: { track: string; quiz: Quiz; best?: { score: number; total: number } }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => quiz.questions.map(() => null));
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const complete = answers.every((a) => a !== null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!complete) return setError("Answer every question first.");
    setError("");
    setPending(true);
    const res = await submitQuiz(track, quiz.week, answers as number[]);
    setPending(false);
    if (res.ok) setResult(res.result);
    else setError(res.message);
  }

  function again() {
    setAnswers(quiz.questions.map(() => null));
    setResult(null);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-sm text-muted">Week {quiz.week}: {quiz.title}. {quiz.questions.length} questions.</p>
        {best && !result && <p className="text-sm font-bold">Your best so far: {best.score} of {best.total}</p>}
      </div>

      <ol className="flex flex-col gap-6">
        {quiz.questions.map((q, i) => {
          const mark = result?.marks[i];
          return (
            <li key={i}>
              <fieldset disabled={!!result}>
                <legend className="text-[15px] font-semibold">{i + 1}. {q.question}</legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {q.options.map((o, j) => {
                    const id = `q-${quiz.week}-${i}-${j}`;
                    const right = mark && j === mark.answer;
                    const wrong = mark && j === mark.chosen && j !== mark.answer;
                    return (
                      <label
                        key={j}
                        htmlFor={id}
                        className={clsx(
                          "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                          right ? "border-[#166534] bg-[#dcfce7]" : wrong ? "border-error bg-error-tint" : answers[i] === j ? "border-ink bg-surface" : "border-line/40 hover:border-ink",
                        )}
                      >
                        <input id={id} type="radio" name={`q-${i}`} checked={answers[i] === j} onChange={() => setAnswers((a) => a.map((x, k) => (k === i ? j : x)))} className="mt-0.5" />
                        <span>{o}{right && <span className="sr-only"> (right answer)</span>}{wrong && <span className="sr-only"> (your answer, wrong)</span>}</span>
                      </label>
                    );
                  })}
                </div>
                {mark && mark.explanation && <p className="mt-2 text-sm text-muted">{mark.chosen === mark.answer ? "Right. " : "Not quite. "}{mark.explanation}</p>}
              </fieldset>
            </li>
          );
        })}
      </ol>

      {error && <p role="alert" className="border-2 border-error bg-error-tint p-3 text-sm font-semibold text-error">{error}</p>}

      <div className="flex flex-wrap items-center gap-4">
        {result ? (
          <>
            <p role="status" className="text-base font-extrabold">You scored {result.score} of {result.total}.</p>
            <button type="button" onClick={again} className="text-sm font-semibold underline underline-offset-4 hover:text-red-deep">Try again</button>
          </>
        ) : (
          <Button type="submit" className="rounded-md px-4! py-2! text-xs!" disabled={pending} aria-busy={pending}>{pending ? "Marking…" : "Submit quiz"}</Button>
        )}
      </div>
    </form>
  );
}
