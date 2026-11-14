import { ResultsForm, ScoreForm } from "@/components/hackathon/AdminForms";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageTitle } from "@/components/admin/PageTitle";
import { StatTile } from "@/components/admin/StatTile";
import { HACKATHON } from "@/data/hackathon";
import { requireAdmin } from "@/lib/admin/auth";
import { adminTeams } from "@/lib/admin/hackathon";

export const dynamic = "force-dynamic";

/** Every team and entry of the current hackathon, each judge's scores, and the winners. */
export default async function AdminHackathonPage() {
  const admin = await requireAdmin();
  const { teams, interest, published } = await adminTeams(admin.email);
  const entries = teams.filter((t) => t.entry);
  const label = (t: (typeof teams)[number]) => t.name || t.members[0]?.name || t.code;
  const current = Object.fromEntries(teams.filter((t) => t.place).map((t) => [t.place!, t.id]));

  return (
    <>
      <PageTitle eyebrow="Hackathon" title={HACKATHON.name} intro={`Event ${HACKATHON.eventId}. Scores are out of 10 on each criterion: product judgment, prompting skill, polish. Teams are sorted by their average total out of 30.`} />
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        <StatTile label="Waiting for dates" value={String(interest)} />
        <StatTile label="Teams" value={String(teams.length)} />
        <StatTile label="People" value={String(teams.reduce((n, t) => n + t.members.length, 0))} />
        <StatTile label="Entries" value={String(entries.length)} />
      </div>

      {teams.length === 0 ? (
        <EmptyState title="No teams yet" body="Teams appear here once registration opens and people sign up. Set the event's dates in src/data/hackathon/index.ts." />
      ) : (
        <ol className="flex flex-col gap-4">
          {teams.map((t) => (
            <li key={t.id} className="rounded-card border border-line/30 bg-card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="text-lg font-extrabold">{label(t)} <span className="text-sm font-normal text-muted">· {t.code}{t.place ? ` · #${t.place}` : ""}</span></p>
                <p className="text-sm font-bold">{t.average != null ? `${t.average}/30 from ${t.judges} judge${t.judges === 1 ? "" : "s"}` : "Not scored"}</p>
              </div>
              <p className="mt-1 text-sm text-muted">{t.members.map((m) => `${m.name}${m.isLeader ? " (leader)" : ""}, ${m.college}`).join(" · ")}</p>
              {t.entry ? (
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <span className="font-semibold">{HACKATHON.briefs.find((b) => b.id === t.entry!.briefId)?.title ?? t.entry.briefId}</span>
                  <a href={t.entry.repoUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Repo</a>
                  <a href={t.entry.liveUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Live</a>
                  <a href={t.entry.aiLogUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">AI log</a>
                </div>
              ) : <p className="mt-3 text-sm text-muted">No entry yet.</p>}
              {t.entry?.notes && <p className="mt-2 text-sm"><span className="font-bold">Notes: </span>{t.entry.notes}</p>}
              {t.entry && <div className="mt-4 border-t border-line/20 pt-4"><ScoreForm teamId={t.id} mine={t.mine} /></div>}
            </li>
          ))}
        </ol>
      )}

      {entries.length > 0 && (
        <section className="mt-10 rounded-card border border-line/30 bg-card p-5">
          <h2 className="text-lg font-extrabold">Winners {published ? <span className="text-sm font-normal text-muted">· published</span> : null}</h2>
          <p className="mt-1 mb-4 text-sm text-muted">Pick up to three. Publishing shows them on /hackathons and on each winner&apos;s team page.</p>
          <ResultsForm teams={entries.map((t) => ({ id: t.id, label: `${label(t)}${t.average != null ? ` (${t.average}/30)` : ""}` }))} current={current} />
        </section>
      )}
    </>
  );
}
