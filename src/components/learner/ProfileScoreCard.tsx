import type { ProfileScore } from "@/lib/profile-score";

/** The profile's strength: the score, each section's share, and what is still worth adding. */
export function ProfileScoreCard({ score }: { score: ProfileScore }) {
  return (
    <section aria-labelledby="score-title" className="card p-6">
      <h2 id="score-title" className="text-sm font-extrabold uppercase tracking-[0.14em] text-muted">Profile strength</h2>
      <p className="display mt-2 text-5xl nums">{score.score}<span className="text-2xl text-muted">%</span></p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line/20" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score.score} aria-label="Profile strength">
        <div className="h-full rounded-full bg-red-strong" style={{ width: `${Math.max(2, score.score)}%` }} />
      </div>
      <p className="mt-3 text-sm font-semibold">{score.ready ? "Your profile is ready." : score.score >= 70 ? "Nearly there: a few essentials are missing." : "Keep going: 70% with the essentials makes it ready."}</p>

      <ul className="mt-5 space-y-2 border-t border-line/25 pt-4 text-sm">
        {score.sections.map((s) => (
          <li key={s.key} className="flex items-baseline justify-between gap-3">
            <span>{s.label}</span>
            <span className={`font-bold nums ${s.earned === s.weight ? "text-ink" : "text-muted"}`}>{s.earned}/{s.weight}</span>
          </li>
        ))}
      </ul>

      {score.missing.length > 0 && (
        <div className="mt-5 border-t border-line/25 pt-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Still to add</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {score.missing.slice(0, 6).map((m) => <li key={m} className="flex gap-2"><span aria-hidden="true" className="text-red-strong">+</span>{m}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}
