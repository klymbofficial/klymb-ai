import { mockInterviewPhase, weekPhases } from "@/data/program";
import type { Track } from "@/types/program";

/** Full 30-day view for one track: 4 weeks, daily problems, assessments, mock interviews. */
export function TrackCurriculum({ track, compact = false }: { track: Track; compact?: boolean }) {
  return (
    <div className="border-2 border-line">
      {track.weeks.map((week) => {
        const phase = weekPhases.find((p) => p.week === week.week)!;
        return (
          <details key={week.week} open={!compact && week.week === 1} className="group border-b-2 border-line bg-paper">
            <summary className="grid cursor-pointer list-none gap-2 p-5 sm:grid-cols-[10rem_1fr_auto] sm:items-center sm:p-6 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="display block text-3xl text-red">Week {week.week}</span>
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">{phase.days}</span>
              </span>
              <span>
                <span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-muted">{phase.name}</span>
                <span className="mt-0.5 block text-xl font-extrabold">{week.title}</span>
                <span className="mt-1 block text-sm text-muted">{week.focus}</span>
              </span>
              <span aria-hidden="true" className="text-3xl font-black text-red transition-transform group-open:rotate-45">+</span>
            </summary>
            <ol className="border-t-2 border-line">
              {week.challenges.map((c) => (
                <li key={c.day} className="grid gap-1 border-b border-line/50 px-5 py-3 sm:grid-cols-[6rem_1fr] sm:px-6">
                  <span className="text-sm font-extrabold text-muted">Day {c.day}</span>
                  <span><span className="font-bold">{c.title}</span><span className="text-muted"> — {c.problem}</span></span>
                </li>
              ))}
              <li className="grid gap-1 bg-red-tint px-5 py-4 sm:grid-cols-[6rem_1fr] sm:px-6">
                <span className="text-sm font-extrabold text-red-deep">Day {week.assessment.afterDay}</span>
                <span>
                  <span className="font-extrabold">Weekly assessment: {week.assessment.title}</span>
                  <span className="block text-sm">{week.assessment.task}</span>
                  <span className="block text-xs text-muted">{week.assessment.format}</span>
                </span>
              </li>
            </ol>
          </details>
        );
      })}
      <div className="grid gap-2 bg-ink p-5 text-paper sm:grid-cols-[10rem_1fr] sm:p-6">
        <span className="display text-3xl text-red">{mockInterviewPhase.days}</span>
        <span>
          <span className="block text-xl font-extrabold">{mockInterviewPhase.name} for {track.name}</span>
          <span className="mt-1 block text-sm text-white/75">{mockInterviewPhase.summary} Topics: {track.interviewTopics.join(", ")}.</span>
        </span>
      </div>
    </div>
  );
}
