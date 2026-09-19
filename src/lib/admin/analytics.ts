import "server-only";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { getAdmin } from "@/lib/admin/auth";

/**
 * Google Analytics figures for the admin dashboard.
 *
 * Needs two environment variables:
 *   GA_PROPERTY_ID          the numeric property id (Admin → Property details)
 *   GA_SERVICE_ACCOUNT_KEY  the service account JSON key, as a single line
 * The service account must be added as a Viewer on the GA property.
 */

export type RangeKey = "7d" | "30d" | "90d" | "365d";

export const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "365d", label: "1 year", days: 365 },
];

export function rangeDays(key: string | undefined): number {
  return RANGES.find((r) => r.key === key)?.days ?? 30;
}

export interface Kpi {
  label: string;
  value: number;
  /** Percentage change against the preceding window of the same length. */
  delta: number | null;
  hint: string;
  format: "number" | "duration" | "percent";
  /** Lower is better — a rise shows red rather than green. */
  inverse?: boolean;
}

export interface SeriesPoint {
  date: string;
  sessions: number;
  newUsers: number;
}

export interface Breakdown {
  label: string;
  value: number;
  secondary?: string;
}

export interface AnalyticsDashboard {
  configured: boolean;
  error?: string;
  kpis: Kpi[];
  series: SeriesPoint[];
  channels: Breakdown[];
  pages: Breakdown[];
  devices: Breakdown[];
  countries: Breakdown[];
}

const EMPTY: AnalyticsDashboard = {
  configured: false,
  kpis: [],
  series: [],
  channels: [],
  pages: [],
  devices: [],
  countries: [],
};

function client() {
  const raw = process.env.GA_SERVICE_ACCOUNT_KEY;
  const propertyId = process.env.GA_PROPERTY_ID;
  if (!raw || !propertyId) return null;

  try {
    const credentials = JSON.parse(raw) as { client_email: string; private_key: string };
    return {
      analytics: new BetaAnalyticsDataClient({
        credentials: {
          client_email: credentials.client_email,
          // Keys pasted into env vars usually arrive with escaped newlines.
          private_key: credentials.private_key.replace(/\\n/g, "\n"),
        },
      }),
      property: `properties/${propertyId}`,
    };
  } catch {
    return null;
  }
}

const num = (v?: string | null) => Number(v ?? 0);
const delta = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : null);

export async function getAnalyticsDashboard(days = 30): Promise<AnalyticsDashboard> {
  if (!(await getAdmin())) return EMPTY;

  const connection = client();
  if (!connection) return EMPTY;

  const { analytics, property } = connection;
  // Two windows of the same length, so every tile can show a change.
  const current = { startDate: `${days}daysAgo`, endDate: "today" };
  const previous = { startDate: `${days * 2}daysAgo`, endDate: `${days + 1}daysAgo` };

  const metrics = [
    { name: "totalUsers" },
    { name: "newUsers" },
    { name: "activeUsers" },
    { name: "sessions" },
    { name: "screenPageViews" },
    { name: "averageSessionDuration" },
    { name: "engagementRate" },
    { name: "bounceRate" },
  ];

  const breakdown = (dimension: string, metric: string, limit: number) =>
    analytics.runReport({
      property,
      dateRanges: [current],
      dimensions: [{ name: dimension }],
      metrics: [{ name: metric }],
      orderBys: [{ metric: { metricName: metric }, desc: true }],
      limit,
    });

  try {
    const [totals, prior, timeseries, channels, pages, devices, countries] = await Promise.all([
      analytics.runReport({ property, dateRanges: [current], metrics }),
      analytics.runReport({ property, dateRanges: [previous], metrics }),
      analytics.runReport({
        property,
        dateRanges: [current],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }, { name: "newUsers" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
        limit: 400,
      }),
      breakdown("sessionDefaultChannelGroup", "sessions", 8),
      breakdown("pagePath", "screenPageViews", 10),
      breakdown("deviceCategory", "sessions", 5),
      breakdown("country", "activeUsers", 8),
    ]);

    const at = (report: (typeof totals)[0], i: number) => num(report.rows?.[0]?.metricValues?.[i]?.value);
    const now = (i: number) => at(totals[0], i);
    const before = (i: number) => at(prior[0], i);

    const kpis: Kpi[] = [
      { label: "Total users", value: now(0), delta: delta(now(0), before(0)), hint: "Distinct people who visited", format: "number" },
      { label: "New users", value: now(1), delta: delta(now(1), before(1)), hint: "First-time visitors", format: "number" },
      { label: "Active users", value: now(2), delta: delta(now(2), before(2)), hint: "Any interaction in range", format: "number" },
      { label: "Sessions", value: now(3), delta: delta(now(3), before(3)), hint: "Visit-level count", format: "number" },
      { label: "Page views", value: now(4), delta: delta(now(4), before(4)), hint: "Total pages served", format: "number" },
      { label: "Avg. session", value: now(5), delta: delta(now(5), before(5)), hint: "Time on site", format: "duration" },
      { label: "Engagement rate", value: now(6) * 100, delta: delta(now(6), before(6)), hint: "Sessions with meaningful interaction", format: "percent" },
      { label: "Bounce rate", value: now(7) * 100, delta: delta(now(7), before(7)), hint: "Left without engaging", format: "percent", inverse: true },
    ];

    const rows = (report: (typeof totals)[0], secondary?: (n: number) => string): Breakdown[] =>
      report.rows?.map((r) => {
        const value = num(r.metricValues?.[0]?.value);
        return {
          label: r.dimensionValues?.[0]?.value ?? "—",
          value,
          secondary: secondary?.(value),
        };
      }) ?? [];

    return {
      configured: true,
      kpis,
      series:
        timeseries[0].rows?.map((r) => {
          const raw = r.dimensionValues?.[0]?.value ?? "";
          return {
            // GA returns YYYYMMDD.
            date: `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`,
            sessions: num(r.metricValues?.[0]?.value),
            newUsers: num(r.metricValues?.[1]?.value),
          };
        }) ?? [],
      channels: rows(channels[0]),
      pages: rows(pages[0]),
      devices: rows(devices[0]),
      countries: rows(countries[0]),
    };
  } catch (error) {
    console.error("analytics query failed:", error);
    return {
      ...EMPTY,
      configured: true,
      error: "Analytics is configured but the query failed. Check that the service account is a Viewer on the property.",
    };
  }
}
