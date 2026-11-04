"use client";

import { useState, useTransition } from "react";
import { scoreHackathonTeam, setHackathonResults } from "@/app/admin/hackathon-actions";

const CRITERIA = [["product", "Product"], ["prompting", "Prompting"], ["polish", "Polish"]] as const;

/** One judge's marks for one team. */
export function ScoreForm({ teamId, mine }: { teamId: string; mine: { product: number; prompting: number; polish: number; comment: string | null } | null }) {
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        start(async () => { const r = await scoreHackathonTeam(teamId, form); setMsg(r.ok ? "Saved." : r.message); });
      }}
    >
      {CRITERIA.map(([k, l]) => (
        <label key={k} className="text-xs font-bold">
          {l} <span className="font-normal text-muted">/10</span>
          <input name={k} type="number" min={0} max={10} required defaultValue={mine?.[k] ?? ""} className="mt-1 block w-16 rounded-md border border-line/50 px-2 py-1.5 text-sm" />
        </label>
      ))}
      <label className="min-w-48 flex-1 text-xs font-bold">
        Comment <span className="font-normal text-muted">(optional)</span>
        <input name="comment" defaultValue={mine?.comment ?? ""} maxLength={1000} className="mt-1 block w-full rounded-md border border-line/50 px-2 py-1.5 text-sm" />
      </label>
      <button type="submit" disabled={pending} className="rounded-md bg-ink px-3 py-2 text-xs font-bold text-paper">{pending ? "Saving…" : mine ? "Update score" : "Save score"}</button>
      {msg && <span role="status" className="text-xs font-semibold">{msg}</span>}
    </form>
  );
}

/** Places 1 to 3, saved as a draft or published to the public page. */
export function ResultsForm({ teams, current }: { teams: { id: string; label: string }[]; current: Record<number, string> }) {
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const submit = (form: HTMLFormElement, publish: boolean) => {
    const data = new FormData(form);
    data.set("publish", publish ? "1" : "0");
    start(async () => { const r = await setHackathonResults(data); setMsg(r.ok ? (publish ? "Published on /hackathons." : "Saved as a draft.") : r.message); });
  };
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); submit(e.currentTarget, true); }}>
      {[1, 2, 3].map((place) => (
        <div key={place} className="flex flex-wrap items-center gap-3">
          <span className="w-8 text-sm font-bold nums">#{place}</span>
          <select name={`team-${place}`} defaultValue={current[place] ?? ""} className="rounded-md border border-line/50 px-2 py-1.5 text-sm">
            <option value="">No team</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <input name={`title-${place}`} placeholder={["Winner", "Runner-up", "Third place"][place - 1]} maxLength={60} className="rounded-md border border-line/50 px-2 py-1.5 text-sm" />
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md bg-red-strong px-4 py-2 text-xs font-bold text-white">Publish winners</button>
        <button type="button" disabled={pending} onClick={(e) => submit(e.currentTarget.form!, false)} className="rounded-md border border-line/50 px-4 py-2 text-xs font-bold">Save as draft</button>
        {msg && <span role="status" className="text-xs font-semibold">{msg}</span>}
      </div>
    </form>
  );
}
