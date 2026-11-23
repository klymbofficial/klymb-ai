"use client";

import { useState, useTransition } from "react";
import { removeAssignment, type ConfirmResult } from "@/app/org/[slug]/(workspace)/learning/actions";
import { AssignPanel, type PanelPerson } from "@/components/company/AssignPanel";
import { ProgressTable } from "@/components/company/ProgressTable";
import type { MemberProgress } from "@/lib/company/progress-data";

const rowBtn =
  "border-2 border-ink px-3 py-1.5 text-xs font-bold transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-60";
const primary = "border-2 border-red-strong bg-red-strong px-5 py-2.5 text-sm font-bold text-white hover:border-red-press hover:bg-red-press";

/**
 * Learning for someone who assigns (an admin, or a lead for their team): the
 * one primary action, Assign course, then whatever the page puts in between
 * (who needs attention, the summary), then the table, where each row can be
 * assigned or have its assignment removed. The rules live on the server.
 */
export function AssignmentControls({
  slug, rows, total, showTeam, people, teams, canEveryone, between,
}: {
  slug: string;
  rows: MemberProgress[];
  total: number;
  showTeam: boolean;
  people: PanelPerson[];
  teams: { id: string; name: string }[];
  canEveryone: boolean;
  between?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [preselect, setPreselect] = useState<string | null>(null);
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const openFor = (email: string | null) => {
    setPreselect(email);
    setResult(null);
    setOpen(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = (p: MemberProgress) => {
    if (!window.confirm(`Remove System Design from ${p.name ?? p.email}?\n\nThey can no longer open the course. What they did is kept.`)) return;
    setBusy(p.email);
    start(async () => { setResult(await removeAssignment(slug, p.email)); setBusy(null); });
  };

  return (
    <div className="flex flex-col gap-8">
      {open ? (
        <AssignPanel
          key={preselect ?? "*"}
          slug={slug}
          people={people}
          teams={teams}
          canEveryone={canEveryone}
          preselect={preselect}
          onDone={(r) => { setResult(r); setOpen(false); }}
          onCancel={() => setOpen(false)}
        />
      ) : (
        <div>
          <button type="button" onClick={() => openFor(null)} className={primary}>Assign course</button>
        </div>
      )}
      {result && (
        <p role={result.ok ? "status" : "alert"} className={result.ok ? "border-2 border-ink/20 bg-card p-3 text-sm" : "border-2 border-error bg-error-tint p-3 text-sm font-semibold text-error"}>
          {result.message}
        </p>
      )}
      {between}
      <ProgressTable
        rows={rows}
        total={total}
        showTeam={showTeam}
        showDue
        actionLabel="Course"
        renderAction={(p) =>
          p.ownAccess && !p.assigned ? (
            <span className="text-xs text-muted">Has their own</span>
          ) : p.assigned ? (
            <button type="button" onClick={() => remove(p)} disabled={pending} className={rowBtn}>
              {busy === p.email ? "Removing…" : "Remove"}
            </button>
          ) : (
            <button type="button" onClick={() => openFor(p.email)} className={rowBtn} aria-label={`Assign to ${p.name ?? p.email}`}>
              Assign
            </button>
          )
        }
      />
    </div>
  );
}
