"use client";

import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { submitTest } from "@/app/assessment/[token]/actions";
import { AnswerEditor, type AnswerControl } from "@/components/company/AnswerEditor";
import { AttemptFiles, type ShownFile } from "@/components/company/AttemptFiles";
import { McqAnswer } from "@/components/company/McqAnswer";
import type { CandidateQuestion } from "@/lib/company/assessment-rules";

const PRIMARY = "inline-flex min-h-11 items-center rounded-md border-2 border-red-strong bg-red-strong px-6 text-base font-bold text-white hover:border-red-press hover:bg-red-press disabled:opacity-50";
const SECONDARY = "inline-flex min-h-11 items-center rounded-md border-2 border-ink bg-white px-5 text-sm font-bold hover:bg-ink hover:text-paper disabled:opacity-50";

const WHY: Record<string, string> = {
  conflict: "One of your answers was saved in another tab or device. Reload this page, check it, then submit.",
  stale: "One of your answers was saved in another tab or device. Reload this page, check it, then submit.",
  time: "Time is up. What you saved is submitted automatically; reload in a minute to see your receipt.",
  closed: "Time is up. What you saved is submitted automatically; reload in a minute to see your receipt.",
  link: "This link no longer opens the test. Reload the page to see why.",
  refused: "This link no longer opens the test. Reload the page to see why.",
  submitted: "This test is already submitted. Reload to see your receipt.",
  network: "An answer couldn't be saved, so the test wasn't submitted. Check your connection and try again.",
  error: "That didn't go through. Try again in a moment; your saved answers are safe.",
};

export interface StartingAnswer {
  revision: number;
  answer: string;
  picked: number[];
  savedAt: string | null;
}

/**
 * A running test with several questions (L2): the list of questions on the
 * left, under their section headings, with a mark on each answered one; the
 * current question on the right with its own answer box, choices or files,
 * each saving on its own; Previous and Next; and one Submit that saves
 * everything first and names any question left unanswered. On a phone the
 * list folds into a menu above the question.
 */
export function QuestionsWork({
  token, attemptId, questions, answers, files, deadline, serverNow, timeZone,
}: {
  token: string;
  attemptId: string;
  questions: CandidateQuestion[];
  answers: Record<number, StartingAnswer>;
  files: Record<number, ShownFile[]>;
  deadline: string;
  serverNow: string;
  timeZone: string;
}) {
  const [current, setCurrent] = useState(0);
  const [menu, setMenu] = useState(false);
  const [answered, setAnswered] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(questions.map((q) => {
      const a = answers[q.no];
      return [q.no, !!(a && (a.answer.trim() || a.picked.length)) || (files[q.no]?.length ?? 0) > 0];
    })),
  );
  const [fileState, setFileState] = useState<Record<number, { count: number; busy: boolean }>>({});
  const controls = useRef<Record<number, AnswerControl | null>>({});
  const [asking, setAsking] = useState(false);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [skew] = useState(() => new Date(serverNow).getTime() - Date.now());
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => { setOver(true); setAsking(false); }, Math.max(0, new Date(deadline).getTime() - (Date.now() + skew)));
    return () => window.clearTimeout(id);
  }, [deadline, skew]);

  // One stable callback per question, so the answer boxes don't rebuild their save on every render.
  const markers = useMemo(
    () => Object.fromEntries(questions.map((q) => [q.no, (v: boolean) => setAnswered((m) => (m[q.no] === v ? m : { ...m, [q.no]: v }))])) as Record<number, (v: boolean) => void>,
    [questions],
  );
  const fileWatchers = useMemo(
    () => Object.fromEntries(questions.map((q) => [q.no, (st: { count: number; busy: boolean }) => setFileState((m) => ({ ...m, [q.no]: st }))])) as Record<number, (st: { count: number; busy: boolean }) => void>,
    [questions],
  );

  const busy = Object.values(fileState).some((s) => s.busy);
  const isAnswered = (no: number) => answered[no] || (fileState[no]?.count ?? 0) > 0;
  // Worked out on every render, so a save that lands after Submit is pressed counts.
  // Numbered as the candidate sees them, which is their own order when shuffling is on (0099).
  const missing = questions.flatMap((q, i) => (isAnswered(q.no) ? [] : [i + 1]));
  const go = (i: number) => {
    setCurrent(i);
    setMenu(false);
    top.current?.scrollIntoView({ block: "start" });
  };

  async function flushAll(): Promise<string | null> {
    for (const q of questions) {
      const out = await controls.current[q.no]?.flush();
      if (!out) continue;
      if (!out.ok) return out.why;
    }
    return null;
  }

  async function ask() {
    setProblem(null);
    setPending(true);
    const why = await flushAll();
    setPending(false);
    if (why) return setProblem(WHY[why] ?? WHY.error);
    setAsking(true);
  }

  async function submit() {
    setPending(true);
    setProblem(null);
    try {
      const why = await flushAll();
      if (why) { setAsking(false); return setProblem(WHY[why] ?? WHY.error); }
      const out = await submitTest(token, attemptId, null);
      setAsking(false);
      if (out) setProblem(WHY[out.status] ?? WHY.error);
    } catch {
      setAsking(false);
      setProblem(WHY.error);
    } finally {
      setPending(false);
    }
  }

  const done = questions.filter((q) => isAnswered(q.no)).length;

  const list = (
    <nav aria-label="Questions">
      <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-muted">{done} of {questions.length} answered</p>
      <ol className="flex flex-col gap-1">
        {questions.map((x, i) => (
          <li key={x.no}>
            {x.section && x.section !== questions[i - 1]?.section && (
              <p className="mb-1 mt-3 text-xs font-bold text-muted first:mt-0">{x.section}</p>
            )}
            <button
              type="button"
              onClick={() => go(i)}
              aria-current={i === current ? "step" : undefined}
              className={clsx("flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm", i === current ? "bg-ink text-paper" : "hover:bg-white")}
            >
              <span aria-hidden="true" className={clsx("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold", isAnswered(x.no) ? "border-transparent bg-[#14532d] text-white" : i === current ? "border-paper" : "border-line/60")}>
                {isAnswered(x.no) ? "✓" : i + 1}
              </span>
              <span className="min-w-0">
                <span className="line-clamp-2">{x.title || `Question ${i + 1}`}</span>
                <span className="sr-only">{isAnswered(x.no) ? ", answered" : ", not answered"}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );

  return (
    <div ref={top} className="grid scroll-mt-20 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div className="lg:hidden">
        <button type="button" onClick={() => setMenu((m) => !m)} aria-expanded={menu} className={SECONDARY}>
          Question {current + 1} of {questions.length} · {done} answered
        </button>
        {menu && <div className="card mt-2 p-3">{list}</div>}
      </div>
      <aside className="hidden lg:block"><div className="card sticky top-20 p-3">{list}</div></aside>

      <div className="flex min-w-0 flex-col gap-6">
        {questions.map((x, i) => {
          const a = answers[x.no];
          return (
            <div key={x.no} hidden={i !== current} className="flex flex-col gap-6">
              <section aria-labelledby={`q${x.no}-title`} className="card p-6">
                {x.section && <p className="text-xs font-bold text-muted">{x.section}</p>}
                <p className="mt-1 text-xs text-muted">Question {i + 1} of {questions.length} · {x.points} {x.points === 1 ? "point" : "points"}</p>
                <h2 id={`q${x.no}-title`} className="display mt-2 text-2xl">{x.title}</h2>
                <div className="mt-4 whitespace-pre-line text-sm leading-relaxed">{x.brief}</div>
                {x.areas.length > 0 && (
                  <p className="mt-4 text-xs text-muted">Scored on: {x.areas.map((r) => `${r.title} (${r.points})`).join(", ")}</p>
                )}
              </section>
              {x.kind === "mcq" ? (
                <McqAnswer
                  token={token}
                  attemptId={attemptId}
                  questionNo={x.no}
                  options={x.options}
                  order={x.order}
                  multi={x.multi}
                  initialPicked={a?.picked ?? []}
                  initialRevision={a?.revision ?? 0}
                  deadline={deadline}
                  serverNow={serverNow}
                  controlRef={(c) => { controls.current[x.no] = c; }}
                  onAnswered={markers[x.no]}
                />
              ) : (
                <>
                  <AnswerEditor
                    token={token}
                    attemptId={attemptId}
                    questionNo={x.no}
                    initialAnswer={a?.answer ?? ""}
                    initialRevision={a?.revision ?? 0}
                    initialSavedAt={a?.savedAt ?? null}
                    deadline={deadline}
                    serverNow={serverNow}
                    timeZone={timeZone}
                    controlRef={(c) => { controls.current[x.no] = c; }}
                    onAnswered={markers[x.no]}
                  />
                  {x.kind === "written_file" && (
                    <AttemptFiles token={token} attemptId={attemptId} questionNo={x.no} initial={files[x.no] ?? []} deadline={deadline} serverNow={serverNow} onChange={fileWatchers[x.no]} />
                  )}
                </>
              )}
            </div>
          );
        })}

        <div className="flex flex-wrap justify-between gap-3">
          <button type="button" onClick={() => go(current - 1)} disabled={current === 0} className={SECONDARY}>Previous</button>
          {current < questions.length - 1 && <button type="button" onClick={() => go(current + 1)} className={SECONDARY}>Next question</button>}
        </div>

        <section aria-labelledby="submit-title" className="card p-6">
          <h2 id="submit-title" className="display text-lg">Submit</h2>
          {over ? (
            <p className="mt-2 text-sm">Time is up. What you saved will be submitted automatically. <a href={`/assessment/${token}`} className="font-bold underline underline-offset-4">See your receipt</a></p>
          ) : asking ? (
            <div className="mt-3 border-l-4 border-ink bg-white px-4 py-3">
              <p className="text-sm font-semibold">Submit now? You can&apos;t change any answer after.</p>
              {missing.length > 0 && (
                <p className="mt-1 text-sm text-error">
                  {missing.length === 1 ? "Question " : "Questions "}
                  {missing.join(", ")} {missing.length === 1 ? "has" : "have"} no answer yet.
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" onClick={() => void submit()} disabled={pending || busy} className={PRIMARY}>{pending ? "Submitting…" : "Yes, submit"}</button>
                <button type="button" onClick={() => setAsking(false)} disabled={pending} className={SECONDARY}>Keep working</button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted">{done} of {questions.length} questions answered. Every answer saves as you go; submit when you&apos;re finished.</p>
              <button type="button" onClick={() => void ask()} disabled={pending || busy} className={`mt-4 ${PRIMARY}`}>
                {busy ? "Wait for the file…" : pending ? "Saving…" : "Submit test"}
              </button>
            </>
          )}
          {problem && <p role="alert" className="mt-3 text-sm font-semibold text-error">{problem}</p>}
        </section>
      </div>
    </div>
  );
}
