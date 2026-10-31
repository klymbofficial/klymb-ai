"use client";

import { useState } from "react";
import { chooseHead, createTeam, movePerson, type TeamsResult } from "@/app/org/[slug]/teams/actions";
import type { PersonRow, TeamRow } from "@/lib/company/people-data";

const input = "border border-line/60 bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none";
const label = "flex flex-col gap-1 text-xs font-bold";
const submit = "bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-paper disabled:opacity-50";

const who = (p: PersonRow) => (p.name ? `${p.name} (${p.email})` : p.email);

function Note({ result }: { result: TeamsResult | null }) {
  if (!result) return null;
  return <p role={result.ok ? "status" : "alert"} className={`w-full text-xs font-semibold ${result.ok ? "text-ink" : "text-error"}`}>{result.message}</p>;
}

/** Runs one action at a time, with its message shown where it was started. */
function useAction() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TeamsResult | null>(null);
  async function run(action: () => Promise<TeamsResult>) {
    setBusy(true);
    setResult(null);
    const r = await action();
    setBusy(false);
    setResult(r);
    return r.ok;
  }
  return { busy, result, run };
}

export function TeamsManager({ slug, teams, people }: { slug: string; teams: TeamRow[]; people: PersonRow[] }) {
  // HR people can't head a team, so they're left out of the head choices.
  const candidates = people.filter((p) => p.role !== "hr");
  return (
    <div className="flex flex-col gap-8">
      <CreateTeam slug={slug} />
      {teams.length === 0 ? (
        <p className="text-sm text-muted">No teams yet. Create the first one above.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((t) => <TeamCard key={t.id} slug={slug} team={t} candidates={candidates} />)}
        </div>
      )}
      <MovePeople slug={slug} teams={teams} people={people} />
    </div>
  );
}

function CreateTeam({ slug }: { slug: string }) {
  const [name, setName] = useState("");
  const { busy, result, run } = useAction();
  return (
    <form
      className="card flex flex-wrap items-end gap-3 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => createTeam(slug, name))) setName("");
      }}
    >
      <label className={label}>
        New team name
        <input required value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="off" className={`${input} w-64`} />
      </label>
      <button type="submit" disabled={busy} className={submit}>{busy ? "Creating…" : "Create team"}</button>
      <Note result={result} />
    </form>
  );
}

function TeamCard({ slug, team: t, candidates }: { slug: string; team: TeamRow; candidates: PersonRow[] }) {
  const [email, setEmail] = useState("");
  const { busy, result, run } = useAction();
  const choices = candidates.filter((p) => p.email !== t.head_email);
  const picked = choices.find((p) => p.email === email);
  const fromElsewhere = picked && picked.team_id !== t.id;

  return (
    <section className="card flex flex-col gap-3 p-5" aria-labelledby={`team-${t.id}`}>
      <header className="flex items-baseline justify-between gap-3">
        <h2 id={`team-${t.id}`} className="text-base font-black">{t.name}</h2>
        <span className="text-xs text-muted nums">{t.members} {t.members === 1 ? "person" : "people"}</span>
      </header>
      <p className="text-sm">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">Head</span>{" "}
        {t.head_email ? <strong>{t.head_name ?? t.head_email}</strong> : <span className="text-muted">None yet</span>}
      </p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run(() => chooseHead(slug, t.id, email))) setEmail("");
        }}
      >
        <label className={label}>
          {t.head_email ? "Change head to" : "Choose a head"}
          <select required value={email} onChange={(e) => setEmail(e.target.value)} className={`${input} w-64 max-w-full`}>
            <option value="">Choose a person…</option>
            {choices.map((p) => (
              <option key={p.email} value={p.email}>{who(p)}{p.team_id !== t.id ? ` · ${p.team_name ?? "no team"}` : ""}</option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={busy || !email} className={submit}>{busy ? "Saving…" : "Make head"}</button>
        {(t.head_email || fromElsewhere) && !result && (
          <p className="w-full text-xs text-muted">
            {t.head_email && "The current head stays on the team as an employee. "}
            {fromElsewhere && `${picked.name ?? picked.email} will move to ${t.name}${picked.role === "head" ? `, leaving ${picked.team_name} without a head` : ""}.`}
          </p>
        )}
        <Note result={result} />
      </form>
    </section>
  );
}

function MovePeople({ slug, teams, people }: { slug: string; teams: TeamRow[]; people: PersonRow[] }) {
  const [email, setEmail] = useState("");
  const [teamId, setTeamId] = useState("");
  const { busy, result, run } = useAction();
  const picked = people.find((p) => p.email === email);
  const headLeaving = picked?.role === "head" && picked.team_id !== (teamId || null);

  if (people.length === 0) return null;
  return (
    <form
      className="card flex flex-wrap items-end gap-3 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => movePerson(slug, email, teamId))) setEmail("");
      }}
    >
      <h2 className="w-full text-base font-black">Move someone</h2>
      <label className={label}>
        Person
        <select required value={email} onChange={(e) => setEmail(e.target.value)} className={`${input} w-72 max-w-full`}>
          <option value="">Choose a person…</option>
          {people.map((p) => <option key={p.email} value={p.email}>{who(p)} · {p.team_name ?? "no team"}</option>)}
        </select>
      </label>
      <label className={label}>
        To team
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className={`${input} w-52`}>
          <option value="">No team</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      <button type="submit" disabled={busy || !email || picked?.team_id === (teamId || null)} className={submit}>{busy ? "Moving…" : "Move"}</button>
      {headLeaving && !result && <p className="w-full text-xs text-muted">{picked.name ?? picked.email} heads {picked.team_name}. After the move they&apos;ll be an employee, and {picked.team_name} will have no head.</p>}
      <Note result={result} />
    </form>
  );
}
