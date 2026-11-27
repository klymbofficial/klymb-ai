"use client";

import { useState } from "react";
import { BTN_PRIMARY } from "@/components/company/HiringParts";
import { chooseLead, createTeam, movePerson, type TeamsResult } from "@/app/org/[slug]/(workspace)/teams/actions";
import type { PersonRow, TeamRow } from "@/lib/company/people-data";

const input = "min-h-10 rounded-md border border-line/50 bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none";
const label = "flex flex-col gap-1 text-xs font-bold";

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

/** A new team by name. `onDone` runs once it is made (the overlay closes). */
export function CreateTeam({ slug, onDone }: { slug: string; onDone?: () => void }) {
  const [name, setName] = useState("");
  const { busy, result, run } = useAction();
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => createTeam(slug, name))) { setName(""); onDone?.(); }
      }}
    >
      <label className={label}>
        Team name
        <input required autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="off" className={input} />
      </label>
      <div><button type="submit" disabled={busy} className={BTN_PRIMARY}>{busy ? "Creating…" : "Create team"}</button></div>
      <Note result={result} />
    </form>
  );
}

/** Choose or change a team's lead from anyone active; someone from another team moves to this one. */
export function LeadForm({ slug, team: t, people }: { slug: string; team: TeamRow; people: PersonRow[] }) {
  const [email, setEmail] = useState("");
  const { busy, result, run } = useAction();
  const choices = people.filter((p) => p.email !== t.lead_email);
  const picked = choices.find((p) => p.email === email);
  const fromElsewhere = picked && picked.team_id !== t.id;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => chooseLead(slug, t.id, email))) setEmail("");
      }}
    >
      <label className={label}>
        {t.lead_email ? "Change lead to" : "Choose a lead"}
        <select required value={email} onChange={(e) => setEmail(e.target.value)} className={input}>
          <option value="">Choose a person…</option>
          {choices.map((p) => (
            <option key={p.email} value={p.email}>{who(p)}{p.team_id !== t.id ? ` · ${p.team_name ?? "no team"}` : ""}</option>
          ))}
        </select>
      </label>
      {(t.lead_email || fromElsewhere) && !result && (
        <p className="text-xs text-muted">
          {t.lead_email && "The current lead stays on the team and keeps everything else they do. "}
          {fromElsewhere && `${picked.name ?? picked.email} will move to ${t.name}${picked.lead_team_id ? `, leaving ${picked.team_name} without a lead` : ""}.`}
        </p>
      )}
      <div><button type="submit" disabled={busy || !email} className={BTN_PRIMARY}>{busy ? "Saving…" : "Make lead"}</button></div>
      <Note result={result} />
    </form>
  );
}

/** Move one person to another team, or to no team. */
export function MoveOne({ slug, person, teams }: { slug: string; person: PersonRow; teams: TeamRow[] }) {
  const [teamId, setTeamId] = useState(person.team_id ?? "");
  const { busy, result, run } = useAction();
  const leadLeaving = !!person.lead_team_id && person.lead_team_id !== (teamId || null);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => { e.preventDefault(); await run(() => movePerson(slug, person.email, teamId)); }}
    >
      <label className={label}>
        Team
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className={input}>
          <option value="">No team</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      {leadLeaving && !result && <p className="text-xs text-muted">{person.name ?? person.email} leads {person.team_name}. After the move they won&apos;t, and {person.team_name} will have no lead. Everything else they do stays.</p>}
      <div><button type="submit" disabled={busy || person.team_id === (teamId || null)} className={BTN_PRIMARY}>{busy ? "Moving…" : "Move"}</button></div>
      <Note result={result} />
    </form>
  );
}
