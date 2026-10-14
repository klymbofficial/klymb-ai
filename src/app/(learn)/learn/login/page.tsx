import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LearnerLoginForm } from "@/components/learner/LearnerLoginForm";
import { Wordmark } from "@/components/layout/Wordmark";
import { getLearnerState } from "@/lib/learner/data";
import { DEVICE_IDLE_DAYS } from "@/lib/learner/device";

export const metadata: Metadata = { title: "Learner sign-in", robots: { index: false, follow: false } };

export default async function LearnerLoginPage({ searchParams }: { searchParams: Promise<{ error?: string; welcome?: string }> }) {
  const { error, welcome } = await searchParams;
  const state = await getLearnerState();
  // Another device holds this learner's slot: stay here and explain, never loop back to /learn.
  const blocked = state.state === "other-device" || error === "device";
  if (state.state !== "signed-out" && state.state !== "other-device") redirect("/learn");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Wordmark className="text-2xl" />
          <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.18em] text-muted">Learner sign-in</p>
        </div>
        <div className="card p-6 sm:p-8">
          {blocked ? (
            <>
              <h1 className="display text-2xl">Signed in on another device</h1>
              <p className="mt-2 text-sm text-muted">
                Your Klymb account can be used on one device at a time. Sign out on the other device first, then sign in here.
              </p>
              <p className="mt-3 text-sm text-muted">
                Lost that device? The lock frees itself after {DEVICE_IDLE_DAYS} days without use, or email{" "}
                <a href="mailto:team@klymb.ai" className="font-semibold underline underline-offset-2">team@klymb.ai</a> and we&apos;ll reset it.
              </p>
            </>
          ) : welcome ? (
            <>
              <h1 className="display text-2xl">One step to Day 1</h1>
              <p className="mt-2 text-sm text-muted">
                Your place is reserved. Create your sign-in with the <strong className="text-ink">same email you registered with</strong>:
                Google is quickest: and Day 1 opens straight away.
              </p>
            </>
          ) : (
            <>
              <h1 className="display text-2xl">Welcome back</h1>
              <p className="mt-2 text-sm text-muted">
                Sign in with the email you enrolled with. Not enrolled yet?{" "}
                <a href="/register?track=project-manager" className="font-semibold underline underline-offset-2">Register for the cohort</a>.
              </p>
            </>
          )}
          <LearnerLoginForm error={error && !blocked ? "Google sign-in did not complete. Please try again." : undefined} />
        </div>
      </div>
    </div>
  );
}
