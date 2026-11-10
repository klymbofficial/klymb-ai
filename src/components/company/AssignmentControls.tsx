"use client";

import { useState, useTransition } from "react";
import { assignAllWithout, assignCourse, unassignCourse, type AssignResult } from "@/app/org/[slug]/learning/actions";
import { ProgressTable } from "@/components/company/ProgressTable";
import { unassignedCount } from "@/lib/company/assign-rules";
import type { MemberProgress } from "@/lib/company/progress-data";

const btn =
  "border-2 border-ink px-3 py-1.5 text-xs font-bold transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-60";

/**
 * HR's Learning table: the progress table with an Assign / Remove button on
 * each row, the "assign to everyone without it" bar above it, and the last
 * result. All the rules live on the server (learning/actions.ts); this only
 * shows the numbers HR is about to act on, and asks before a bulk change.
 */
export function AssignmentControls({ slug, rows, total, seats }: { slug: string; rows: MemberProgress[]; total: number; seats: number }) {
  const [result, setResult] = useState<AssignResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const used = rows.filter((r) => r.assigned).length;
  const count = unassignedCount(rows);
  const fits = used + count <= seats;

  const assignAll = () => {
    if (!window.confirm(`Assign System Design to ${count} ${count === 1 ? "person" : "people"}?\n\nThat takes the course to ${used + count} of your ${seats} seats. Each person opens it by signing in to the course with Google, using their work email.`)) return;
    setBusy("*");
    start(async () => { setResult(await assignAllWithout(slug, count)); setBusy(null); });
  };

  const one = (p: MemberProgress) => {
    if (p.assigned && !window.confirm(`Take System Design back from ${p.email}?\n\nThey can no longer open the course. What they did is kept.`)) return;
    setBusy(p.email);
    start(async () => { setResult(await (p.assigned ? unassignCourse(slug, p.email) : assignCourse(slug, p.email))); setBusy(null); });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm">
          <strong>{used}</strong> of <strong>{seats}</strong> seats have the course assigned.
          {count > 0 && <span className="text-muted"> {count} {count === 1 ? "person has" : "people have"} none.</span>}
        </p>
        {count > 0 && (
          <button type="button" onClick={assignAll} disabled={pending || !fits} className={btn} title={fits ? undefined : "That would pass your seat count"}>
            {busy === "*" ? "Assigning…" : `Assign to everyone without it (${count})`}
          </button>
        )}
      </div>
      {count > 0 && !fits && (
        <p className="text-xs text-muted">Assigning all {count} would pass your {seats} seats, so it&apos;s switched off. Assign people one at a time, or ask Klymb for more seats.</p>
      )}
      {result && (
        <p role={result.ok ? "status" : "alert"} className={result.ok ? "border-2 border-ink/20 bg-card p-3 text-sm" : "border-2 border-error bg-error-tint p-3 text-sm font-semibold text-error"}>
          {result.message}
        </p>
      )}
      <ProgressTable
        rows={rows}
        total={total}
        showTeam
        actionLabel="Course"
        renderAction={(p) =>
          p.ownAccess ? (
            <span className="text-xs text-muted">Has its own</span>
          ) : (
            <button type="button" onClick={() => one(p)} disabled={pending} className={btn}>
              {busy === p.email ? "Saving…" : p.assigned ? "Remove" : "Assign"}
            </button>
          )
        }
      />
    </div>
  );
}
