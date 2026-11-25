"use client";

import { useActionState } from "react";
import { startTest, type StartResult } from "@/app/assessment/[token]/actions";

/**
 * The candidate's Start button. It asks once more, since the clock can't be
 * paused, then the server starts (or resumes) the attempt and opens it.
 */
export function StartTest({ token, allowed }: { token: string; allowed: string }) {
  const [state, action, pending] = useActionState<StartResult, FormData>(startTest, null);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Start now? You'll have ${allowed}, and the clock keeps running if you close the page.`)) e.preventDefault();
      }}
      className="mt-6 flex flex-col items-start gap-3"
    >
      <input type="hidden" name="token" value={token} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-md border-2 border-red-strong bg-red-strong px-6 text-base font-bold text-white hover:border-red-press hover:bg-red-press disabled:opacity-50"
      >
        {pending ? "Starting…" : "Start the test"}
      </button>
      {state?.message && <p role="alert" className="text-sm font-semibold text-error">{state.message}</p>}
    </form>
  );
}
