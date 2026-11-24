"use client";

import { useId, useMemo, useState } from "react";
import { addPeopleToList, type PickablePerson } from "@/lib/company/batch-rules";

/**
 * "Add from your company": a whole team at once, or people picked from a
 * searchable list. It only adds lines to the invite list below, which is
 * checked like anything typed; everyone still gets their own private link.
 */
export function PeoplePicker({ people, teams, list, onList }: {
  people: PickablePerson[];
  teams: { id: string; name: string; members: number }[];
  list: string;
  onList: (next: string) => void;
}) {
  const id = useId();
  const [team, setTeam] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () => people.filter((p) => !q || p.email.includes(q) || (p.name ?? "").toLowerCase().includes(q)).slice(0, 50),
    [people, q],
  );
  const add = (who: PickablePerson[]) => {
    const out = addPeopleToList(list, who);
    onList(out.list);
    setNote(`${out.added === 1 ? "1 person" : `${out.added} people`} added${out.skipped ? `; ${out.skipped} already on the list` : ""}.`);
  };

  if (!people.length) return null;
  return (
    <details className="rounded-md border border-line/40 bg-white p-3">
      <summary className="cursor-pointer text-sm font-bold">Add from your company ({people.length} people)</summary>
      <div className="mt-3 flex flex-col gap-4">
        {teams.length > 0 && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs font-bold" htmlFor={`${id}-team`}>
              A whole team
              <select id={`${id}-team`} value={team} onChange={(e) => setTeam(e.target.value)} className="h-10 rounded-md border border-line/50 bg-white px-2 text-sm font-normal">
                <option value="">Choose a team</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.members})</option>)}
              </select>
            </label>
            <button type="button" disabled={!team} onClick={() => add(people.filter((p) => p.teamId === team))} className="h-10 rounded-md border-2 border-ink px-3 text-sm font-bold disabled:opacity-40">
              Add team
            </button>
          </div>
        )}
        <div>
          <label className="text-xs font-bold" htmlFor={`${id}-q`}>People</label>
          <input id={`${id}-q`} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email"
            className="mt-1 h-10 w-full rounded-md border border-line/50 px-3 text-sm" />
          <ul className="mt-2 max-h-56 overflow-y-auto rounded-md border border-line/30">
            {shown.map((p) => (
              <li key={p.email} className="border-b border-line/15 last:border-b-0">
                <label className="flex min-h-10 cursor-pointer items-center gap-3 px-3 text-sm">
                  <input type="checkbox" checked={picked.has(p.email)} onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(p.email); else n.delete(p.email); return n; })} />
                  <span className="min-w-0 truncate"><span className="font-semibold">{p.name ?? p.email}</span>{p.name && <span className="text-muted"> · {p.email}</span>}</span>
                </label>
              </li>
            ))}
            {shown.length === 0 && <li className="p-3 text-sm text-muted">Nobody matches.</li>}
          </ul>
          <button type="button" disabled={!picked.size} onClick={() => { add(people.filter((p) => picked.has(p.email))); setPicked(new Set()); }}
            className="mt-2 h-10 rounded-md border-2 border-ink px-3 text-sm font-bold disabled:opacity-40">
            Add {picked.size || ""} selected
          </button>
        </div>
        {note && <p role="status" className="text-sm font-semibold">{note}</p>}
      </div>
    </details>
  );
}
