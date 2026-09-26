"use client";

import clsx from "clsx";
import Link from "next/link";
import { useMemo, useState } from "react";

export interface BoardDay {
  day: number;
  week: number;
  weekName: string;
  title: string;
  points: number;
  estimateMinutes: number;
  kind: "build" | "assessment" | "interview";
  /** ISO date this day falls on. */
  date: string;
  submitted: boolean;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const monthKey = (iso: string) => iso.slice(0, 7);

function formatLong(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`;
}

/**
 * The learner's whole cohort on one surface: a calendar of the 30 days, the
 * day list, and the detail of whichever day is selected.
 *
 * Selecting a day is local state: nothing is saved until they open the day
 * itself, so a learner can look ahead without changing anything.
 */
export function CohortBoard({ days, initialDay }: { days: BoardDay[]; initialDay: number }) {
  const [selected, setSelected] = useState(initialDay);
  const byDay = useMemo(() => new Map(days.map((d) => [d.day, d])), [days]);
  const active = byDay.get(selected) ?? days[0];

  // Only the months the cohort actually touches are reachable.
  const months = useMemo(() => [...new Set(days.map((d) => monthKey(d.date)))].sort(), [days]);
  const [month, setMonth] = useState(() => monthKey(byDay.get(initialDay)?.date ?? days[0].date));
  const monthIndex = months.indexOf(month);

  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

  // Assessments land on the same weekday every week, so that column is named
  // in red the way the design marks it.
  const assessmentWeekdays = useMemo(
    () => new Set(days.filter((d) => d.kind === "assessment").map((d) => new Date(`${d.date}T00:00:00Z`).getUTCDay())),
    [days],
  );

  const cells = useMemo(() => {
    const [year, mon] = month.split("-").map(Number);
    const first = new Date(Date.UTC(year, mon - 1, 1));
    const total = new Date(Date.UTC(year, mon, 0)).getUTCDate();
    const lead = first.getUTCDay();
    return [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: total }, (_, i) => {
        const date = `${month}-${String(i + 1).padStart(2, "0")}`;
        return { dayOfMonth: i + 1, entry: byDate.get(date) ?? null };
      }),
    ];
  }, [month, byDate]);

  function pick(entry: BoardDay) {
    setSelected(entry.day);
    setMonth(monthKey(entry.date));
  }

  return (
    <div className="card grid gap-8 rounded-slab p-6 sm:p-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.55fr)_minmax(0,1fr)] lg:gap-6 lg:p-10">
      {/* ── Calendar ─────────────────────────────────────────── */}
      <section aria-labelledby="your-30-days" className="min-w-0">
        <h2 id="your-30-days" className="display text-3xl">Your 30 days</h2>
        <p className="mt-2 text-sm text-muted">Submitted days are filled. Assessment days are marked in red.</p>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMonth(months[monthIndex - 1])}
              disabled={monthIndex <= 0}
              aria-label="Previous month"
              className="grid size-8 place-items-center rounded-md text-lg text-muted transition-colors hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ‹
            </button>
            <p aria-live="polite" className="text-xl font-extrabold">
              {MONTHS[Number(month.slice(5, 7)) - 1]} {month.slice(0, 4)}
            </p>
            <button
              type="button"
              onClick={() => setMonth(months[monthIndex + 1])}
              disabled={monthIndex >= months.length - 1}
              aria-label="Next month"
              className="grid size-8 place-items-center rounded-md text-lg text-muted transition-colors hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ›
            </button>
          </div>

          <ul className="flex items-center gap-4 text-xs font-semibold">
            <li className="flex items-center gap-2"><span aria-hidden="true" className="size-4 rounded bg-red-tint" />Test day</li>
            <li className="flex items-center gap-2"><span aria-hidden="true" className="size-4 rounded bg-red-strong" />Mock day</li>
          </ul>
        </div>

        <table className="mt-6 w-full table-fixed border-separate border-spacing-y-1 text-center">
          <thead>
            <tr>
              {WEEKDAYS.map((d, i) => (
                <th
                  key={d}
                  scope="col"
                  className={clsx("pb-3 text-sm font-medium", assessmentWeekdays.has(i) ? "font-bold text-red-deep" : "text-muted")}
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.ceil(cells.length / 7) }, (_, row) => (
              <tr key={row}>
                {cells.slice(row * 7, row * 7 + 7).map((cell, i) => {
                  if (!cell) return <td key={i} />;
                  const { entry } = cell;
                  const isSelected = entry?.day === selected;
                  return (
                    <td key={i} className="p-0">
                      {entry ? (
                        <button
                          type="button"
                          onClick={() => pick(entry)}
                          aria-pressed={isSelected}
                          aria-label={`Day ${entry.day}: ${entry.title}`}
                          className={clsx(
                            "mx-auto grid size-11 place-items-center rounded-lg text-base font-semibold transition-colors",
                            isSelected
                              ? "bg-red-strong text-white"
                              : entry.kind === "interview"
                                ? "bg-red-strong/85 text-white hover:bg-red-strong"
                                : entry.kind === "assessment"
                                  ? "bg-red-tint text-red-deep hover:bg-red-tint/70"
                                  : entry.submitted
                                    ? "bg-ink text-paper hover:bg-ink/85"
                                    : "hover:bg-surface",
                          )}
                        >
                          {cell.dayOfMonth}
                        </button>
                      ) : (
                        <span className="mx-auto grid size-11 place-items-center text-base text-muted/60">{cell.dayOfMonth}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── Day picker ───────────────────────────────────────── */}
      <section aria-labelledby="pick-a-day" className="min-w-0 lg:border-x lg:border-line/25 lg:px-6">
        <h2 id="pick-a-day" className="text-center text-lg font-semibold text-muted">Pick a day</h2>
        <ul className="mt-6 flex gap-2 overflow-x-auto pb-2 lg:max-h-[26rem] lg:flex-col lg:overflow-x-visible lg:overflow-y-auto">
          {days.map((d) => (
            <li key={d.day} className="shrink-0 lg:shrink">
              <button
                type="button"
                onClick={() => pick(d)}
                aria-pressed={d.day === selected}
                className={clsx(
                  "w-full rounded-xl px-5 py-3 text-base font-semibold whitespace-nowrap transition-colors",
                  d.day === selected ? "bg-red-strong text-white" : "bg-card text-ink shadow-card hover:bg-surface/60",
                )}
              >
                Day {d.day}
                {d.submitted && <span aria-label=", submitted" className="ml-2 text-xs">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Detail ───────────────────────────────────────────── */}
      <section aria-live="polite" className="min-w-0 rounded-slab bg-[#2a0f0a] p-4 text-paper sm:p-5">
        <div className="rounded-card bg-card p-6 text-ink">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">
            Week {active.week} · {active.weekName}
          </p>
          <p className="display mt-3 text-2xl leading-tight text-balance">{active.title}</p>
          <p className="mt-3 text-sm text-muted">{active.points} pts</p>
        </div>

        <dl className="mt-6 space-y-4 px-2">
          <Fact icon="📅" label="Date" value={formatLong(active.date)} />
          <Fact icon="⏱" label="Estimated time" value={`${active.estimateMinutes} min`} />
          <Fact
            icon="◎"
            label="Status"
            value={active.submitted ? "Submitted" : active.kind === "assessment" ? "Assessment: not yet submitted" : "Not yet submitted"}
          />
        </dl>

        <Link
          href={`/learn/day/${active.day}`}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-card px-6 py-3.5 font-bold text-ink transition-colors hover:bg-white"
        >
          {active.submitted ? "Review this day" : "Start learning"} <span aria-hidden="true">›</span>
        </Link>
      </section>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 text-sm">{icon}</span>
      <div className="min-w-0">
        <dt className="sr-only">{label}</dt>
        <dd className="text-base font-bold">{value}</dd>
        <p className="text-xs text-white/55">{label}</p>
      </div>
    </div>
  );
}
