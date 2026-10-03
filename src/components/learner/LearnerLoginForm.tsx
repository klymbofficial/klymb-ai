"use client";

import { signInLearner } from "@/app/(learn)/learn/actions";
import { useEffect } from "react";
import { GoogleMark } from "@/components/ui/GoogleMark";

export function LearnerLoginForm({ error }: { error?: string }) {
  // Reaching sign-in means no one is signed in here: drop any saved course pages.
  useEffect(() => {
    navigator.serviceWorker?.controller?.postMessage({ type: "clear-learner" });
  }, []);
  return (
    <div className="mt-6 flex flex-col gap-4">
      <form action={signInLearner}>
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-line/50 bg-white px-4 py-3 shadow-card text-sm font-bold text-ink transition-colors hover:bg-surface"
        >
          <GoogleMark />
          Continue with Google
        </button>
      </form>
      {error && <p role="alert" className="border-2 border-error bg-error-tint p-3 text-sm font-semibold text-error">{error}</p>}
      <p className="text-xs text-muted">Use the same email you registered with, so we can find your place.</p>
    </div>
  );
}
