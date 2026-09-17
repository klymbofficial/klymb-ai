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
export interface AnalyticsRow {
  label: string;
  value: number;
  secondary?: string;
}

export interface AnalyticsSummary {
  configured: boolean;
  error?: string;
  activeUsers: number;
  sessions: number;
  pageViews: number;
  topPages: AnalyticsRow[];
  sources: AnalyticsRow[];
  registrations: number;
}

const EMPTY: AnalyticsSummary = {
  configured: false,
  activeUsers: 0,
  sessions: 0,
  pageViews: 0,
  topPages: [],
  sources: [],
  registrations: 0,
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

/** `days` is a lookback window, e.g. 28 for the last four weeks. */
export async function getAnalytics(days = 28): Promise<AnalyticsSummary> {
  if (!(await getAdmin())) return EMPTY;

  const connection = client();
  if (!connection) return EMPTY;

  const { analytics, property } = connection;
  const dateRanges = [{ startDate: `${days}daysAgo`, endDate: "today" }];

  try {
    const [totals, pages, sources] = await Promise.all([
      analytics.runReport({
        property,
        dateRanges,
        metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
      }),
      analytics.runReport({
        property,
        dateRanges,
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 10,
      }),
      analytics.runReport({
        property,
        dateRanges,
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 8,
      }),
    ]);

    const metric = (report: (typeof totals)[0], i: number) =>
      Number(report.rows?.[0]?.metricValues?.[i]?.value ?? 0);

    return {
      configured: true,
      activeUsers: metric(totals[0], 0),
      sessions: metric(totals[0], 1),
      pageViews: metric(totals[0], 2),
      topPages:
        pages[0].rows?.map((r) => ({
          label: r.dimensionValues?.[0]?.value ?? "—",
          value: Number(r.metricValues?.[0]?.value ?? 0),
          secondary: `${Number(r.metricValues?.[1]?.value ?? 0)} people`,
        })) ?? [],
      sources:
        sources[0].rows?.map((r) => ({
          label: r.dimensionValues?.[0]?.value ?? "—",
          value: Number(r.metricValues?.[0]?.value ?? 0),
        })) ?? [],
      registrations: 0,
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
