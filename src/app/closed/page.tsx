import type { Metadata } from "next";
import { Wordmark } from "@/components/layout/Wordmark";
import { StudyBuddy } from "@/components/learner/StudyBuddy";

export const metadata: Metadata = { title: "Something bigger is coming", robots: { index: false, follow: false } };

/** Shown for every page while SITE_CLOSED is on (src/lib/site-status.ts): a teaser for the Claude Challenge. */
export default function ClosedPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-paper px-4 py-16 text-center">
      {/* A soft brand glow behind the announcement. */}
      <div aria-hidden="true" className="pointer-events-none absolute top-1/3 left-1/2 size-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(131_5_11/0.12),transparent)]" />

      <Wordmark className="relative text-2xl" />
      <div className="relative mt-10 flex justify-center">
        <StudyBuddy tone="light" size={96} message="Psst… we're building something big. You'll want to be there." />
      </div>

      <p className="relative mt-10 inline-flex items-center gap-2 rounded-full bg-red-strong px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-white">
        <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-white" />
        Coming soon
      </p>
      <h1 className="display relative mt-5 max-w-3xl text-[clamp(2.2rem,6vw,4rem)] text-balance">
        A bigger <span className="text-red-strong">Claude Challenge</span> is on its way.
      </h1>
      <p className="relative mt-5 max-w-xl text-[17px] leading-relaxed text-muted">
        Klymb.ai is taking a short break while we prepare it. Bigger problems, real builds, and a chance to show what you can do.
      </p>

      <a
        href="mailto:team@klymb.ai?subject=Tell%20me%20when%20the%20Claude%20Challenge%20opens"
        className="relative mt-9 inline-flex items-center gap-2 rounded-full bg-red-strong px-7 py-3.5 text-sm font-bold text-white transition-[background-color,transform] duration-150 hover:bg-red-press active:scale-[0.97]"
      >
        Tell me when it opens <span aria-hidden="true">→</span>
      </a>
      <p className="relative mt-4 text-sm text-muted">Or write to us any time at team@klymb.ai</p>
    </main>
  );
}
