"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { submitFinal, type FinalResult } from "@/app/org/[slug]/(workspace)/learning/[course]/actions";
import { DIAGRAMS, QUESTIONS, REVIEW_LESSON, TIMED_SECONDS } from "@/data/system-design/course-app";

/**
 * The final assessment in the workspace (user, 26 Nov): one question at a
 * time with a progress bar, a last look before submitting, then the score
 * with what to revisit for each miss. Retakes are allowed; the best counts.
 * Answers are graded on the server only.
 */

type Answer = number | number[] | string | null;
const RED_BTN = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-red-strong px-5 text-sm font-bold text-white hover:bg-red-press disabled:opacity-50";
const PLAIN_BTN = "inline-flex min-h-11 items-center justify-center rounded-md border border-line/60 bg-white px-5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50";

const startAnswers = (): Answer[] => QUESTIONS.map((q) => (q.type === "multi" ? [] : q.type === "order" ? [...q.start] : q.type === "text" ? "" : null));
/** When the timed question's clock runs out, counted from now. Only ever called from a click. */
const timedDeadline = () => Date.now() + TIMED_SECONDS * 1000;
const isAnswered = (a: Answer) => (Array.isArray(a) ? a.length > 0 : typeof a === "string" ? a.trim().length > 0 : a !== null);

export function FinalAssessment({ slug, attempt, mark, best, courseHref, lessons }: {
  slug: string; attempt: number; mark: number; best: number | null; courseHref: string;
  /** Lesson number and title by id, for "revisit" links. */
  lessons: Record<string, { no: number; title: string }>;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<"intro" | "q" | "review" | "done">("intro");
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>(startAnswers);
  const [result, setResult] = useState<FinalResult | null>(null);
  const [pending, start] = useTransition();
  const [tryNo, setTryNo] = useState(attempt);
  // When the timed question's clock ends, set the first time it opens in a try, so going back to it can't restart it.
  const [deadline, setDeadline] = useState<number | null>(null);
  const set = (a: Answer) => setAnswers((all) => all.map((x, k) => (k === i ? a : x)));
  const goTo = (k: number) => {
    if (QUESTIONS[k]?.type === "timed" && deadline === null) setDeadline(timedDeadline());
    setI(k);
    setStage("q");
  };

  const submit = () => start(async () => {
    const r = await submitFinal(slug, answers, tryNo);
    setResult(r);
    if (r.ok) { setStage("done"); router.refresh(); }
  });
  const retake = () => { setAnswers(startAnswers()); setResult(null); setTryNo((n) => n + 1); setDeadline(null); goTo(0); };

  if (stage === "intro") {
    return (
      <div className="rounded-lg border border-line/30 bg-white p-6">
        <h2 className="text-xl font-bold">Before you start</h2>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          <li>• {QUESTIONS.length} questions, one of each kind: multiple choice, pick-all, a diagram, put-in-order, a short answer and one timed question ({TIMED_SECONDS} seconds).</li>
          <li>• {mark}% to pass. About 10 minutes.</li>
          <li>• You can go back and change answers until you submit. Retakes are allowed and your best score counts.</li>
        </ul>
        {best !== null && <p className="mt-4 text-sm text-muted">Your best so far: {best}%.</p>}
        <button type="button" onClick={() => goTo(0)} className={clsx(RED_BTN, "mt-6")}>{attempt > 1 ? `Start try ${attempt}` : "Start the final"} <span aria-hidden="true">→</span></button>
      </div>
    );
  }

  if (stage === "done" && result?.ok) {
    const passed = result.score >= mark;
    const missed = QUESTIONS.map((q, k) => ({ q, ok: result.results[k] === 1 })).filter((x) => !x.ok);
    return (
      <div className="flex flex-col gap-4">
        <div role="status" className={clsx("rounded-lg border p-6", passed ? "border-[#cfe6da] bg-[#e4f2ec]" : "border-[#f3d9c4] bg-[#fdf1e7]")}>
          <p className="text-sm font-semibold">Try {result.attempt}</p>
          <p className="mt-1 text-4xl font-bold tabular-nums">{result.score}%</p>
          <p className="mt-2 text-sm">{passed ? "You passed the course. Well done!" : `You need ${mark}%. Revisit the lessons below, then try again: your best score counts.`}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {passed ? <Link href={`${courseHref}/certificate`} className={RED_BTN}>Get your certificate</Link> : <button type="button" onClick={retake} className={RED_BTN}>Try again</button>}
            <Link href={courseHref} className={PLAIN_BTN}>Back to the course</Link>
          </div>
        </div>
        <section aria-labelledby="by-q" className="rounded-lg border border-line/30 bg-white">
          <h3 id="by-q" className="border-b border-line/25 px-5 py-3 font-bold">Question by question</h3>
          <ol>
            {QUESTIONS.map((q, k) => {
              const ok = result.results[k] === 1;
              const review = REVIEW_LESSON[q.topic];
              const l = review ? lessons[review] : undefined;
              return (
                <li key={k} className="flex flex-wrap items-center gap-3 border-t border-line/20 px-5 py-3 text-sm first:border-t-0">
                  <span aria-hidden="true" className={clsx("flex size-6 items-center justify-center rounded-full text-xs font-bold", ok ? "bg-[#e4f2ec] text-[#14532d]" : "bg-[#f6e4e4] text-[#7a1f1f]")}>{ok ? "✓" : "✕"}</span>
                  <span className="min-w-0 flex-1"><span className="font-semibold">{q.topic}</span> <span className="text-muted">· {q.typeLabel}</span><span className="sr-only">{ok ? ": right" : ": not right"}</span></span>
                  {!ok && l && review && <Link href={`${courseHref}/lessons/${review}`} className="font-semibold text-red-strong underline-offset-4 hover:underline">Revisit lesson {l.no}: {l.title}</Link>}
                </li>
              );
            })}
          </ol>
          {missed.length === 0 && <p className="border-t border-line/20 px-5 py-3 text-sm text-muted">Every answer right.</p>}
        </section>
      </div>
    );
  }

  if (stage === "review") {
    return (
      <div className="rounded-lg border border-line/30 bg-white p-6">
        <h2 className="text-xl font-bold">Ready to submit?</h2>
        <ol className="mt-4 flex flex-col gap-1 text-sm">
          {QUESTIONS.map((q, k) => (
            <li key={k} className="flex items-center justify-between gap-3 rounded px-2 py-2 hover:bg-slate-50">
              <span>{k + 1}. {q.topic} <span className="text-muted">· {q.typeLabel}</span></span>
              <span className="flex items-center gap-3">
                <span className={isAnswered(answers[k]) ? "text-[#14532d]" : "text-[#b45309]"}>{isAnswered(answers[k]) ? "Answered" : "Not answered"}</span>
                {q.type !== "timed" && <button type="button" onClick={() => goTo(k)} className="font-semibold text-red-strong underline-offset-4 hover:underline">Change</button>}
              </span>
            </li>
          ))}
        </ol>
        {result && !result.ok && <p role="alert" className="mt-4 rounded bg-[#f6e4e4] px-3 py-2 text-sm text-[#7a1f1f]">{result.message}</p>}
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={submit} disabled={pending} className={RED_BTN}>{pending ? "Submitting…" : "Submit the final"}</button>
          <button type="button" onClick={() => goTo(QUESTIONS.length - 1)} className={PLAIN_BTN}>Back</button>
        </div>
      </div>
    );
  }

  const q = QUESTIONS[i];
  const a = answers[i];
  const last = i === QUESTIONS.length - 1;
  return (
    <div className="rounded-lg border border-line/30 bg-white">
      <div className="border-b border-line/25 px-6 py-4">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-semibold">Question {i + 1} of {QUESTIONS.length}</span>
          <span className="text-muted">{q.topic} · {q.typeLabel}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-red-strong transition-[width]" style={{ width: `${((i + 1) / QUESTIONS.length) * 100}%` }} /></div>
      </div>
      <div className="px-6 py-6">
        <p className="text-lg font-semibold">{q.prompt}</p>
        <div className="mt-4">
          {q.type === "timed" ? <Timed key={tryNo} deadline={deadline ?? 0} options={q.options} value={a as number | null} onChange={set} />
          : q.type === "mcq" ? <Choices options={q.options} value={a as number | null} onChange={set} />
          : q.type === "multi" ? <Multi options={q.options} value={a as number[]} onChange={set} />
          : q.type === "diagram" ? <Diagrams value={a as number | null} onChange={set} />
          : q.type === "order" ? <Order items={q.items} value={a as number[]} onChange={set} />
          : <textarea value={a as string} onChange={(e) => set(e.target.value)} rows={4} maxLength={2000} aria-label="Your answer" className="w-full rounded-md border border-line/60 p-3 text-sm" placeholder="A sentence or two" />}
        </div>
      </div>
      <div className="flex flex-wrap justify-between gap-2 border-t border-line/25 px-6 py-4">
        <button type="button" onClick={() => goTo(i - 1)} disabled={i === 0} className={PLAIN_BTN}>Back</button>
        <button type="button" onClick={() => (last ? setStage("review") : goTo(i + 1))} className={RED_BTN}>{last ? "Review answers" : "Next"} <span aria-hidden="true">→</span></button>
      </div>
    </div>
  );
}

function Choices({ options, value, onChange, disabled }: { options: string[]; value: number | null; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" className="flex flex-col gap-2">
      {options.map((o, k) => (
        <label key={k} className={clsx("flex cursor-pointer items-center gap-3 rounded-md border px-3 py-3 text-sm", value === k ? "border-red-strong bg-red-tint" : "border-line/40 hover:bg-slate-50", disabled && "cursor-not-allowed opacity-60")}>
          <input type="radio" checked={value === k} disabled={disabled} onChange={() => onChange(k)} className="size-4 accent-red-strong" />{o}
        </label>
      ))}
    </div>
  );
}

function Multi({ options, value, onChange }: { options: string[]; value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">Pick all that apply.</p>
      {options.map((o, k) => {
        const on = value.includes(k);
        return (
          <label key={k} className={clsx("flex cursor-pointer items-center gap-3 rounded-md border px-3 py-3 text-sm", on ? "border-red-strong bg-red-tint" : "border-line/40 hover:bg-slate-50")}>
            <input type="checkbox" checked={on} onChange={() => onChange(on ? value.filter((x) => x !== k) : [...value, k].sort())} className="size-4 accent-red-strong" />{o}
          </label>
        );
      })}
    </div>
  );
}

function Diagrams({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div role="radiogroup" className="grid gap-3 sm:grid-cols-3">
      {DIAGRAMS.map((d, k) => (
        <label key={k} className={clsx("flex cursor-pointer flex-col gap-3 rounded-md border p-3 text-sm", value === k ? "border-red-strong bg-red-tint" : "border-line/40 hover:bg-slate-50")}>
          <span className="flex items-center gap-2"><input type="radio" checked={value === k} onChange={() => onChange(k)} className="size-4 accent-red-strong" /><span className="font-semibold">Design {String.fromCharCode(65 + k)}</span></span>
          <span aria-hidden="true" className="flex flex-col items-center gap-1.5 rounded bg-white p-3">
            {d.rows.map((row, r) => (
              <span key={r} className="flex gap-1.5">{row.map((b, x) => <span key={x} className="rounded border border-line/60 px-2 py-1 text-xs font-semibold">{b}</span>)}</span>
            ))}
          </span>
          <span className="text-muted">{d.caption}</span>
        </label>
      ))}
    </div>
  );
}

function Order({ items, value, onChange }: { items: string[]; value: number[]; onChange: (v: number[]) => void }) {
  const move = (k: number, by: -1 | 1) => {
    const next = [...value];
    [next[k], next[k + by]] = [next[k + by], next[k]];
    onChange(next);
  };
  return (
    <ol className="flex flex-col gap-2">
      {value.map((item, k) => (
        <li key={item} className="flex items-center gap-3 rounded-md border border-line/40 px-3 py-2 text-sm">
          <span className="w-5 text-right font-bold tabular-nums text-muted">{k + 1}</span>
          <span className="flex-1 font-semibold">{items[item]}</span>
          <button type="button" onClick={() => move(k, -1)} disabled={k === 0} aria-label={`Move ${items[item]} up`} className="flex size-9 items-center justify-center rounded border border-line/50 hover:bg-slate-50 disabled:opacity-30">↑</button>
          <button type="button" onClick={() => move(k, 1)} disabled={k === value.length - 1} aria-label={`Move ${items[item]} down`} className="flex size-9 items-center justify-center rounded border border-line/50 hover:bg-slate-50 disabled:opacity-30">↓</button>
        </li>
      ))}
    </ol>
  );
}

/** The timed question: the clock runs from when it first opened in this try, and the choices lock at zero. */
function Timed({ deadline, options, value, onChange }: { deadline: number; options: string[]; value: number | null; onChange: (v: number) => void }) {
  const secondsLeft = () => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  const [left, setLeft] = useState(secondsLeft);
  useEffect(() => {
    const t = window.setInterval(() => setLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))), 250);
    return () => window.clearInterval(t);
  }, [deadline]);
  return (
    <div>
      <p role="timer" aria-live={left <= 10 ? "polite" : "off"} className={clsx("mb-3 inline-flex rounded px-2 py-1 text-sm font-bold tabular-nums", left <= 10 ? "bg-[#fdf1e7] text-[#6b3300]" : "bg-slate-100")}>
        {left > 0 ? `${left} seconds left` : "Time's up"}
      </p>
      <Choices options={options} value={value} onChange={onChange} disabled={left === 0} />
    </div>
  );
}
