"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRef, useState } from "react";
import { logCallOutcome, logTouch, quickAddLead, updateLeadField } from "@/app/admin/sales-actions";
import { CALL_OUTCOMES, CHANNELS, formatPhone, labelOf, SOURCES, STAGES } from "@/lib/sales";

export interface SheetRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  org: string | null;
  source: string;
  stage: string;
  next_follow_up: string | null;
  notes: string | null;
  last_touch_at: string | null;
  last_channel: string | null;
  touches: number;
  paid: boolean;
  owner_email: string | null;
}

const cell = "w-full border border-transparent bg-transparent px-2 py-1.5 text-sm hover:border-line/40 focus:border-ink focus:bg-white focus:outline-none";
const STAGE_BG: Record<string, string> = {
  new: "bg-surface", warm: "bg-amber-100", potential: "bg-sky-100", positive: "bg-emerald-100",
  almost: "bg-emerald-200", signed: "bg-ink text-paper", rejected: "bg-red-tint text-red-deep",
};

function ago(iso: string) {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/**
 * The sales sheet: one row per person, every cell saves as you leave it, and
 * the WhatsApp and Call buttons open the chat or the dialler and log the
 * touch in one tap. Built for working a list top to bottom.
 */
/** `base` is where lead pages live: /admin/sales for owners, /sales for reps. Reps get no owner column. */
export function SalesSheet({ rows, today, owners, base = "/admin/sales", canAssign = true, quickAdd = true }: { rows: SheetRow[]; today: string; owners: { email: string; name: string | null }[]; base?: string; canAssign?: boolean; quickAdd?: boolean }) {
  const [error, setError] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  // The row whose call is in progress: its outcome buttons are showing.
  const [calling, setCalling] = useState<string | null>(null);

  async function save(id: string, field: "stage" | "next_follow_up" | "notes" | "owner_email", value: string) {
    setError("");
    const r = await updateLeadField(id, field, value);
    if (!r.ok) setError(r.message);
    else { setFlash(`${id}:${field}`); setTimeout(() => setFlash(null), 1200); }
  }

  async function touch(row: SheetRow, channel: string, replied = false) {
    setError("");
    const r = await logTouch(row.id, { channel, replied, note: "", stage: "", next_follow_up: "" });
    if (!r.ok) setError(r.message);
  }

  // The pieces each row is made of, shared by the desktop table and the phone cards.
  const reachOut = (r: SheetRow, big = false) => {
    const btn = big ? "px-3 py-2 text-xs" : "px-1.5 py-0.5 text-[11px]";
    return (
      <>
        <span className="mt-1 flex flex-wrap gap-1">
          {r.phone && (
            <>
              <a href={`https://wa.me/${r.phone}`} target="_blank" rel="noopener noreferrer" onClick={() => touch(r, "whatsapp")}
                className={clsx(btn, "border border-emerald-700/40 font-bold text-emerald-800 hover:bg-emerald-50")} title="Open WhatsApp and log it">WhatsApp</a>
              <a href={`tel:+${r.phone}`} onClick={() => setCalling(r.id)}
                className={clsx(btn, "border border-line/50 font-bold hover:bg-surface")} title="Call and log it">Call</a>
            </>
          )}
          {!r.phone && r.email && (
            <a href={`mailto:${r.email}`} onClick={() => touch(r, "email")}
              className={clsx(btn, "border border-line/50 font-bold hover:bg-surface")} title="Email and log it">Email</a>
          )}
          <button type="button" onClick={() => touch(r, r.last_channel ?? "whatsapp", true)}
            className={clsx(btn, "border border-line/50 font-bold hover:bg-surface")} title="They replied: counts as a conversation">They replied</button>
        </span>
        {calling === r.id && (
          <span role="group" aria-label="How did the call go?" className="mt-1.5 flex flex-wrap gap-1">
            {CALL_OUTCOMES.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={async () => {
                  setCalling(null);
                  setError("");
                  const res = await logCallOutcome(r.id, o.key);
                  if (!res.ok) setError(res.message);
                }}
                className={clsx(btn, "bg-ink font-bold text-paper hover:bg-red-strong")}
              >
                {o.label}
              </button>
            ))}
            <button type="button" onClick={() => setCalling(null)} className="px-1 text-[11px] text-muted underline">Skip</button>
          </span>
        )}
      </>
    );
  };
  const stageSelect = (r: SheetRow, saved: boolean) => (
    <>
      <select
        aria-label={`Stage for ${r.name}`}
        defaultValue={r.stage}
        key={`${r.id}-${r.stage}`}
        onChange={(ev) => save(r.id, "stage", ev.target.value)}
        className={clsx("w-full px-1.5 py-1 text-xs font-bold", STAGE_BG[e(r.stage)])}
      >
        {STAGES.map((st) => <option key={st.key} value={st.key}>{st.label}</option>)}
      </select>
      {saved && <span className="text-[10px] text-muted">Saved</span>}
    </>
  );
  const followUp = (r: SheetRow, overdue: boolean, saved: boolean) => (
    <>
      <input
        type="date"
        aria-label={`Next follow-up for ${r.name}`}
        defaultValue={r.next_follow_up ?? ""}
        key={`${r.id}-${r.next_follow_up}`}
        onChange={(ev) => save(r.id, "next_follow_up", ev.target.value)}
        className={clsx(cell, "px-1 text-xs", overdue && "font-bold text-red-deep")}
      />
      {overdue && r.next_follow_up && r.next_follow_up < today && <span className="block px-1 text-[10px] font-bold text-red-deep">{daysLate(r.next_follow_up, today)} late</span>}
      {saved && <span className="text-[10px] text-muted">Saved</span>}
    </>
  );
  const lastTouch = (r: SheetRow) =>
    r.last_touch_at
      ? <>{labelOf(CHANNELS, r.last_channel ?? "")} · {ago(r.last_touch_at)}<span className="block text-muted">{r.touches} reached out</span></>
      : <span className="text-muted">Not contacted yet</span>;
  const ownerSelect = (r: SheetRow) => (
    <select
      aria-label={`Owner of ${r.name}`}
      defaultValue={r.owner_email ?? ""}
      key={`${r.id}-${r.owner_email}`}
      onChange={(ev) => save(r.id, "owner_email", ev.target.value)}
      className="w-full bg-transparent px-1 py-1 text-xs"
    >
      <option value="">Unassigned</option>
      {owners.map((o) => <option key={o.email} value={o.email}>{o.name ?? o.email.split("@")[0]}</option>)}
    </select>
  );
  const isOverdue = (r: SheetRow) => r.next_follow_up !== null && r.next_follow_up <= today && !["signed", "rejected"].includes(r.stage);

  return (
    <div className="flex flex-col gap-3">
      {quickAdd && <QuickAdd onError={setError} />}
      {error && <p role="alert" className="text-xs font-semibold text-error">{error}</p>}

      {/* Laptop: a sheet. */}
      <div className="card hidden overflow-x-auto md:block">
        <table className={clsx("w-full table-fixed text-left text-sm", canAssign ? "min-w-[920px]" : "min-w-[820px]")}>
          <colgroup>
            <col className="w-[18%]" /><col className="w-[17%]" /><col className="w-[13%]" /><col className="w-[12%]" />
            <col className="w-[13%]" /><col className={canAssign ? "w-[17%]" : "w-[27%]"} />{canAssign && <col className="w-[10%]" />}
          </colgroup>
          <thead className="border-b border-line/30 text-[11px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-3 py-2.5">Name</th><th className="px-3 py-2.5">Reach out</th><th className="px-3 py-2.5">Stage</th>
              <th className="px-3 py-2.5">Last touch</th><th className="px-3 py-2.5">Follow-up</th><th className="px-3 py-2.5">Note</th>
              {canAssign && <th className="px-3 py-2.5">Owner</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/15">
            {rows.map((r) => {
              const overdue = isOverdue(r);
              const saved = (f: string) => flash === `${r.id}:${f}`;
              return (
                <tr key={r.id} className={clsx("align-top", overdue && "bg-red-tint/40")}>
                  <td className="px-3 py-2">
                    <Link href={`${base}/leads/${r.id}`} className="font-bold hover:underline">{r.name}</Link>
                    {r.paid && <span className="ml-1.5 bg-emerald-700 px-1 py-0.5 text-[10px] font-extrabold text-white">PAID</span>}
                    <span className="block truncate text-xs text-muted">{[r.org, labelOf(SOURCES, r.source)].filter(Boolean).join(" · ")}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="block truncate text-xs nums">{r.phone ? formatPhone(r.phone) : r.email}</span>
                    {reachOut(r)}
                  </td>
                  <td className="px-3 py-2">{stageSelect(r, saved("stage"))}</td>
                  <td className="px-3 py-2 text-xs nums">{lastTouch(r)}</td>
                  <td className="px-2 py-2">{followUp(r, overdue, saved("next_follow_up"))}</td>
                  <td className="px-3 py-2"><NoteCell row={r} onSave={(v) => save(r.id, "notes", v)} saved={saved("notes")} /></td>
                  {canAssign && <td className="px-3 py-2">{ownerSelect(r)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Phone: one card per person, with big buttons. */}
      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((r) => {
          const overdue = isOverdue(r);
          const saved = (f: string) => flash === `${r.id}:${f}`;
          return (
            <li key={r.id} className={clsx("card p-3", overdue && "ring-1 ring-red-strong/30")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`${base}/leads/${r.id}`} className="font-bold underline-offset-4 hover:underline">{r.name}</Link>
                  {r.paid && <span className="ml-1.5 bg-emerald-700 px-1 py-0.5 text-[10px] font-extrabold text-white">PAID</span>}
                  <span className="block truncate text-xs text-muted">{[r.phone ? formatPhone(r.phone) : r.email, r.org].filter(Boolean).join(" · ")}</span>
                </div>
                <div className="w-36 shrink-0">{stageSelect(r, saved("stage"))}</div>
              </div>
              {reachOut(r, true)}
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div><span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Follow-up</span>{followUp(r, overdue, saved("next_follow_up"))}</div>
                <div className="nums"><span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Last touch</span>{lastTouch(r)}</div>
              </div>
              <div className="mt-1"><NoteCell row={r} onSave={(v) => save(r.id, "notes", v)} saved={saved("notes")} /></div>
              {canAssign && <div className="mt-1 flex items-center gap-2 text-xs"><span className="text-muted">Owner</span>{ownerSelect(r)}</div>}
            </li>
          );
        })}
      </ul>
      {rows.length === 0 && <p className="card p-6 text-center text-sm text-muted">Nobody here yet.</p>}
    </div>
  );
}

/** "3 days" for a follow-up date that has passed. */
function daysLate(date: string, today: string) {
  const d = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86400000);
  return d === 1 ? "1 day" : `${d} days`;
}

/** Stage keys are safe class lookups; anything else falls back to plain. */
function e(stage: string) { return stage in STAGE_BG ? stage : "new"; }

function NoteCell({ row, onSave, saved }: { row: SheetRow; onSave: (v: string) => void; saved: boolean }) {
  const initial = useRef(row.notes ?? "");
  return (
    <>
      <textarea
        aria-label={`Note about ${row.name}`}
        defaultValue={row.notes ?? ""}
        rows={1}
        placeholder="Add a note…"
        onBlur={(ev) => {
          const v = ev.target.value;
          if (v !== initial.current) { initial.current = v; onSave(v); }
        }}
        className={clsx("resize-y", "w-full border border-transparent bg-transparent px-2 py-1.5 text-xs hover:border-line/40 focus:border-ink focus:bg-white focus:outline-none")}
      />
      {saved && <span className="text-[10px] text-muted">Saved</span>}
    </>
  );
}

function QuickAdd({ onError }: { onError: (m: string) => void }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [source, setSource] = useState("other");
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const field = "border border-line/50 bg-white px-2.5 py-2 text-sm focus:border-ink focus:outline-none";
  return (
    <form
      className="card flex flex-wrap items-center gap-2 p-3"
      onSubmit={async (ev) => {
        ev.preventDefault();
        setBusy(true);
        onError("");
        const r = await quickAddLead({ name, contact, note, source });
        setBusy(false);
        if (!r.ok) return onError(r.message);
        setName(""); setContact(""); setNote("");
        nameRef.current?.focus();
      }}
    >
      <span className="w-full text-xs font-extrabold uppercase tracking-wider text-muted sm:w-auto">Add someone</span>
      <input ref={nameRef} required value={name} onChange={(ev) => setName(ev.target.value)} placeholder="Name" aria-label="Name" className={`${field} w-full sm:w-44`} />
      <input required value={contact} onChange={(ev) => setContact(ev.target.value)} placeholder="Phone or email" aria-label="Phone or email" inputMode="tel" className={`${field} w-full sm:w-44`} />
      <select value={source} onChange={(ev) => setSource(ev.target.value)} aria-label="Source" className={`${field} w-full sm:w-auto`}>
        {SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
      <input value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="Note (optional)" aria-label="Note" className={`${field} w-full sm:min-w-48 sm:flex-1`} />
      <button type="submit" disabled={busy} className="w-full bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-paper disabled:opacity-50 sm:w-auto">{busy ? "Adding…" : "Add ↵"}</button>
    </form>
  );
}
