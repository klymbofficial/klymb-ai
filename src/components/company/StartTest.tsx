"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { startTest, type StartResult } from "@/app/assessment/[token]/actions";

const input = "w-full rounded-md border-2 border-line/50 bg-white px-3 py-2 text-sm focus:border-ink";
const START = "inline-flex min-h-11 items-center rounded-md border-2 border-red-strong bg-red-strong px-6 text-base font-bold text-white hover:border-red-press hover:bg-red-press disabled:opacity-50";
const TYPE: Record<string, string> = { phone: "tel", url: "url", years: "text", year: "text", text: "text" };
const MODE: Record<string, "tel" | "decimal" | "numeric" | "url" | "text"> = { phone: "tel", url: "url", years: "decimal", year: "numeric", text: "text" };

/**
 * The candidate's Start button. When the company asks for details (U06b),
 * they're filled in here first, all required. It asks once more on the page
 * (not a browser dialog), since the clock can't be paused, then the server starts (or resumes) the attempt
 * and opens it. What they typed comes back with any problem, so nothing is
 * lost.
 */
export function StartTest({ token, allowed, fields = [], rules = [], webcam = false }: {
  token: string;
  allowed: string;
  fields?: { key: string; label: string; kind: string; max: number }[];
  /** Proctoring (0070), one line each, shown before Start. */
  rules?: string[];
  /** Webcam snapshots are on: the person must agree first. */
  webcam?: boolean;
}) {
  const [state, action, pending] = useActionState<StartResult, FormData>(startTest, null);
  // The question is open for the result it was asked after; a new result from the server (a problem to fix) closes it.
  const [askedFor, setAskedFor] = useState<StartResult | undefined>(undefined);
  const asking = askedFor === state;
  const setAsking = (on: boolean) => setAskedFor(on ? state : undefined);
  const yes = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (asking) yes.current?.focus(); }, [asking]);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!asking) { e.preventDefault(); setAsking(true); }
      }}
      className="mt-6 flex flex-col items-start gap-3"
    >
      <input type="hidden" name="token" value={token} />
      {fields.length > 0 && (
        <fieldset className="flex w-full max-w-md flex-col gap-3">
          <legend className="mb-1 text-sm font-bold">Before you start, the company asks for:</legend>
          {fields.map((f) => (
            <label key={f.key} className="flex flex-col gap-1 text-sm font-semibold">
              {f.label}
              <input
                name={f.key}
                type={TYPE[f.kind] ?? "text"}
                inputMode={MODE[f.kind] ?? "text"}
                maxLength={f.max}
                required
                defaultValue={state?.values?.[f.key] ?? ""}
                autoComplete={f.kind === "phone" ? "tel" : "off"}
                className={input}
              />
            </label>
          ))}
        </fieldset>
      )}
      {rules.length > 0 && (
        <div className="w-full max-w-md rounded-md border-2 border-line/40 bg-white p-4 text-sm">
          <p className="font-bold">This test is proctored</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">{rules.map((r) => <li key={r}>{r}</li>)}</ul>
          {webcam && (
            <label className="mt-3 flex items-start gap-2 font-semibold">
              <input type="checkbox" name="webcam_consent" required className="mt-1" />
              I agree to webcam snapshots during this test.
            </label>
          )}
        </div>
      )}
      {asking ? (
        <div role="group" aria-labelledby="start-ask" className="flex w-full max-w-md flex-col gap-3 rounded-md border-2 border-ink/80 bg-white p-4">
          <p id="start-ask" className="text-sm font-semibold">Start now? You&apos;ll have {allowed}, and the clock keeps running if you close the page.</p>
          <div className="flex flex-wrap gap-2">
            <button ref={yes} type="submit" disabled={pending} className={START}>{pending ? "Starting…" : "Yes, start now"}</button>
            <button
              type="button"
              disabled={pending}
              onClick={() => { setAsking(false); requestAnimationFrame(() => first.current?.focus()); }}
              onKeyDown={(e) => { if (e.key === "Escape") setAsking(false); }}
              className="inline-flex min-h-11 items-center rounded-md border-2 border-line/50 bg-white px-5 text-base font-bold hover:border-ink"
            >
              Not yet
            </button>
          </div>
        </div>
      ) : (
        <button ref={first} type="submit" disabled={pending} className={START}>Start the test</button>
      )}
      {state?.message && <p role="alert" className="text-sm font-semibold text-error">{state.message}</p>}
    </form>
  );
}
