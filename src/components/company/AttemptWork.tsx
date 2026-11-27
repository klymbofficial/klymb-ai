"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { submitTest } from "@/app/assessment/[token]/actions";
import { AnswerEditor, type AnswerControl } from "@/components/company/AnswerEditor";
import { AttemptFiles, type ShownFile } from "@/components/company/AttemptFiles";
import { SubmitDialog, TestBar, type TestBarParts } from "@/components/company/TestBar";


const WHY: Record<string, string> = {
  conflict: "Your answer was saved in another tab or device. Reload this page, check it, then submit.",
  stale: "Your answer was saved in another tab or device. Reload this page, check it, then submit.",
  time: "Time is up. What you saved is submitted automatically; reload in a minute to see your receipt.",
  closed: "Time is up. What you saved is submitted automatically; reload in a minute to see your receipt.",
  link: "This link no longer opens the test. Reload the page to see why.",
  refused: "This link no longer opens the test. Reload the page to see why.",
  submitted: "This test is already submitted. Reload to see your receipt.",
  network: "Your answer couldn't be saved, so it wasn't submitted. Check your connection and try again.",
  error: "That didn't go through. Try again in a moment; your saved answer is safe.",
};

/**
 * The running test's work area: the top bar with the timer and Submit (user,
 * 27 Nov), the task, the answer box and the files (for written_file tests). Submit asks once, waits for any upload, saves what is
 * typed, then submits the revision this page shows. The server copies that
 * answer and the files into a frozen submission and opens the receipt.
 */
export function AttemptWork({
  token, attemptId, withFiles, initialAnswer, initialRevision, initialSavedAt, initialFiles, deadline, serverNow, timeZone, bar, task,
}: {
  token: string;
  attemptId: string;
  withFiles: boolean;
  initialAnswer: string;
  initialRevision: number;
  initialSavedAt: string | null;
  initialFiles: ShownFile[];
  deadline: string;
  serverNow: string;
  timeZone: string;
  /** The top bar's name and timer, drawn on the server. */
  bar: TestBarParts;
  /** The task itself, shown under the bar. */
  task: React.ReactNode;
}) {
  const control = useRef<AnswerControl | null>(null);
  const [files, setFiles] = useState({ count: initialFiles.length, busy: false });
  const onFiles = useCallback((s: { count: number; busy: boolean }) => setFiles(s), []);
  const [asking, setAsking] = useState<null | { empty: boolean }>(null);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [skew] = useState(() => new Date(serverNow).getTime() - Date.now());

  useEffect(() => {
    const id = window.setTimeout(() => { setOver(true); setAsking(null); }, Math.max(0, new Date(deadline).getTime() - (Date.now() + skew)));
    return () => window.clearTimeout(id);
  }, [deadline, skew]);

  async function ask() {
    setProblem(null);
    setPending(true);
    const saved = await control.current?.flush();
    setPending(false);
    if (!saved) return setProblem(WHY.error);
    if (!saved.ok) return setProblem(WHY[saved.why]);
    setAsking({ empty: saved.empty });
  }

  async function submit() {
    setPending(true);
    setProblem(null);
    try {
      // Save once more: they may have typed while the question was showing.
      const saved = await control.current?.flush();
      if (!saved || !saved.ok) { setAsking(null); return setProblem(WHY[saved ? saved.why : "error"]); }
      const out = await submitTest(token, attemptId, saved.revision);
      // On success the server opens the receipt; anything that comes back is a reason it didn't.
      setAsking(null);
      if (out) setProblem(WHY[out.status] ?? WHY.error);
    } catch {
      setAsking(null);
      setProblem(WHY.error);
    } finally {
      setPending(false);
    }
  }

  const warning = asking && (asking.empty || (withFiles && files.count === 0))
    ? asking.empty && withFiles && files.count === 0 ? "Your answer is empty and no files are attached."
      : asking.empty ? "Your answer is empty." : "No files are attached."
    : null;

  return (
    <>
      <TestBar parts={bar} over={over} disabled={pending || files.busy} onSubmit={() => void ask()} label={files.busy ? "Wait for the file…" : pending ? "Saving…" : "Submit test"} />
      {problem && !asking && <p role="alert" className="-mt-2 rounded-md border border-error/40 bg-white px-4 py-2 text-sm font-semibold text-error">{problem}</p>}
      {over && <p role="status" className="-mt-2 rounded-md border border-line/40 bg-white px-4 py-2 text-sm">Time is up. What you saved{withFiles ? " and the files attached" : ""} will be submitted automatically. <a href={`/assessment/${token}`} className="font-bold underline underline-offset-4">See your receipt</a></p>}
      <SubmitDialog open={!!asking && !over} warning={warning} pending={pending} blocked={files.busy} onConfirm={() => void submit()} onCancel={() => setAsking(null)} />
      {task}
      <AnswerEditor
        token={token}
        attemptId={attemptId}
        initialAnswer={initialAnswer}
        initialRevision={initialRevision}
        initialSavedAt={initialSavedAt}
        deadline={deadline}
        serverNow={serverNow}
        timeZone={timeZone}
        controlRef={control}
      />
      {withFiles && <AttemptFiles token={token} attemptId={attemptId} initial={initialFiles} deadline={deadline} serverNow={serverNow} onChange={onFiles} />}
    </>
  );
}
