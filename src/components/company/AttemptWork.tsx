"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { submitTest } from "@/app/assessment/[token]/actions";
import { AnswerEditor, type AnswerControl } from "@/components/company/AnswerEditor";
import { AttemptFiles, type ShownFile } from "@/components/company/AttemptFiles";

const PRIMARY = "inline-flex min-h-11 items-center rounded-md border-2 border-red-strong bg-red-strong px-6 text-base font-bold text-white hover:border-red-press hover:bg-red-press disabled:opacity-50";
const SECONDARY = "inline-flex min-h-11 items-center rounded-md border-2 border-ink bg-white px-5 text-sm font-bold hover:bg-ink hover:text-paper disabled:opacity-50";

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
 * The running test's work area: the answer box, the files (for written_file
 * tests) and Submit. Submit asks once, waits for any upload, saves what is
 * typed, then submits the revision this page shows. The server copies that
 * answer and the files into a frozen submission and opens the receipt.
 */
export function AttemptWork({
  token, attemptId, withFiles, initialAnswer, initialRevision, initialSavedAt, initialFiles, deadline, serverNow, timeZone,
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

  return (
    <>
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

      <section aria-labelledby="submit-title" className="card p-6">
        <h2 id="submit-title" className="display text-lg">Submit</h2>
        {over ? (
          <p className="mt-2 text-sm">Time is up. What you saved{withFiles ? " and the files attached" : ""} will be submitted automatically. <a href={`/assessment/${token}`} className="font-bold underline underline-offset-4">See your receipt</a></p>
        ) : asking ? (
          <div className="mt-3 border-l-4 border-ink bg-white px-4 py-3">
            <p className="text-sm font-semibold">Submit now? You can&apos;t change your answer{withFiles ? " or files" : ""} after.</p>
            {(asking.empty || (withFiles && files.count === 0)) && (
              <p className="mt-1 text-sm text-error">
                {asking.empty && withFiles && files.count === 0 ? "Your answer is empty and no files are attached."
                  : asking.empty ? "Your answer is empty." : "No files are attached."}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="button" onClick={() => void submit()} disabled={pending || files.busy} className={PRIMARY}>{pending ? "Submitting…" : "Yes, submit"}</button>
              <button type="button" onClick={() => setAsking(null)} disabled={pending} className={SECONDARY}>Keep working</button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted">When you&apos;re finished, submit your answer{withFiles ? " and files" : ""}. You can&apos;t change them after.</p>
            <button type="button" onClick={() => void ask()} disabled={pending || files.busy} className={`mt-4 ${PRIMARY}`}>
              {files.busy ? "Wait for the file…" : pending ? "Saving…" : "Submit test"}
            </button>
          </>
        )}
        {problem && <p role="alert" className="mt-3 text-sm font-semibold text-error">{problem}</p>}
      </section>
    </>
  );
}
