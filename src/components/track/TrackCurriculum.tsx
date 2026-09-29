import { weekPhases } from "@/data/program";
import type { Track } from "@/types/program";

/** Full 30-day view for one track: 4 weeks of daily problems, each ending in an assessment. */
export function TrackCurriculum({ track, compact = false }: { track: Track; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {track.weeks.map((week) => {
        const phase = weekPhases.find((p) => p.week === week.week)!;
        return (
          <details
            key={week.week}
            open={!compact && week.week === 1}
            className="group overflow-hidden rounded-card border border-line/30 bg-card shadow-card transition-shadow open:shadow-float"
          >
            <summary className="grid cursor-pointer list-none gap-3 p-5 sm:grid-cols-[9rem_1fr_auto] sm:items-center sm:p-6 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="display display-soft block text-3xl text-red-strong">Week {week.week}</span>
                <span className="mt-1 block text-xs font-semibold text-ink/70">{phase.days}</span>
                <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{phase.name}</span>
              </span>
              <span>
                <span className="block text-lg font-semibold leading-snug">{week.title}</span>
                <span className="mt-1 block text-sm text-muted">{week.focus}</span>
              </span>
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-red-strong text-xl font-black leading-none text-white transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            {/* One plain surface: no striping. A thin rule divides each day
                number from its problem, so the column still reads cleanly. */}
            <ol className="px-3 pb-3 sm:px-4">
              {week.challenges.map((c) => (
                <li key={c.day} className="grid gap-1 px-3 py-2 sm:grid-cols-[5rem_1fr] sm:gap-0 sm:py-0">
                  <span className="text-sm font-semibold text-muted nums sm:py-2.5">Day {c.day}</span>
                  <span className="text-sm sm:border-l sm:border-line/30 sm:py-2.5 sm:pl-4"><span className="font-semibold">{c.title}</span><span className="text-muted">: {c.problem}</span></span>
                </li>
              ))}
              <li className="mt-2 grid gap-1 rounded-xl bg-red-tint px-3 py-2 sm:grid-cols-[5rem_1fr] sm:gap-0 sm:py-1.5">
                <span className="text-sm font-semibold text-red-deep nums sm:py-2.5">Day {week.assessment.afterDay}</span>
                <span className="sm:border-l sm:border-line/30 sm:py-2.5 sm:pl-4">
                  <span className="font-semibold"><span className="text-red-deep">Checkpoint:</span> {week.assessment.title}</span>
                  <span className="mt-0.5 block text-sm">{week.assessment.task}</span>
                  <span className="mt-0.5 block text-xs text-muted">{week.assessment.format}</span>
                </span>
              </li>
            </ol>
          </details>
        );
      })}
    </div>
  );
}
