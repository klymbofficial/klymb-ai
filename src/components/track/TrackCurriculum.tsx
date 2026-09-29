import { mockInterviewPhase, weekPhases } from "@/data/program";
import type { Track } from "@/types/program";

/** Full 30-day view for one track: 4 weeks, daily problems, assessments, mock interviews. */
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
                <span className="display block text-3xl text-red-strong">Week {week.week}</span>
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">{phase.days} · {phase.name}</span>
              </span>
              <span>
                <span className="block text-lg font-extrabold leading-snug">{week.title}</span>
                <span className="mt-1 block text-sm text-muted">{week.focus}</span>
              </span>
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-red-strong text-xl font-black leading-none text-white transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <ol className="border-t border-line/25 px-3 pb-3 sm:px-4">
              {week.challenges.map((c) => (
                <li key={c.day} className="grid gap-1 rounded-lg px-3 py-3 odd:bg-surface/40 sm:grid-cols-[5.5rem_1fr]">
                  <span className="text-sm font-extrabold text-muted nums">Day {c.day}</span>
                  <span className="text-sm"><span className="font-bold">{c.title}</span><span className="text-muted">: {c.problem}</span></span>
                </li>
              ))}
              <li className="mt-2 grid gap-1 rounded-xl bg-red-tint px-3 py-4 sm:grid-cols-[5.5rem_1fr]">
                <span className="text-sm font-extrabold text-red-deep nums">Day {week.assessment.afterDay}</span>
                <span>
                  <span className="font-extrabold">Checkpoint: {week.assessment.title}</span>
                  <span className="mt-0.5 block text-sm">{week.assessment.task}</span>
                  <span className="mt-0.5 block text-xs text-muted">{week.assessment.format}</span>
                </span>
              </li>
            </ol>
          </details>
        );
      })}
      <div className="grid gap-2 rounded-card bg-night p-5 text-paper sm:grid-cols-[9rem_1fr] sm:items-center sm:p-6">
        <span className="display text-2xl text-red">{mockInterviewPhase.days}</span>
        <span>
          <span className="block text-lg font-extrabold">{mockInterviewPhase.name} for {track.name}</span>
          <span className="mt-1 block text-sm text-white/70">{mockInterviewPhase.summary} Topics: {track.interviewTopics.join(", ")}.</span>
        </span>
      </div>
    </div>
  );
}
