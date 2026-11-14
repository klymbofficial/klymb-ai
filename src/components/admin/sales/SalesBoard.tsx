"use client";

import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";
import { updateLeadField } from "@/app/admin/sales-actions";
import { formatPhone, STAGES } from "@/lib/sales";

export interface BoardCard {
  id: string;
  name: string;
  phone: string | null;
  org: string | null;
  stage: string;
  next_follow_up: string | null;
  owner_email: string | null;
  paid: boolean;
}

const short = (day: string) => new Date(`${day}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

/**
 * The pipeline as columns, Pipedrive-style: drag a card to move its stage.
 * Each card also has a stage menu, for keyboards and phones where dragging
 * isn't practical.
 */
export function SalesBoard({ cards: initial, today, ownerName }: { cards: BoardCard[]; today: string; ownerName: Record<string, string> }) {
  const [cards, setCards] = useState(initial);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function move(id: string, stage: string) {
    const before = cards;
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, stage } : c)));
    setError("");
    const r = await updateLeadField(id, "stage", stage);
    if (!r.ok) { setCards(before); setError(r.message); }
  }

  return (
    <>
      {error && <p role="alert" className="mb-2 text-xs font-semibold text-error">{error}</p>}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((s) => {
          const col = cards.filter((c) => c.stage === s.key);
          return (
            <section
              key={s.key}
              aria-label={`${s.label}, ${col.length}`}
              onDragOver={(e) => { e.preventDefault(); setOver(s.key); }}
              onDragLeave={() => setOver((o) => (o === s.key ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const id = e.dataTransfer.getData("text/plain");
                const card = cards.find((c) => c.id === id);
                if (card && card.stage !== s.key) move(id, s.key);
              }}
              className={clsx("flex w-60 shrink-0 flex-col gap-2 border-2 p-2 transition-colors", over === s.key ? "border-ink bg-white" : "border-transparent bg-surface")}
            >
              <header className="flex items-baseline justify-between px-1">
                <h2 className="text-xs font-extrabold uppercase tracking-wider">{s.label}</h2>
                <span className="nums text-xs font-bold text-muted">{col.length}</span>
              </header>
              {col.map((c) => {
                const due = c.next_follow_up !== null && c.next_follow_up <= today && !["signed", "rejected"].includes(c.stage);
                return (
                  <article
                    key={c.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", c.id); e.dataTransfer.effectAllowed = "move"; }}
                    className="card cursor-grab p-3 text-sm active:cursor-grabbing"
                  >
                    <Link href={`/admin/sales/leads/${c.id}`} className="font-bold hover:underline">{c.name}</Link>
                    {c.paid && <span className="ml-1.5 bg-emerald-700 px-1 py-0.5 text-[10px] font-extrabold text-white">PAID</span>}
                    <p className="text-xs text-muted nums">{c.phone ? formatPhone(c.phone) : "—"}{c.org ? ` · ${c.org}` : ""}</p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                      <span className={clsx("font-bold nums", due ? "text-red-deep" : "text-muted")}>
                        {c.next_follow_up ? (c.next_follow_up === today ? "Today" : due ? `Overdue · ${short(c.next_follow_up)}` : short(c.next_follow_up)) : "No follow-up"}
                      </span>
                      <span className="truncate text-muted">{c.owner_email ? ownerName[c.owner_email] ?? c.owner_email.split("@")[0] : "Unassigned"}</span>
                    </div>
                    <select
                      aria-label={`Move ${c.name}`}
                      value={c.stage}
                      onChange={(e) => move(c.id, e.target.value)}
                      className="mt-2 w-full border border-line/30 bg-transparent px-1 py-0.5 text-[11px]"
                    >
                      {STAGES.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                    </select>
                  </article>
                );
              })}
              {col.length === 0 && <p className="px-1 py-4 text-center text-xs text-muted">Drop a card here</p>}
            </section>
          );
        })}
      </div>
    </>
  );
}
