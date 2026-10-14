"use client";

import { useState } from "react";
import { resetLearnerDevice } from "@/app/admin/learner-actions";

/** Lets a learner sign in on a new device straight away (lost or changed phone). */
export function ResetDeviceButton({ id }: { id: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  return (
    <span className="inline-flex items-center gap-3">
      <button
        type="button"
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          setState((await resetLearnerDevice(id)).ok ? "done" : "error");
        }}
        className="rounded-md border border-line/50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-surface disabled:opacity-50"
      >
        {state === "busy" ? "Resetting…" : "Reset device lock"}
      </button>
      {state === "done" && <span className="text-xs font-semibold text-ink">Done: they can sign in on any device now.</span>}
      {state === "error" && <span role="alert" className="text-xs font-semibold text-error">That didn&apos;t work. Try again.</span>}
    </span>
  );
}
