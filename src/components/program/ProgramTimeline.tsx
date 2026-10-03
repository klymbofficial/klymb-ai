import { Spotlight } from "@/components/effects/Spotlight";
import { LazyMount } from "@/components/lazy/LazyMount";
import { LazyHelix } from "@/components/three/LazyHelix";
import { mockInterviewPhase, weekPhases } from "@/data/program";

/**
 * The 30 days as a backlit timeline: a dark band, five glowing nodes, and a
 * red line that draws itself through them as the band scrolls past
 * (`.timeline-*` in globals.css, scroll-driven CSS; drawn in full where
 * unsupported or with reduced motion). Cards glow under the cursor.
 */
export function ProgramTimeline() {
  const phases = [
    ...weekPhases.map((p) => ({ key: `W${p.week}`, ...p })),
    { key: "MI", week: 5, ...mockInterviewPhase },
  ];
  return (
    <section aria-labelledby="timeline-title" className="timeline relative overflow-hidden bg-night text-paper">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_20%_0%,rgb(131_5_11/0.45),transparent_70%),radial-gradient(40%_50%_at_90%_100%,rgb(240_134_139/0.12),transparent_70%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-red-soft">The arc</p>
            <h2 id="timeline-title" className="display mt-3 max-w-2xl text-[clamp(1.9rem,4vw,3rem)] text-balance">Four weeks, four proofs, then two interviews.</h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
              Thirty steps, one a day. The red ones are the weekly checkpoints you defend; the one at the top is the interview.
            </p>
          </div>
          {/* The 30 days as a 3D staircase: large screens with a mouse only, loaded on approach. */}
          <LazyMount margin="300px" className="hidden h-72 lg:block">
            <LazyHelix className="h-72 w-full" />
          </LazyMount>
        </div>

        <ol className="relative mt-14 grid gap-5 md:grid-cols-5 md:gap-4">
          {/* The rail behind the nodes, and the red line that fills it. */}
          <span aria-hidden="true" className="absolute top-5 right-[10%] left-[10%] hidden h-[2px] bg-white/10 md:block" />
          <span aria-hidden="true" className="timeline-fill absolute top-5 left-[10%] hidden h-[2px] w-[80%] origin-left bg-red-soft shadow-[0_0_16px_rgb(240_134_139/0.9)] md:block" />
          {phases.map((p, i) => (
            <li key={p.key} className="relative">
              <span
                aria-hidden="true"
                className="timeline-node relative z-10 mx-auto mb-6 hidden size-10 place-items-center rounded-full border-2 border-red-soft bg-night text-xs font-black text-red-soft md:grid"
                style={{ "--i": i } as React.CSSProperties}
              >
                {p.key}
              </span>
              <Spotlight tone="white" className="h-full rounded-card">
                <div className={`relative z-[2] h-full rounded-card p-5 ring-1 transition-colors duration-300 ${p.key === "MI" ? "bg-red-strong/25 ring-red-soft/40" : "bg-white/[0.05] ring-white/10 hover:bg-white/[0.08]"}`}>
                  <p className="display text-3xl text-red-soft md:hidden">{p.key}</p>
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-white/55">{p.days}</p>
                  <h3 className="mt-1 text-lg font-extrabold leading-snug">{p.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{p.summary}</p>
                </div>
              </Spotlight>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
