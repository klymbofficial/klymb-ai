"use client";

import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { submitTest } from "@/app/assessment/[token]/actions";
import { AnswerEditor, type AnswerControl } from "@/components/company/AnswerEditor";
import { AttemptFiles, type ShownFile } from "@/components/company/AttemptFiles";
import { McqAnswer } from "@/components/company/McqAnswer";
import { SubmitDialog, TestBar, type TestBarParts } from "@/components/company/TestBar";
import type { CandidateQuestion } from "@/lib/company/assessment-rules";

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
 * everything first and names any question left unanswered. Submit sits in
 * the top bar beside the timer (user, 27 Nov) and asks in a dialog first.
 * On a phone the list folds into a menu above the question.
 */
export function QuestionsWork({
  token, attemptId, questions, answers, files, deadline, serverNow, timeZone, bar,
}: {
  token: string;
  attemptId: string;
  questions: CandidateQuestion[];
  answers: Record<number, StartingAnswer>;
  files: Record<number, ShownFile[]>;
  deadline: string;
  serverNow: string;
  timeZone: string;
  /** The top bar's name and timer, drawn on the server. */
  bar: TestBarParts;
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
    <>
    <TestBar parts={bar} over={over} disabled={pending || busy} onSubmit={() => void ask()} label={busy ? "Wait for the file…" : pending ? "Saving…" : "Submit test"} />
    {problem && !asking && <p role="alert" className="-mt-2 rounded-md border border-error/40 bg-white px-4 py-2 text-sm font-semibold text-error">{problem}</p>}
    {over && <p role="status" className="-mt-2 rounded-md border border-line/40 bg-white px-4 py-2 text-sm">Time is up. What you saved will be submitted automatically. <a href={`/assessment/${token}`} className="font-bold underline underline-offset-4">See your receipt</a></p>}
    <SubmitDialog
      open={asking && !over}
      warning={missing.length ? `${missing.length === 1 ? "Question" : "Questions"} ${missing.join(", ")} ${missing.length === 1 ? "has" : "have"} no answer yet.` : null}
      pending={pending}
      blocked={busy}
      onConfirm={() => void submit()}
      onCancel={() => setAsking(false)}
    />
    <div ref={top} className="grid scroll-mt-28 gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <div className="lg:hidden">
        <button type="button" onClick={() => setMenu((m) => !m)} aria-expanded={menu} className={SECONDARY}>
          Question {current + 1} of {questions.length} · {done} answered
        </button>
        {menu && <div className="mt-2 rounded-xl border border-line/30 bg-white p-3 shadow-card">{list}</div>}
      </div>
      <aside className="hidden lg:block"><div className="sticky top-28 rounded-xl border border-line/30 bg-white p-3 shadow-card">{list}</div></aside>

      <div className="flex min-w-0 flex-col gap-6">
        {questions.map((x, i) => {
          const a = answers[x.no];
          return (
            <div key={x.no} hidden={i !== current} className="flex flex-col gap-6">
              <section aria-labelledby={`q${x.no}-title`} className="rounded-xl border border-line/30 bg-white p-6 shadow-card sm:p-8">
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

      </div>
    </div>
    </>
  );
}
