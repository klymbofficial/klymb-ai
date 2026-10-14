import type { Metadata } from "next";
import { Wordmark } from "@/components/layout/Wordmark";
import { StudyBuddy } from "@/components/learner/StudyBuddy";

export const metadata: Metadata = { title: "Back soon", robots: { index: false, follow: false } };

/** Shown for every public page while SITE_CLOSED is on (src/lib/site-status.ts). */
export default function ClosedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-16 text-center">
      <Wordmark className="text-2xl" />
      <div className="mt-10 flex justify-center">
        <StudyBuddy tone="light" size={96} message="We're taking a short break to make Klymb even better. See you soon!" />
      </div>
      <h1 className="display mt-10 max-w-2xl text-[clamp(2rem,5vw,3.25rem)] text-balance">
        Klymb.ai is taking a short break.
      </h1>
      <p className="mt-4 max-w-xl text-muted">
        The site will be back soon. Questions in the meantime? Write to us any time.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <a href="mailto:team@klymb.ai" className="inline-flex items-center rounded-full bg-red-strong px-6 py-3 text-sm font-bold text-white transition-[background-color,transform] duration-150 hover:bg-red-press active:scale-[0.97]">
          team@klymb.ai
        </a>
      </div>
    </main>
  );
}
