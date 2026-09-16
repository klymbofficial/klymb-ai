import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LearnerLoginForm } from "@/components/learner/LearnerLoginForm";
import { Wordmark } from "@/components/layout/Wordmark";
import { getLearnerState } from "@/lib/learner/data";

export const metadata: Metadata = { title: "Learner sign-in", robots: { index: false, follow: false } };

export default async function LearnerLoginPage({ searchParams }: { searchParams: Promise<{ error?: string; welcome?: string }> }) {
  const { error, welcome } = await searchParams;
  const state = await getLearnerState();
  if (state.state !== "signed-out") redirect("/learn");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Wordmark className="text-2xl" />
          <p className="mt-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted">Learner sign-in</p>
        </div>
        <div className="border-2 border-line bg-paper p-6 sm:p-8">
          {welcome ? (
            <>
              <h1 className="display text-2xl">One step to Day 1</h1>
              <p className="mt-2 text-sm text-muted">
                Your place is reserved. Create your sign-in with the <strong className="text-ink">same email you registered with</strong> —
                Google is quickest — and Day 1 opens straight away.
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
          <LearnerLoginForm error={error ? "Google sign-in did not complete. Please try again." : undefined} />
        </div>
      </div>
    </div>
  );
}
