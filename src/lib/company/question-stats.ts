/**
 * A question's track record (P0.6, Library drawer → Analytics), from this
 * company's own submitted attempts only: how often the question was
 * answered, how often in full, the average score, and use by month. Rates
 * show only from STATS_MIN attempts, so a handful of people can't be read
 * individually. Marks are the automatic ones frozen at Submit. Pure; the
 * query is questionStatsRows in question-stats-data.ts.
 */
export const STATS_MIN = 10;

export interface StatsRow { month: string; points: number; max: number }

export interface QuestionStats {
  attempts: number;
  /** Null below STATS_MIN. */
  fullRate: number | null;
  averageRate: number | null;
  /** The last 12 months, oldest first: "2026-11" and a count. */
  months: { month: string; count: number }[];
}

const ym = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

export function questionStats(rows: readonly StatsRow[], now = new Date()): QuestionStats {
  const attempts = rows.length;
  const enough = attempts >= STATS_MIN;
  const full = rows.filter((r) => r.max > 0 && r.points >= r.max).length;
  const avg = attempts ? rows.reduce((n, r) => n + (r.max > 0 ? r.points / r.max : 0), 0) / attempts : 0;
  const months: { month: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({ month: ym(d), count: 0 });
  }
  for (const r of rows) {
    const m = months.find((x) => x.month === r.month.slice(0, 7));
    if (m) m.count += 1;
  }
  return { attempts, fullRate: enough ? Math.round((100 * full) / attempts) : null, averageRate: enough ? Math.round(100 * avg) : null, months };
}
