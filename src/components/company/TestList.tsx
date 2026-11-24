"use client";

import clsx from "clsx";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PANEL, SearchBox } from "@/components/company/HiringParts";
import { OrgIcon, type OrgIconName } from "@/components/company/OrgIcons";
import { TEST_AGE_LABEL, TEST_STATUS_FILTERS, pickTests, takeUpText, type TestAge, type TestSort, type TestStatus } from "@/lib/company/test-hub-view";

/** One test as the list shows it. Words are prepared on the server. */
export interface TestRow {
  slug: string;
  href: string;
  title: string;
  role: string;
  status: TestStatus;
  /** "1 hr 30 mins". */
  duration: string;
  /** "Version 2 · published 6 Nov 2026", or why there's no version yet. */
  versionLine: string;
  publishedAt: string | null;
  /** "Waiting for your review", shown on tests that aren't ongoing. */
  note: string | null;
  invited: number;
  taken: number;
  /** Shown only to people who can see candidates. */
  reportHref: string | null;
  previewHref: string | null;
  /** Shown only to recruiters, on a test with an approved version. */
  inviteHref: string | null;
}

const LINK = "inline-flex items-center gap-1.5 text-sm font-semibold text-[#1f4fd1] underline-offset-4 hover:underline";

function Fact({ icon, children }: { icon: OrgIconName; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 sm:border-r sm:border-line/40 sm:pr-3 sm:last:border-r-0">
      <OrgIcon name={icon} size={16} className="shrink-0" />
      {children}
    </span>
  );
}

/**
 * The company's tests, laid out like a recruiter's test list: a status rail
 * with counts and a creation-date filter on the left; search and sort on
 * top; one card per test with its facts, take-up and direct actions.
 * Everything filters what the page already loaded.
 */
export function TestList({ rows, now }: { rows: TestRow[]; now: string }) {
  const first = TEST_STATUS_FILTERS.find((f) => rows.some((r) => r.status === f.key))?.key ?? "ongoing";
  const [status, setStatus] = useState<TestStatus>(first);
  const [age, setAge] = useState<TestAge>("any");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<TestSort>("newest");

  const counts = useMemo(() => {
    const c: Record<TestStatus, number> = { ongoing: 0, review: 0, unpublished: 0 };
    for (const r of rows) c[r.status] += 1;
    return c;
  }, [rows]);
  const shown = pickTests(rows, status, query, age, sort, new Date(now));

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-0">
      <aside className="flex flex-col gap-5 lg:w-60 lg:shrink-0 lg:border-r lg:border-line/30 lg:pr-6">
        <fieldset>
          <legend className="mb-2 text-sm font-bold">Test status</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1 lg:flex-col">
            {TEST_STATUS_FILTERS.map((f) => (
              <label key={f.key} className={clsx("flex min-h-9 cursor-pointer items-center gap-2.5 text-sm", status === f.key && "font-semibold text-[#1f4fd1]")}>
                <input type="radio" name="test-status" value={f.key} checked={status === f.key} onChange={() => setStatus(f.key)} className="size-4 accent-[#1f4fd1]" />
                {f.label} ({counts[f.key]})
              </label>
            ))}
          </div>
        </fieldset>
        <hr className="hidden border-line/30 lg:block" />
        <label className="flex flex-col gap-1.5 text-sm font-bold">
          Creation date
          <select value={age} onChange={(e) => setAge(e.target.value as TestAge)} className="h-10 rounded-md border border-line/50 bg-white px-3 text-sm font-normal">
            {(Object.keys(TEST_AGE_LABEL) as TestAge[]).map((k) => <option key={k} value={k}>{TEST_AGE_LABEL[k]}</option>)}
          </select>
        </label>
        <div className="text-sm">
          <p className="font-bold">Test type</p>
          <p className="mt-1.5 flex items-center gap-2 text-muted"><OrgIcon name="mail" size={16} />Invite only</p>
          <p className="mt-1 text-xs text-muted">Candidates start from their own invitation link.</p>
        </div>
      </aside>

      <section aria-label="Tests" className="flex min-w-0 flex-1 flex-col gap-4 lg:pl-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex sm:max-w-sm sm:flex-1"><SearchBox label="Search tests" placeholder="Search by test name or role" value={query} onChange={setQuery} /></div>
          <label className="flex items-center sm:w-auto">
            <span className="sr-only">Sort tests</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as TestSort)} className="h-10 w-full rounded-md border border-line/50 bg-white px-3 text-sm">
              <option value="newest">Published (newest to oldest)</option>
              <option value="oldest">Published (oldest to newest)</option>
              <option value="candidates">Most candidates invited</option>
            </select>
          </label>
        </div>
        <p className="sr-only" role="status">{shown.length === 1 ? "1 test" : `${shown.length} tests`}</p>

        {shown.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line/50 bg-white p-6 text-center text-sm text-muted">No tests match. Try another status, date or search.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {shown.map((t) => (
              <li key={t.slug} className={clsx(PANEL, "flex flex-col gap-3 p-5 shadow-sm")}>
                <h2 className="text-lg font-bold">
                  <Link href={t.href} className="underline-offset-4 hover:underline">{t.title}</Link>
                </h2>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  <Fact icon="mail">Invite only</Fact>
                  <Fact icon="clock">{t.duration}</Fact>
                  <Fact icon="calendar">{t.versionLine}</Fact>
                </p>
                {t.note && <p className="text-sm font-semibold">{t.note}</p>}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <p className="text-sm sm:max-w-sm">{takeUpText(t.invited, t.taken)}</p>
                  <div className="grid grid-cols-[auto_auto] gap-x-6 gap-y-2 sm:shrink-0">
                    {t.reportHref && <Link href={t.reportHref} className={LINK}><OrgIcon name="report" size={16} />View candidate report</Link>}
                    {t.previewHref && <Link href={t.previewHref} className={LINK}><OrgIcon name="eye" size={16} />Preview test</Link>}
                    {t.inviteHref && <Link href={t.inviteHref} className={LINK}><OrgIcon name="invite" size={16} />Invite candidates</Link>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
