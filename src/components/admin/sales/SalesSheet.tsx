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
export function SalesSheet({ rows, today, owners }: { rows: SheetRow[]; today: string; owners: { email: string; name: string | null }[] }) {
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

  return (
    <div className="flex flex-col gap-3">
      <QuickAdd onError={setError} />
      {error && <p role="alert" className="text-xs font-semibold text-error">{error}</p>}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[1080px] table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[17%]" /><col className="w-[15%]" /><col className="w-[13%]" /><col className="w-[12%]" />
            <col className="w-[11%]" /><col className="w-[22%]" /><col className="w-[10%]" />
          </colgroup>
          <thead className="border-b border-line/30 text-[11px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-3 py-2.5">Name</th><th className="px-3 py-2.5">Number · reach out</th><th className="px-3 py-2.5">Stage</th>
              <th className="px-3 py-2.5">Last touch</th><th className="px-3 py-2.5">Follow-up</th><th className="px-3 py-2.5">Note</th>
              <th className="px-3 py-2.5">Owner</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/15">
            {rows.map((r) => {
              const overdue = r.next_follow_up !== null && r.next_follow_up <= today && !["signed", "rejected"].includes(r.stage);
              const saved = (f: string) => flash === `${r.id}:${f}`;
              return (
                <tr key={r.id} className={clsx("align-top", overdue && "bg-red-tint/40")}>
                  <td className="px-3 py-2">
                    <Link href={`/admin/sales/leads/${r.id}`} className="font-bold hover:underline">{r.name}</Link>
                    {r.paid && <span className="ml-1.5 bg-emerald-700 px-1 py-0.5 text-[10px] font-extrabold text-white">PAID</span>}
                    <span className="block truncate text-xs text-muted">{[r.org, labelOf(SOURCES, r.source)].filter(Boolean).join(" · ")}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="block text-xs nums">{r.phone ? formatPhone(r.phone) : r.email}</span>
                    <span className="mt-1 flex gap-1">
                      {r.phone && (
                        <>
                          <a href={`https://wa.me/${r.phone}`} target="_blank" rel="noopener noreferrer" onClick={() => touch(r, "whatsapp")}
                            className="border border-emerald-700/40 px-1.5 py-0.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50" title="Open WhatsApp and log it">WA</a>
                          <a href={`tel:+${r.phone}`} onClick={() => setCalling(r.id)}
                            className="border border-line/50 px-1.5 py-0.5 text-[11px] font-bold hover:bg-surface" title="Call and log it">Call</a>
                        </>
                      )}
                      <button type="button" onClick={() => touch(r, r.last_channel ?? "whatsapp", true)}
                        className="border border-line/50 px-1.5 py-0.5 text-[11px] font-bold hover:bg-surface" title="They replied: counts as a conversation">Replied</button>
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
                            className="bg-ink px-1.5 py-0.5 text-[11px] font-bold text-paper hover:bg-red-strong"
                          >
                            {o.label}
                          </button>
                        ))}
                        <button type="button" onClick={() => setCalling(null)} className="px-1 text-[11px] text-muted underline">Skip</button>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      aria-label={`Stage for ${r.name}`}
                      defaultValue={r.stage}
                      key={`${r.id}-${r.stage}`}
                      onChange={(e) => save(r.id, "stage", e.target.value)}
                      className={clsx("w-full px-1.5 py-1 text-xs font-bold", STAGE_BG[e(r.stage)])}
                    >
                      {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                    {saved("stage") && <span className="text-[10px] text-muted">Saved</span>}
                  </td>
                  <td className="px-3 py-2 text-xs nums">
                    {r.last_touch_at ? <>{labelOf(CHANNELS, r.last_channel ?? "")} · {ago(r.last_touch_at)}<span className="block text-muted">{r.touches} reached out</span></> : <span className="text-muted">Not contacted</span>}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      aria-label={`Next follow-up for ${r.name}`}
                      defaultValue={r.next_follow_up ?? ""}
                      key={`${r.id}-${r.next_follow_up}`}
                      onChange={(e) => save(r.id, "next_follow_up", e.target.value)}
                      className={clsx(cell, "text-xs", overdue && "font-bold text-red-deep")}
                    />
                    {saved("next_follow_up") && <span className="text-[10px] text-muted">Saved</span>}
                  </td>
                  <td className="px-3 py-2">
                    <NoteCell row={r} onSave={(v) => save(r.id, "notes", v)} saved={saved("notes")} />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      aria-label={`Owner of ${r.name}`}
                      defaultValue={r.owner_email ?? ""}
                      key={`${r.id}-${r.owner_email}`}
                      onChange={(e) => save(r.id, "owner_email", e.target.value)}
                      className="w-full bg-transparent px-1 py-1 text-xs"
                    >
                      <option value="">—</option>
                      {owners.map((o) => <option key={o.email} value={o.email}>{o.name ?? o.email.split("@")[0]}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
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
      <span className="text-xs font-extrabold uppercase tracking-wider text-muted">Add</span>
      <input ref={nameRef} required value={name} onChange={(ev) => setName(ev.target.value)} placeholder="Name" aria-label="Name" className={`${field} w-44`} />
      <input required value={contact} onChange={(ev) => setContact(ev.target.value)} placeholder="Phone or email" aria-label="Phone or email" inputMode="tel" className={`${field} w-44`} />
      <select value={source} onChange={(ev) => setSource(ev.target.value)} aria-label="Source" className={field}>
        {SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
      <input value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="Note (optional)" aria-label="Note" className={`${field} min-w-48 flex-1`} />
      <button type="submit" disabled={busy} className="bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-paper disabled:opacity-50">{busy ? "Adding…" : "Add ↵"}</button>
    </form>
  );
}
