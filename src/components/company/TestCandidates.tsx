"use client";

import clsx from "clsx";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CandidateActions } from "@/components/company/BatchControls";
import { Badge, PANEL, SearchBox } from "@/components/company/HiringParts";
import type { PersonFilter, PersonRow } from "@/lib/company/round-data";
import { HUB_FILTERS } from "@/lib/company/test-hub-view";

const FILTERS: readonly { key: PersonFilter; label: string }[] = [...HUB_FILTERS.slice(0, -1), { key: "failed", label: "Invitation failed" }, HUB_FILTERS[HUB_FILTERS.length - 1]];
const PAGE = 20;

/**
 * A test's candidates from every round: the rail on the left with counts,
 * then a searchable table with each person's invitation, where they are,
 * their score and decision, and what can be done for them now (the same
 * actions the old batch page had). Twenty rows a page.
 */
export function TestCandidates({ rows, initial, slug }: { rows: PersonRow[]; initial: PersonFilter; slug: string }) {
  const [filter, setFilter] = useState<PersonFilter>(initial);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const counts = useMemo(() => {
    const c = Object.fromEntries(FILTERS.map((f) => [f.key, 0])) as Record<PersonFilter, number>;
    for (const r of rows) for (const t of r.tags) c[t] += 1;
    return c;
  }, [rows]);
  const q = query.trim().toLowerCase();
  const matching = rows.filter((r) => r.tags.includes(filter) && (!q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)));
  const pages = Math.max(1, Math.ceil(matching.length / PAGE));
  const at = Math.min(page, pages - 1);
  const shown = matching.slice(at * PAGE, at * PAGE + PAGE);
  const label = FILTERS.find((f) => f.key === filter)!.label;
  const pick = (k: PersonFilter) => { setFilter(k); setPage(0); };

  return (
    <div className={clsx(PANEL, "flex flex-col lg:flex-row")}>
      <nav aria-label="Candidates" className="border-b border-line/30 p-2 lg:w-56 lg:shrink-0 lg:border-r lg:border-b-0 lg:py-4">
        <p className="hidden px-3 pb-2 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-muted lg:block">Candidates</p>
        <ul className="flex gap-1 overflow-x-auto lg:flex-col">
          {FILTERS.map((f) => {
            const on = f.key === filter;
            return (
              <li key={f.key} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => pick(f.key)}
                  className={clsx("flex min-h-10 w-full items-center justify-between gap-3 whitespace-nowrap rounded-md px-3 text-left text-sm", on ? "bg-[#eef2fd] font-semibold text-[#1f4fd1]" : "hover:bg-paper")}
                >
                  <span>{f.label}</span>
                  <span className={clsx("min-w-7 rounded-full px-2 text-center text-xs font-bold", on ? "bg-[#1f4fd1] text-white" : "text-ink")}>{counts[f.key]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <section aria-label={label} className="min-w-0 flex-1 p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-bold">{label}</h2>
        <div className="rounded-md border border-line/30">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/30 p-3">
            <p className="font-semibold">Candidates ({matching.length})</p>
            <SearchBox label="Search candidates" placeholder="Search by name or email" value={query} onChange={(v) => { setQuery(v); setPage(0); }} />
          </div>
          <p className="sr-only" role="status">{matching.length === 1 ? "1 candidate" : `${matching.length} candidates`}</p>
          {shown.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">Nobody here{q ? " matches that search" : " yet"}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[66rem] text-left text-sm">
                <thead className="bg-paper text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 font-semibold">#</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Candidate info</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Invitation</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Score</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Decision</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r, i) => (
                    <tr key={r.id} className="border-t border-line/20 align-top">
                      <td className="px-3 py-3 tabular-nums text-muted">{at * PAGE + i + 1}</td>
                      <td className="max-w-60 px-3 py-3">
                        <p className="truncate font-semibold" title={r.name}>{r.name}</p>
                        <p className="truncate text-[#1f4fd1]" title={r.email}>{r.email}</p>
                        <p className="mt-1 truncate text-xs text-muted" title={r.round}>{r.internal && <span className="mr-1 rounded bg-[#e3ecfb] px-1.5 font-bold text-[#163d7a]">Internal</span>}{r.round}</p>
                      </td>
                      <td className="max-w-52 px-3 py-3">
                        <Badge tone={r.invitation.tone}>{r.invitation.label}</Badge>
                        {r.why && <p className="mt-1 text-xs font-semibold text-error">{r.why.lead}: {r.why.text}</p>}
                        {r.reminders.map((m) => <p key={m} className="mt-1 text-xs text-muted">{m}</p>)}
                        {r.autoFailed && <p className="mt-1 text-xs font-semibold text-error">{r.autoFailed}</p>}
                      </td>
                      <td className="max-w-56 px-3 py-3">
                        <Badge tone={r.status.tone}>{r.status.label}</Badge>
                        <p className="mt-1 text-xs">{r.when}</p>
                        <p className="text-xs text-muted">{r.allowed}</p>
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {r.score ?? (r.autoScore ? <span title="Multiple choice marked automatically; a reviewer confirms it">Auto {r.autoScore}<span className="block text-xs text-muted">to confirm</span></span> : <span className="text-muted">—</span>)}
                        {r.warnings > 0 && <span className="mt-1 block text-xs font-bold text-error" title="Full-screen exits and tab or window switches">{r.warnings} proctoring {r.warnings === 1 ? "warning" : "warnings"}</span>}
                        {r.cutoff && <span className="mt-1 block"><Badge tone={r.cutoff === "cleared" ? "green" : "red"}>{r.cutoff === "cleared" ? "Cleared cut-off" : "Below cut-off"}</Badge></span>}
                      </td>
                      <td className="px-3 py-3">
                        {r.decision ? <Badge tone={r.decision.tone}>{r.decision.label}</Badge> : <span className="text-muted">{r.internal ? "Internal" : "—"}</span>}
                        {r.decision?.shared && <span className="mt-1 block whitespace-nowrap text-xs text-muted">Result shared</span>}
                      </td>
                      <td className="min-w-[13rem] px-3 py-3">
                        {r.open && <Link href={r.open.href} className="font-semibold text-[#1f4fd1] underline-offset-4 hover:underline">{r.open.label}</Link>}
                        {r.actions && (
                          <CandidateActions
                            slug={slug}
                            batchId={r.batchId}
                            candidateId={r.id}
                            name={r.name}
                            retry={r.actions.retry}
                            fixEmail={r.actions.fixEmail}
                            remind={r.actions.remind}
                            newLink={r.actions.newLink}
                            copyLink={r.actions.copyLink}
                            passed={r.actions.passed}
                            timeZone={r.actions.timeZone}
                            extraMinutes={r.actions.extraMinutes}
                            lastStartInput={r.actions.lastStartInput}
                          />
                        )}
                        {!r.open && !r.actions && <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {pages > 1 && (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm">
            <button type="button" disabled={at === 0} onClick={() => setPage(at - 1)} className="min-h-9 rounded-md border border-line/50 px-3 disabled:opacity-40">← Previous</button>
            <span className="px-2 tabular-nums">{at + 1} of {pages}</span>
            <button type="button" disabled={at >= pages - 1} onClick={() => setPage(at + 1)} className="min-h-9 rounded-md border border-line/50 px-3 disabled:opacity-40">Next →</button>
          </div>
        )}
      </section>
    </div>
  );
}
