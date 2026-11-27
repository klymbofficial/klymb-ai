"use client";

import clsx from "clsx";
import { useMemo, useState, useTransition } from "react";
import { confirmAssignment, previewAssignment, type AssignFormInput, type AssignPreview, type ConfirmResult } from "@/app/org/[slug]/(workspace)/learning/actions";
import { dayLabel } from "@/components/company/ProgressTable";
import { REQUIREMENT_LABEL, todayIst, type Requirement, type TargetKind } from "@/lib/company/assign-rules";

export interface PanelPerson {
  email: string;
  name: string | null;
  teamName: string | null;
  /** Already has the course: assigned, or their own. */
  has: boolean;
}

const input = "border border-line/60 bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none";
const legend = "mb-2 text-xs font-bold";
const primary = "border-2 border-red-strong bg-red-strong px-5 py-2.5 text-sm font-bold text-white hover:border-red-press hover:bg-red-press disabled:opacity-60";
const quiet = "px-3 py-2.5 text-sm font-bold underline underline-offset-4";

const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * Assigning System Design in two steps: choose, then check exactly who it
 * reaches before anything is written. A lead chooses only from their own
 * team. Everything is checked again on the server when it is confirmed.
 */
export function AssignPanel({
  slug, people, teams, canEveryone, preselect, onDone, onCancel,
}: {
  slug: string;
  /** The people this viewer may assign to. */
  people: PanelPerson[];
  teams: { id: string; name: string }[];
  canEveryone: boolean;
  preselect: string | null;
  onDone: (r: ConfirmResult) => void;
  onCancel: () => void;
}) {
  const today = todayIst();
  const [requirement, setRequirement] = useState<Requirement>("required");
  const [dueOn, setDueOn] = useState("");
  const [targetKind, setTargetKind] = useState<TargetKind>(preselect || teams.length === 0 ? "people" : canEveryone ? "people" : "team");
  const [chosen, setChosen] = useState<Set<string>>(new Set(preselect ? [preselect] : []));
  const [teamId, setTeamId] = useState(teams.length === 1 ? teams[0].id : "");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<AssignPreview | null>(null);
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const form: AssignFormInput = { requirement, dueOn, targetKind, emails: [...chosen], teamId };
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? people.filter((p) => `${p.name ?? ""} ${p.email} ${p.teamName ?? ""}`.toLowerCase().includes(q)) : people;
  }, [people, search]);

  const toggle = (email: string) => setChosen((s) => { const n = new Set(s); if (n.has(email)) n.delete(email); else n.add(email); return n; });

  const check = () => start(async () => {
    setError(null);
    const r = await previewAssignment(slug, form);
    if (!r.ok) return setError(r.message);
    setKey(crypto.randomUUID());
    setPreview(r.preview);
  });

  const assign = () => start(async () => {
    if (!preview) return;
    const r = await confirmAssignment(slug, form, preview.recipients.map((p) => p.email), key);
    if (r.ok) return onDone(r);
    setError(r.message);
    if (r.preview) { setKey(crypto.randomUUID()); setPreview(r.preview); }
  });

  if (preview) {
    const after = preview.assignedNow + preview.recipients.length;
    return (
      <section aria-labelledby="check-title" className="card flex flex-col gap-5 p-5">
        <h2 id="check-title" className="display text-xl">Check before assigning</h2>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[9rem_minmax(0,1fr)]">
          <dt className="font-bold">Course</dt>
          <dd>System Design · {REQUIREMENT_LABEL[preview.requirement]}{preview.dueOn ? `, due ${dayLabel(preview.dueOn)}` : ""}</dd>
          <dt className="font-bold">Reaches</dt>
          <dd>
            {preview.recipients.length} {preview.recipients.length === 1 ? "person" : "people"}{preview.label === "Everyone" || preview.label.startsWith("Team: ") ? ` (${preview.label})` : ""}
            <ul className="mt-1.5 max-h-48 overflow-y-auto text-muted">
              {preview.recipients.map((p) => <li key={p.email}>{p.name ? `${p.name} · ${p.email}` : p.email}</li>)}
            </ul>
          </dd>
          {preview.alreadyAssigned.length + preview.ownAccess.length > 0 && (
            <>
              <dt className="font-bold">Left out</dt>
              <dd className="text-muted">
                {preview.alreadyAssigned.length > 0 && <p>Already assigned: {preview.alreadyAssigned.map((p) => p.name ?? p.email).join(", ")}</p>}
                {preview.ownAccess.length > 0 && <p>Bought it themselves: {preview.ownAccess.map((p) => p.name ?? p.email).join(", ")}</p>}
              </dd>
            </>
          )}
          <dt className="font-bold">Assigned by</dt>
          <dd>{preview.owner}, {dayLabel(preview.today)}</dd>
          <dt className="font-bold">Seats</dt>
          <dd>{preview.assignedNow} of {preview.seats} have the course now, {after} after this</dd>
        </dl>
        <p className="text-sm text-muted">Each person finds it under Upskill when they sign in to this workspace. Someone who joins a team later isn&apos;t included.</p>
        {error && <p role="alert" className="border-2 border-error bg-error-tint p-3 text-sm font-semibold text-error">{error}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={assign} disabled={pending} className={primary}>{pending ? "Assigning…" : "Assign course"}</button>
          <button type="button" onClick={() => { setPreview(null); setError(null); }} disabled={pending} className={quiet}>Back</button>
        </div>
      </section>
    );
  }

  return (
    <form
      aria-labelledby="assign-title"
      className="card flex flex-col gap-5 p-5"
      onSubmit={(e) => { e.preventDefault(); check(); }}
    >
      <h2 id="assign-title" className="display text-xl">Assign System Design</h2>

      <div className="grid gap-5 sm:grid-cols-2">
        <fieldset>
          <legend className={legend}>Type</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            {(["required", "recommended"] as const).map((r) => (
              <label key={r} className="flex items-center gap-2">
                <input type="radio" name="requirement" checked={requirement === r} onChange={() => setRequirement(r)} />
                {REQUIREMENT_LABEL[r]}
              </label>
            ))}
          </div>
        </fieldset>
        {requirement === "required" && (
          <label className="flex flex-col gap-1 text-xs font-bold">
            Due date (optional)
            <input type="date" value={dueOn} min={today} max={addDays(today, 366)} onChange={(e) => setDueOn(e.target.value)} className={clsx(input, "max-w-48")} />
          </label>
        )}
      </div>

      <fieldset>
        <legend className={legend}>Who</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="radio" name="target" checked={targetKind === "people"} onChange={() => setTargetKind("people")} />People</label>
          {teams.length > 0 && (
            <label className="flex items-center gap-2"><input type="radio" name="target" checked={targetKind === "team"} onChange={() => setTargetKind("team")} />{canEveryone ? "A team" : `My team (${teams[0].name})`}</label>
          )}
          {canEveryone && <label className="flex items-center gap-2"><input type="radio" name="target" checked={targetKind === "everyone"} onChange={() => setTargetKind("everyone")} />Everyone</label>}
        </div>
      </fieldset>

      {targetKind === "team" && canEveryone && (
        <label className="flex flex-col gap-1 text-xs font-bold">
          Team
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className={clsx(input, "max-w-sm")} required>
            <option value="">Choose a team</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
      )}

      {targetKind === "people" && (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-xs font-bold">
            Find people
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} className={clsx(input, "max-w-sm")} />
          </label>
          <ul className="max-h-64 overflow-y-auto border border-line/40 bg-white" aria-label="People">
            {shown.map((p) => (
              <li key={p.email} className="border-b border-line/15 last:border-0">
                <label className={clsx("flex items-center gap-3 px-3 py-2 text-sm", p.has && "text-muted")}>
                  <input type="checkbox" checked={chosen.has(p.email)} disabled={p.has} onChange={() => toggle(p.email)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.name ?? p.email}</span>
                    <span className="block truncate text-xs text-muted">{[p.name ? p.email : null, p.teamName].filter(Boolean).join(" · ")}</span>
                  </span>
                  {p.has && <span className="shrink-0 text-xs">Has it</span>}
                </label>
              </li>
            ))}
            {shown.length === 0 && <li className="px-3 py-2 text-sm text-muted">No one matches.</li>}
          </ul>
          <p className="text-xs text-muted" aria-live="polite">{chosen.size} chosen</p>
        </div>
      )}

      {error && <p role="alert" className="border-2 border-error bg-error-tint p-3 text-sm font-semibold text-error">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className={primary}>{pending ? "Checking…" : "Preview"}</button>
        <button type="button" onClick={onCancel} disabled={pending} className={quiet}>Cancel</button>
      </div>
    </form>
  );
}
