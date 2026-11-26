"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, PANEL, SearchBox } from "@/components/company/HiringParts";
import { Overlay } from "@/components/company/Overlay";
import type { CandidatePerson } from "@/lib/company/candidate-people";

const PAGE = 30;

/**
 * Everyone invited to an external test, in one searchable table: name,
 * email, how many tests, their latest test and where they are in it.
 * Clicking a person opens a drawer with every test they were sent, its
 * score and decision, and a link to the attempt.
 */
export function PeopleDirectory({ people }: { people: CandidatePerson[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [email, setEmail] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const matching = people.filter((p) => !q || p.email.includes(q) || p.name.toLowerCase().includes(q) || p.tests.some((t) => t.title.toLowerCase().includes(q)));
  const pages = Math.max(1, Math.ceil(matching.length / PAGE));
  const at = Math.min(page, pages - 1);
  const shown = matching.slice(at * PAGE, at * PAGE + PAGE);
  const open = people.find((p) => p.email === email) ?? null;

  return (
    <>
      <section aria-labelledby="people-title" className={PANEL}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line/25 px-4 py-3">
          <h2 id="people-title" className="mr-auto text-base font-semibold nums">Candidates ({matching.length})</h2>
          <SearchBox label="Search people" placeholder="Search by name, email or test" value={query} onChange={(v) => { setQuery(v); setPage(0); }} />
        </div>
        {shown.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            {people.length === 0 ? "Nobody yet. People appear here once you invite them to a test from Assessments." : "Nobody matches that search."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line/25 text-xs text-muted">
                <tr>
                  <th className="w-12 px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Latest test</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Tests</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p, i) => {
                  const latest = p.tests[0];
                  return (
                    <tr key={p.email} onClick={() => setEmail(p.email)} className="cursor-pointer border-b border-line/15 last:border-0 hover:bg-paper">
                      <td className="px-4 py-3 text-muted nums">{String(at * PAGE + i + 1).padStart(2, "0")}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-paper">{p.name.trim()[0]?.toUpperCase() ?? "?"}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setEmail(p.email); }} className="whitespace-nowrap font-semibold hover:underline">{p.name}</button>
                        </span>
                      </td>
                      <td className="max-w-64 truncate px-4 py-3" title={p.email}>{p.email}</td>
                      <td className="max-w-64 truncate px-4 py-3" title={latest.title}>{latest.title}</td>
                      <td className="px-4 py-3"><Badge tone={latest.decision?.tone ?? latest.status.tone}>{latest.decision?.label ?? latest.status.label}</Badge></td>
                      <td className="px-4 py-3 text-right nums">{p.tests.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-line/25 px-4 py-2 text-sm">
            <span className="mr-2 text-muted nums">Page {at + 1} of {pages}</span>
            <button type="button" disabled={at === 0} onClick={() => setPage(at - 1)} className="rounded-md px-3 py-1.5 font-semibold hover:bg-paper disabled:opacity-40">Previous</button>
            <button type="button" disabled={at >= pages - 1} onClick={() => setPage(at + 1)} className="rounded-md px-3 py-1.5 font-semibold hover:bg-paper disabled:opacity-40">Next</button>
          </div>
        )}
      </section>

      <Overlay open={open !== null} onClose={() => setEmail(null)} title={open?.name ?? ""} description={open?.email} kind="drawer" size="md">
        {open && (
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold nums">Tests ({open.tests.length})</h3>
            <ul className="flex flex-col gap-3">
              {open.tests.map((t, i) => (
                <li key={`${t.item}-${i}`} className="rounded-lg border border-line/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{t.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{t.round}</p>
                    </div>
                    <Badge tone={t.status.tone}>{t.status.label}</Badge>
                  </div>
                  <dl className="mt-3 grid grid-cols-[6.5rem_1fr] gap-y-1.5 text-sm">
                    <dt className="text-muted">Invitation</dt><dd><Badge tone={t.invitation.tone}>{t.invitation.label}</Badge></dd>
                    <dt className="text-muted">When</dt><dd>{t.when}</dd>
                    <dt className="text-muted">Score</dt>
                    <dd className="nums">{t.score ?? <span className="text-muted">—</span>}</dd>
                    <dt className="text-muted">Decision</dt><dd>{t.decision ? <Badge tone={t.decision.tone}>{t.decision.label}</Badge> : <span className="text-muted">—</span>}</dd>
                  </dl>
                  <Link href={t.href} className="mt-3 inline-block text-sm font-semibold text-[#1f4fd1] hover:underline">Open in the test →</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Overlay>
    </>
  );
}
