"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CandidateActions } from "@/components/company/BatchControls";
import { Badge, FilterRail, PANEL, SearchBox, type Tone } from "@/components/company/HiringParts";
import { CANDIDATE_FILTERS, countBy, pickCandidates, type CandidateFilter } from "@/lib/company/batch-view";

/** One person as the table shows them, worded on the server. */
export interface CandidateRow {
  id: string;
  name: string;
  email: string;
  invitation: { label: string; tone: Tone };
  /** Why the invitation failed or wasn't sent, with its lead-in ("Why it failed"). */
  why: { lead: string; text: string } | null;
  link: { label: string; tone: Tone };
  startBy: string;
  allowed: string;
  /** "Reminded once", "Automatic reminder sent". */
  reminders: string[];
  /** The latest automatic reminder didn't go out. */
  autoFailed: string | null;
  tags: CandidateFilter[];
  /** Where their review stands and the link to it, once they have submitted. */
  review: { label: string; tone: Tone; href: string; action: string } | null;
  /** What a recruiter can do for this person now; null when nothing can be done or the viewer only looks. */
  actions: { retry: boolean; fixEmail: boolean; remind: boolean; newLink: boolean; passed: boolean; extraMinutes: number; lastStartInput: string } | null;
}

/**
 * A batch's people: a filter rail with counts, a search, and a table whose
 * last column holds the actions Klymb already has for one person. Filtering
 * and search work on the rows the page loaded.
 */
export function CandidateTable({ rows, slug, batchId, timeZone }: { rows: CandidateRow[]; slug: string; batchId: string; timeZone: string }) {
  const [filter, setFilter] = useState<CandidateFilter>("all");
  const [query, setQuery] = useState("");
  const counts = useMemo(() => countBy(rows, CANDIDATE_FILTERS.map((f) => f.key)), [rows]);
  // Filters that hold nobody are left out, except All, so the rail lists only what's there.
  const filters = CANDIDATE_FILTERS.filter((f) => f.key === "all" || counts[f.key] > 0 || f.key === filter);
  const shown = pickCandidates(rows, filter, query);
  const label = CANDIDATE_FILTERS.find((f) => f.key === filter)?.label ?? "All";

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
      <FilterRail title="Candidates" items={filters} counts={counts} value={filter} onChange={setFilter} />
      <section aria-label="Candidates" className={`${PANEL} min-w-0 flex-1`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/20 p-3 sm:px-4">
          <h2 className="text-base font-bold">
            {label} <span className="font-normal text-muted">({shown.length})</span>
          </h2>
          <SearchBox label="Search candidates" placeholder="Search name or email" value={query} onChange={setQuery} />
        </div>
        {shown.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">Nobody matches. Try another filter or search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[54rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line/20 text-left text-[0.7rem] uppercase tracking-[0.1em] text-muted">
                  <th scope="col" className="px-4 py-2.5 font-extrabold">Candidate</th>
                  <th scope="col" className="px-4 py-2.5 font-extrabold">Invitation</th>
                  <th scope="col" className="px-4 py-2.5 font-extrabold">Link</th>
                  <th scope="col" className="px-4 py-2.5 font-extrabold">Start by</th>
                  <th scope="col" className="px-4 py-2.5 font-extrabold">Review</th>
                  <th scope="col" className="px-4 py-2.5 font-extrabold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={c.id} className="border-b border-line/15 align-top last:border-b-0">
                    <td className="w-[13rem] max-w-[13rem] px-4 py-3">
                      <p className="truncate font-semibold" title={c.name}>{c.name}</p>
                      <p className="truncate text-xs text-muted" title={c.email}>{c.email}</p>
                    </td>
                    <td className="min-w-[10rem] max-w-[13rem] px-4 py-3">
                      <Badge tone={c.invitation.tone}>{c.invitation.label}</Badge>
                      {c.why && <p className="mt-1 text-xs font-semibold text-error">{c.why.lead}: {c.why.text}</p>}
                      {c.reminders.map((r) => <p key={r} className="mt-1 text-xs text-muted">{r}</p>)}
                      {c.autoFailed && <p className="mt-1 text-xs font-semibold text-error">{c.autoFailed}</p>}
                    </td>
                    <td className="px-4 py-3"><Badge tone={c.link.tone}>{c.link.label}</Badge></td>
                    <td className="px-4 py-3">
                      <p className="whitespace-nowrap">{c.startBy}</p>
                      <p className="mt-0.5 text-xs text-muted">{c.allowed}</p>
                    </td>
                    <td className="px-4 py-3">
                      {c.review ? (
                        <>
                          <Badge tone={c.review.tone}>{c.review.label}</Badge>
                          <Link href={c.review.href} className="mt-1 block text-xs font-bold underline underline-offset-4">{c.review.action}</Link>
                        </>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="min-w-[15rem] px-4 py-3">
                      {c.actions ? (
                        <CandidateActions
                          slug={slug}
                          batchId={batchId}
                          candidateId={c.id}
                          name={c.name}
                          retry={c.actions.retry}
                          fixEmail={c.actions.fixEmail}
                          remind={c.actions.remind}
                          newLink={c.actions.newLink}
                          passed={c.actions.passed}
                          timeZone={timeZone}
                          extraMinutes={c.actions.extraMinutes}
                          lastStartInput={c.actions.lastStartInput}
                        />
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
