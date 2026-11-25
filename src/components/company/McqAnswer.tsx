"use client";

import clsx from "clsx";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { saveQuestion } from "@/app/assessment/[token]/actions";
import type { AnswerControl } from "@/components/company/AnswerEditor";

const RETRY_MS = [3000, 6000, 12000, 20000, 30000];
type Lock = "time" | "conflict" | "link" | "submitted";
const same = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * A multiple-choice answer (L2): one option, or every option that applies.
 * Each change saves at once, naming the revision it built on, like the
 * answer box; a save from another tab stops this one and asks for a reload.
 * The page never knows which options are right.
 */
export function McqAnswer({
  token, attemptId, questionNo, options, multi, initialPicked, initialRevision, deadline, serverNow, controlRef, onAnswered,
}: {
  token: string;
  attemptId: string;
  questionNo: number;
  options: string[];
  multi: boolean;
  initialPicked: number[];
  initialRevision: number;
  deadline: string;
  serverNow: string;
  controlRef?: Ref<AnswerControl>;
  onAnswered?: (answered: boolean) => void;
}) {
  const [picked, setPicked] = useState<number[]>(initialPicked);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "retrying">(initialRevision ? "saved" : "idle");
  const [locked, setLocked] = useState<Lock | null>(null);
  const lockedRef = useRef<Lock | null>(null);
  const lock = useCallback((why: Lock) => { lockedRef.current = lockedRef.current ?? why; setLocked((l) => l ?? why); }, []);
  const want = useRef(initialPicked);
  const savedPicks = useRef(initialPicked);
  const revision = useRef(initialRevision);
  const inFlight = useRef(false);
  const failures = useRef(0);
  const timer = useRef<number | null>(null);
  const saveRef = useRef<() => Promise<void>>(async () => {});
  const [skew] = useState(() => new Date(serverNow).getTime() - Date.now());

  const save = useCallback(async () => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    if (inFlight.current || lockedRef.current) return;
    const snapshot = want.current;
    if (same(snapshot, savedPicks.current) && revision.current) return;
    inFlight.current = true;
    setState("saving");
    let out: Awaited<ReturnType<typeof saveQuestion>> | null = null;
    try {
      out = await saveQuestion(token, attemptId, questionNo, revision.current, "", snapshot);
    } catch {
      out = null;
    }
    inFlight.current = false;
    if (out?.status === "saved") {
      failures.current = 0;
      revision.current = out.revision;
      savedPicks.current = snapshot;
      onAnswered?.(snapshot.length > 0);
      setState("saved");
      if (!same(want.current, snapshot)) void saveRef.current();
      return;
    }
    if (out?.status === "conflict") return lock("conflict");
    if (out?.status === "closed") return lock("time");
    if (out?.status === "submitted") return lock("submitted");
    if (out?.status === "refused") return lock("link");
    const wait = RETRY_MS[Math.min(failures.current, RETRY_MS.length - 1)];
    failures.current += 1;
    setState("retrying");
    timer.current = window.setTimeout(() => void saveRef.current(), wait);
  }, [token, attemptId, questionNo, lock, onAnswered]);
  useEffect(() => { saveRef.current = save; }, [save]);

  useImperativeHandle(controlRef, () => ({
    async flush() {
      for (let tries = 0; tries < 4; tries += 1) {
        while (inFlight.current) await new Promise((r) => window.setTimeout(r, 150));
        if (lockedRef.current) return { ok: false, why: lockedRef.current };
        if (same(want.current, savedPicks.current)) return { ok: true, revision: revision.current, empty: savedPicks.current.length === 0 };
        await save();
      }
      return { ok: false, why: lockedRef.current ?? "network" };
    },
  }), [save]);

  useEffect(() => {
    const id = window.setTimeout(() => lock("time"), Math.max(0, new Date(deadline).getTime() - (Date.now() + skew)));
    return () => window.clearTimeout(id);
  }, [deadline, skew, lock]);

  function choose(i: number) {
    if (lockedRef.current) return;
    const next = multi ? (picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i].sort((a, b) => a - b)) : [i];
    want.current = next;
    setPicked(next);
    void save();
  }

  const status =
    locked === "conflict" ? "This answer was saved in another tab or device. Reload this page to carry on."
      : locked === "link" ? "This link no longer opens the test. Your last saved choice is kept."
        : locked === "submitted" ? "This test has been submitted. Reload to see your receipt."
          : locked === "time" ? "Time is up. Your last saved choice is what counts."
            : state === "saving" ? "Saving…"
              : state === "retrying" ? "Not saved yet — trying again. Keep this page open."
                : state === "saved" ? "Saved" : "Not answered yet";

  return (
    <section className="card p-6" aria-labelledby={`choice-${questionNo}`}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`choice-${questionNo}`} className="display text-lg">{multi ? "Choose every answer that applies" : "Choose one answer"}</h3>
        <p role="status" aria-live="polite" className={clsx("text-sm", locked === "conflict" || state === "retrying" ? "font-semibold text-error" : "text-muted")}>{status}</p>
      </div>
      <div role={multi ? "group" : "radiogroup"} aria-labelledby={`choice-${questionNo}`} className="flex flex-col gap-2">
        {options.map((o, i) => {
          const on = picked.includes(i);
          return (
            <label key={i} className={clsx("flex cursor-pointer items-start gap-3 rounded-md border-2 px-4 py-3 text-sm", on ? "border-ink bg-white" : "border-line/40 bg-white hover:border-ink", locked && "cursor-default opacity-80")}>
              <input
                type={multi ? "checkbox" : "radio"}
                name={`q${questionNo}`}
                checked={on}
                disabled={!!locked}
                onChange={() => choose(i)}
                className="mt-0.5"
              />
              <span className="whitespace-pre-wrap">{o}</span>
            </label>
          );
        })}
      </div>
      {locked === "conflict" && (
        <button type="button" onClick={() => window.location.reload()} className="mt-3 text-sm font-bold underline underline-offset-4">Reload</button>
      )}
    </section>
  );
}
