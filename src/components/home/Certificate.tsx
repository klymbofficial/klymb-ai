import { Appear } from "@/components/motion/Appear";
import { Eyebrow } from "@/components/ui/Eyebrow";

const earnedBy = [
  "All 30 daily problems submitted",
  "All four weekly checkpoints passed and defended",
  "Both mock interviews attended, with written feedback",
  "Every piece checked by a reviewer, not issued automatically",
];

/** The certificate is earned, not attended: the same bar that triggers the refund. */
export function Certificate() {
  return (
    <section aria-labelledby="cert-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <Eyebrow>Proof, not attendance</Eyebrow>
          <h2 id="cert-title" className="display mt-3 text-[clamp(1.75rem,3.6vw,2.6rem)] text-balance">
            A certificate you can&apos;t get by watching.
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
            It goes only to people who did the work. The same bar gets your fee back, so finishing pays twice.
          </p>
          <ul className="mt-7 space-y-3">
            {earnedBy.map((e) => (
              <li key={e} className="flex gap-3 text-[15px]">
                <svg className="mt-0.5 size-5 shrink-0 text-red-strong" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true"><path d="m5 12 5 5L19 7" /></svg>
                {e}
              </li>
            ))}
          </ul>
        </div>

        {/* A drawn certificate, tilted slightly, so it reads as an object. */}
        <Appear y={30}>
          <div aria-hidden="true" className="mx-auto max-w-md rotate-[-2deg] rounded-slab bg-card p-2 shadow-float transition-transform duration-500 hover:rotate-0">
            <div className="rounded-[calc(var(--radius-slab)-0.5rem)] border-2 border-red-strong/30 p-8 text-center">
              <p className="text-sm font-black tracking-tight">KLYMB<span className="text-red-strong">.AI</span></p>
              <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.2em] text-muted">Certificate of completion</p>
              <p className="display mt-4 text-3xl">Your name</p>
              <p className="mt-3 text-sm text-muted">completed the 30-day</p>
              <p className="mt-1 font-extrabold">QA Engineer → AI Test Architect</p>
              <p className="mt-1 text-sm text-muted">cohort, with four defended checkpoints and two mock interviews.</p>
              <div className="mt-8 flex items-end justify-between text-left text-xs text-muted">
                <span>Verified by a reviewer<br /><span className="font-mono">KLY-2026-0001</span></span>
                <span className="grid size-14 place-items-center rounded-full bg-red-strong text-[10px] font-black text-white">30/30</span>
              </div>
            </div>
          </div>
        </Appear>
      </div>
    </section>
  );
}
