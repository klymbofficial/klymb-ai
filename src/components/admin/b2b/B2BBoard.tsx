"use client";

import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";
import { setDealStage } from "@/app/admin/b2b-actions";
import { B2B_STAGES, daysBetween, inr, LOST_REASONS, weighted } from "@/lib/b2b";

export interface B2BCard {
  id: string;
  title: string;
  company_name: string;
  stage: string;
  stage_changed_at: string;
  value_inr: number;
  seats: number;
  next_step_date: string | null;
  next_step: string | null;
  owner: string;
  pending_docs: string[];
  status_note: string | null;
}

const short = (day: string) => new Date(`${day}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

/**
 * Deals as columns, with each column's ₹ total and its weighted value. Drag
 * to move, or use the menu on a card. Signed is refused while paperwork is
 * open, and Lost asks for a reason first.
 */
export function B2BBoard({ cards: initial, today }: { cards: B2BCard[]; today: string }) {
  const [cards, setCards] = useState(initial);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [losing, setLosing] = useState<{ id: string; reason: string; note: string } | null>(null);

  async function move(id: string, stage: string, lost?: { reason: string; note: string }) {
    // Lost needs a reason: ask first, move on confirm.
    if (stage === "lost" && !lost) { setLosing({ id, reason: "", note: "" }); return; }
    const before = cards;
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, stage, stage_changed_at: new Date().toISOString() } : c)));
    setError("");
    const r = await setDealStage(id, stage, lost);
    if (!r.ok) { setCards(before); setError(r.message); }
  }

  return (
    <>
      {error && <p role="alert" className="mb-2 text-xs font-semibold text-error">{error}</p>}
      {losing && (
        <form
          className="card mb-3 flex flex-wrap items-end gap-2 p-3"
          onSubmit={(e) => { e.preventDefault(); const l = losing; setLosing(null); move(l.id, "lost", { reason: l.reason, note: l.note }); }}
        >
          <p className="w-full text-sm font-bold">Why was {cards.find((c) => c.id === losing.id)?.company_name ?? "this deal"} lost?</p>
          <select required aria-label="Reason" value={losing.reason} onChange={(e) => setLosing({ ...losing, reason: e.target.value })} className="border border-line/60 bg-white px-2 py-1.5 text-sm">
            <option value="">Pick a reason</option>
            {LOST_REASONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
          <input aria-label="Detail" value={losing.note} onChange={(e) => setLosing({ ...losing, note: e.target.value })} maxLength={300} placeholder="Detail (optional)" className="flex-1 border border-line/60 bg-white px-2 py-1.5 text-sm" />
          <button type="submit" className="bg-ink px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-paper">Mark lost</button>
          <button type="button" onClick={() => setLosing(null)} className="border border-line/50 px-3 py-1.5 text-xs font-bold">Cancel</button>
        </form>
      )}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {B2B_STAGES.map((s) => {
          const col = cards.filter((c) => c.stage === s.key);
          const total = col.reduce((a, c) => a + c.value_inr, 0);
          const w = col.reduce((a, c) => a + weighted(c.value_inr, c.stage), 0);
          return (
            <section
              key={s.key}
              aria-label={`${s.label}, ${col.length} deal${col.length === 1 ? "" : "s"}, ${inr(total)}`}
              onDragOver={(e) => { e.preventDefault(); setOver(s.key); }}
              onDragLeave={() => setOver((o) => (o === s.key ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const id = e.dataTransfer.getData("text/plain");
                const card = cards.find((c) => c.id === id);
                if (card && card.stage !== s.key) move(id, s.key);
              }}
              className={clsx("flex w-64 shrink-0 flex-col gap-2 border-2 p-2 transition-colors", over === s.key ? "border-ink bg-white" : "border-transparent bg-surface")}
            >
              <header className="px-1">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider">{s.label}</h2>
                  <span className="nums text-xs font-bold text-muted">{col.length}</span>
                </div>
                <p className="nums text-sm font-bold">{inr(total, true)}{s.win > 0 && s.win < 100 && <span className="text-xs font-normal text-muted"> · {inr(w, true)} at {s.win}%</span>}</p>
              </header>
              {col.map((c) => {
                const open = c.stage !== "signed" && c.stage !== "lost";
                const late = open && c.next_step_date !== null && c.next_step_date < today;
                const days = daysBetween(c.stage_changed_at, today);
                return (
                  <article
                    key={c.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", c.id); e.dataTransfer.effectAllowed = "move"; }}
                    className="card cursor-grab p-3 text-sm active:cursor-grabbing"
                  >
                    <Link href={`/admin/sales/b2b/deals/${c.id}`} className="font-bold hover:underline">{c.company_name}</Link>
                    <p className="truncate text-xs text-muted">{c.title}</p>
                    <p className="mt-1 nums text-sm font-bold">{c.value_inr ? inr(c.value_inr) : "No value yet"}{c.seats ? <span className="text-xs font-normal text-muted"> · {c.seats} seats</span> : null}</p>
                    {c.status_note && <p className="truncate text-xs italic text-muted">{c.status_note}</p>}
                    {c.stage === "document_needed" && c.pending_docs.length > 0 && <p className="text-[11px] text-violet-900">Needs {c.pending_docs.map((k) => k.toUpperCase()).join(", ")}</p>}
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                      <span className={clsx("font-bold nums", late ? "text-red-deep" : "text-muted")}>
                        {!open ? "" : !c.next_step_date ? "No next step" : c.next_step_date === today ? "Today" : late ? `Overdue · ${short(c.next_step_date)}` : short(c.next_step_date)}
                      </span>
                      <span className={clsx("nums", open && days >= 14 ? "font-bold text-red-deep" : "text-muted")} title="Days in this stage">{days}d</span>
                      <span className="truncate text-muted">{c.owner}</span>
                    </div>
                    <select
                      aria-label={`Move ${c.company_name}`}
                      value={c.stage}
                      onChange={(e) => move(c.id, e.target.value)}
                      className="mt-2 w-full border border-line/30 bg-transparent px-1 py-0.5 text-[11px]"
                    >
                      {B2B_STAGES.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                    </select>
                  </article>
                );
              })}
              {col.length === 0 && <p className="px-1 py-4 text-center text-xs text-muted">Drop a deal here</p>}
            </section>
          );
        })}
      </div>
    </>
  );
}
