"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, FilterRail, PANEL, SearchBox, type Tone } from "@/components/company/HiringParts";
import { OrgIcon } from "@/components/company/OrgIcons";
import { BATCH_FILTERS, BATCH_STATE_LABEL, pickBatches, type BatchSort, type BatchStateKey } from "@/lib/company/batch-view";

/** One batch as the list shows it. Times are already worded on the server, in the batch's own zone. */
export interface BatchRow {
  id: string;
  href: string;
  role: string;
  title: string;
  version: number;
  allowed: string;
  window: string;
  state: BatchStateKey;
  createdAt: string;
  opensAt: string;
  closesAt: string;
  /** "6 invited · 4 sent", or "8 to invite" for a draft. */
  summary: string;
  failed: number;
  action: string;
}

const TONE: Record<BatchStateKey, Tone> = { open: "blue", later: "grey", draft: "amber", closed: "grey", cancelled: "red" };

/**
 * The company's batches with a status rail, a search and a sort, all over
 * the list the page already loaded: nothing here asks the server again.
 */
export function BatchList({ rows }: { rows: BatchRow[] }) {
  const [filter, setFilter] = useState<"all" | BatchStateKey>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<BatchSort>("newest");

  const counts = useMemo(() => {
    const c = { all: rows.length, open: 0, later: 0, draft: 0, closed: 0, cancelled: 0 };
    for (const r of rows) c[r.state] += 1;
    return c;
  }, [rows]);
  const shown = pickBatches(rows, filter, query, sort);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
      <FilterRail title="Batch status" items={BATCH_FILTERS} counts={counts} value={filter} onChange={setFilter} />
      <section aria-label="Batches" className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox label="Search batches" placeholder="Search by role or test" value={query} onChange={setQuery} />
          <label className="flex items-center">
            <span className="sr-only">Sort batches</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as BatchSort)} className="h-10 rounded-md border border-line/50 bg-white px-3 text-sm">
              <option value="newest">Newest first</option>
              <option value="opens">Opens soonest</option>
              <option value="closes">Closes soonest</option>
            </select>
          </label>
        </div>
        <p className="sr-only" role="status">{shown.length === 1 ? "1 batch" : `${shown.length} batches`}</p>

        {shown.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line/50 bg-white p-6 text-center text-sm text-muted">No batches match. Try another status or search.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {shown.map((b) => (
              <li key={b.id} className={`${PANEL} flex flex-col gap-2.5 p-4 sm:p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <h2 className="display min-w-0 break-words text-lg">
                    <Link href={b.href} className="underline-offset-4 hover:underline">{b.role}</Link>
                  </h2>
                  <Badge tone={TONE[b.state]}>{BATCH_STATE_LABEL[b.state]}</Badge>
                </div>
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8rem] text-muted">
                  <span className="inline-flex items-center gap-1.5"><OrgIcon name="test" size={14} className="shrink-0" />{b.title} · version {b.version}</span>
                  <span className="inline-flex items-center gap-1.5"><OrgIcon name="clock" size={14} className="shrink-0" />{b.allowed}</span>
                  <span className="inline-flex items-center gap-1.5"><OrgIcon name="calendar" size={14} className="shrink-0" />{b.window}</span>
                </p>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
                  <p>
                    {b.summary}
                    {b.failed > 0 && <strong className="text-error"> · {b.failed} failed</strong>}
                  </p>
                  <Link href={b.href} className="font-bold underline underline-offset-4 hover:text-red-deep">{b.action}</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
