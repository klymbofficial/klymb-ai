import "server-only";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { unstable_cache } from "next/cache";
import { getAdmin } from "@/lib/admin/auth";
import { parseServiceAccount } from "@/lib/ga-key";

/**
 * Google Analytics figures for the admin dashboard.
 *
 * Needs two environment variables:
 *   GA_PROPERTY_ID          the numeric property id (Admin → Property details)
 *   GA_SERVICE_ACCOUNT_KEY  the service account JSON key, as a single line
 * The service account must be added as a Viewer on the GA property.
 *
 * Every report is cached for five minutes. GA has strict per-property quotas
 * and this page runs ~18 reports per load; without the cache, a few refreshes
 * would exhaust the hourly allowance. The admin check runs before the cache,
 * never inside it, so a cached result can only ever be served to an admin.
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

/** Dimension filters that re-cut every report. Values come from the URL, so they are bounded. */
export interface Filters {
  country?: string;
  device?: string;
  /** One page's path, such as /webinar: only visits that viewed it count. */
  page?: string;
}

export function readFilters(params: { country?: string; device?: string; page?: string }): Filters {
  const clean = (v?: string) => (v && v.length <= 64 && /^[\p{L}\p{N} ().'-]+$/u.test(v) ? v : undefined);
  const path = (v?: string) => (v && v.length <= 200 && /^\/[\w\-./~%]*$/.test(v) ? v : undefined);
  return { country: clean(params.country), device: clean(params.device), page: path(params.page) };
}

export type SparkKey = "totalUsers" | "newUsers" | "activeUsers" | "sessions" | "views";

export interface Kpi {
  label: string;
  value: number;
  /** Percentage change against the preceding window of the same length. */
  delta: number | null;
  hint: string;
  format: "number" | "duration" | "percent";
  /** Lower is better: a rise shows red rather than green. */
  inverse?: boolean;
  /** Which daily series draws this tile's sparkline, if any. */
  spark?: SparkKey;
}

export interface SeriesPoint {
  date: string;
  sessions: number;
  newUsers: number;
  totalUsers: number;
  activeUsers: number;
  views: number;
}

export interface Breakdown {
  label: string;
  value: number;
  secondary?: string;
}

export interface CountryRow {
  country: string;
  users: number;
  sessions: number;
}

export interface PageRow {
  path: string;
  views: number;
  users: number;
  /** Average engaged seconds per active user on this page. */
  engagedSeconds: number;
}

export interface FunnelStep {
  label: string;
  value: number;
}

export interface AnalyticsDashboard {
  configured: boolean;
  error?: string;
  kpis: Kpi[];
  series: SeriesPoint[];
  countries: CountryRow[];
  cities: Breakdown[];
  devices: Breakdown[];
  browsers: Breakdown[];
  os: Breakdown[];
  languages: Breakdown[];
  newVsReturning: Breakdown[];
  channels: Breakdown[];
  sourceMedium: Breakdown[];
  landingPages: Breakdown[];
  pages: PageRow[];
  events: Breakdown[];
  funnel: FunnelStep[];
  /** Klymb's own events, counted by GA in the window. */
  conversions: { registrations: number; daySubmissions: number; knowledgeChecks: number };
  /** Choices for the filter dropdowns, unfiltered so they never empty themselves. */
  options: { countries: string[]; devices: string[]; pages: string[] };
}

const EMPTY: AnalyticsDashboard = {
  configured: false,
  kpis: [],
  series: [],
  countries: [],
  cities: [],
  devices: [],
  browsers: [],
  os: [],
  languages: [],
  newVsReturning: [],
  channels: [],
  sourceMedium: [],
  landingPages: [],
  pages: [],
  events: [],
  funnel: [],
  conversions: { registrations: 0, daySubmissions: 0, knowledgeChecks: 0 },
  options: { countries: [], devices: [], pages: [] },
};

function client() {
  const raw = process.env.GA_SERVICE_ACCOUNT_KEY;
  const propertyId = process.env.GA_PROPERTY_ID;
  if (!raw || !propertyId) return null;

  try {
    const credentials = parseServiceAccount(raw);
    if (!credentials) return null;
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

type StringFilter = { filter: { fieldName: string; stringFilter: { matchType: "EXACT"; value: string } } };

function dimensionFilter(f: Filters) {
  const clauses: StringFilter[] = [];
  if (f.country) clauses.push({ filter: { fieldName: "country", stringFilter: { matchType: "EXACT", value: f.country } } });
  if (f.device) clauses.push({ filter: { fieldName: "deviceCategory", stringFilter: { matchType: "EXACT", value: f.device } } });
  if (f.page) clauses.push({ filter: { fieldName: "pagePath", stringFilter: { matchType: "EXACT", value: f.page } } });
  if (!clauses.length) return undefined;
  return clauses.length === 1 ? clauses[0] : { andGroup: { expressions: clauses } };
}

/** The GA calls themselves, cached per (days, country, device, page). */
const fetchDashboard = unstable_cache(
  async (days: number, country: string, device: string, page: string): Promise<AnalyticsDashboard> => {
    const connection = client();
    if (!connection) return EMPTY;

    const { analytics, property } = connection;
    const filters: Filters = { country: country || undefined, device: device || undefined, page: page || undefined };
    const where = dimensionFilter(filters);
    const scoped = where ? { dimensionFilter: where } : {};

    // Two windows of the same length, so every tile can show a change.
    const current = { startDate: `${days}daysAgo`, endDate: "today" };
    const previous = { startDate: `${days * 2}daysAgo`, endDate: `${days + 1}daysAgo` };

    const summaryMetrics = [
      { name: "totalUsers" },
      { name: "newUsers" },
      { name: "activeUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "averageSessionDuration" },
      { name: "engagementRate" },
      { name: "bounceRate" },
    ];

    const breakdown = (dimension: string, metric: string, limit: number, unfiltered = false) =>
      analytics.runReport({
        property,
        dateRanges: [current],
        dimensions: [{ name: dimension }],
        metrics: [{ name: metric }],
        orderBys: [{ metric: { metricName: metric }, desc: true }],
        limit,
        ...(unfiltered ? {} : scoped),
      });

    try {
      const [
        totals, prior, timeseries, countries, cities, devices, browsers, os, languages, returning,
        channels, sourceMedium, landing, pages, events, eventUsers, countryOptions, deviceOptions, pageOptions,
      ] = await Promise.all([
        analytics.runReport({ property, dateRanges: [current], metrics: summaryMetrics, ...scoped }),
        analytics.runReport({ property, dateRanges: [previous], metrics: summaryMetrics, ...scoped }),
        analytics.runReport({
          property,
          dateRanges: [current],
          dimensions: [{ name: "date" }],
          metrics: [{ name: "sessions" }, { name: "newUsers" }, { name: "totalUsers" }, { name: "activeUsers" }, { name: "screenPageViews" }],
          orderBys: [{ dimension: { dimensionName: "date" } }],
          limit: 400,
          ...scoped,
        }),
        analytics.runReport({
          property,
          dateRanges: [current],
          dimensions: [{ name: "country" }],
          metrics: [{ name: "totalUsers" }, { name: "sessions" }],
          orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
          limit: 15,
          ...scoped,
        }),
        breakdown("city", "sessions", 10),
        breakdown("deviceCategory", "sessions", 5),
        breakdown("browser", "sessions", 8),
        breakdown("operatingSystem", "sessions", 8),
        breakdown("language", "sessions", 8),
        breakdown("newVsReturning", "activeUsers", 3),
        breakdown("sessionDefaultChannelGroup", "sessions", 10),
        breakdown("sessionSourceMedium", "sessions", 10),
        breakdown("landingPage", "sessions", 10),
        analytics.runReport({
          property,
          dateRanges: [current],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }, { name: "userEngagementDuration" }],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 12,
          ...scoped,
        }),
        breakdown("eventName", "eventCount", 15),
        // People, not events, per event: a funnel has to count the same unit at every step.
        breakdown("eventName", "totalUsers", 25),
        breakdown("country", "totalUsers", 50, true),
        breakdown("deviceCategory", "sessions", 5, true),
        breakdown("pagePath", "screenPageViews", 60, true),
      ]);

      type Report = (typeof totals)[0];
      const at = (report: Report, i: number) => num(report.rows?.[0]?.metricValues?.[i]?.value);
      const now = (i: number) => at(totals[0], i);
      const before = (i: number) => at(prior[0], i);

      const kpis: Kpi[] = [
        { label: "Total users", value: now(0), delta: delta(now(0), before(0)), hint: "Distinct people who visited", format: "number", spark: "totalUsers" },
        { label: "New users", value: now(1), delta: delta(now(1), before(1)), hint: "First-time visitors", format: "number", spark: "newUsers" },
        { label: "Active users", value: now(2), delta: delta(now(2), before(2)), hint: "Any interaction in range", format: "number", spark: "activeUsers" },
        { label: "Sessions", value: now(3), delta: delta(now(3), before(3)), hint: "Visit-level count", format: "number", spark: "sessions" },
        { label: "Page views", value: now(4), delta: delta(now(4), before(4)), hint: "Total pages served", format: "number", spark: "views" },
        { label: "Avg. session", value: now(5), delta: delta(now(5), before(5)), hint: "Time on site", format: "duration" },
        { label: "Engagement rate", value: now(6) * 100, delta: delta(now(6), before(6)), hint: "Sessions with meaningful interaction", format: "percent" },
        { label: "Bounce rate", value: now(7) * 100, delta: delta(now(7), before(7)), hint: "Left without engaging", format: "percent", inverse: true },
      ];

      // GA reports an empty value and a literal "(not set)" as separate rows;
      // both read as "(not set)", so rows that land on the same label merge.
      const rows = (report: Report, rename?: (s: string) => string): Breakdown[] => {
        const merged = new Map<string, number>();
        for (const r of report.rows ?? []) {
          const raw = r.dimensionValues?.[0]?.value || "(not set)";
          const label = rename ? rename(raw) : raw;
          merged.set(label, (merged.get(label) ?? 0) + num(r.metricValues?.[0]?.value));
        }
        return [...merged].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
      };

      const eventRows = rows(events[0]);
      const eventCount = (name: string) => eventRows.find((e) => e.label === name)?.value ?? 0;
      const eventPeople = (name: string) => rows(eventUsers[0]).find((e) => e.label === name)?.value ?? 0;

      const conversions = {
        registrations: eventCount("register_submit"),
        daySubmissions: eventCount("day_submit"),
        knowledgeChecks: eventCount("knowledge_check_submit"),
      };

      return {
        configured: true,
        kpis,
        series:
          timeseries[0].rows?.map((r) => {
            const raw = r.dimensionValues?.[0]?.value ?? "";
            const m = r.metricValues ?? [];
            return {
              // GA returns YYYYMMDD.
              date: `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`,
              sessions: num(m[0]?.value),
              newUsers: num(m[1]?.value),
              totalUsers: num(m[2]?.value),
              activeUsers: num(m[3]?.value),
              views: num(m[4]?.value),
            };
          }) ?? [],
        countries:
          countries[0].rows?.map((r) => ({
            country: r.dimensionValues?.[0]?.value || "(not set)",
            users: num(r.metricValues?.[0]?.value),
            sessions: num(r.metricValues?.[1]?.value),
          })) ?? [],
        cities: rows(cities[0]),
        devices: rows(devices[0], (s) => s[0].toUpperCase() + s.slice(1)),
        browsers: rows(browsers[0]),
        os: rows(os[0]),
        languages: rows(languages[0]),
        newVsReturning: rows(returning[0], (s) => (s === "new" ? "New" : s === "returning" ? "Returning" : s)),
        channels: rows(channels[0]),
        sourceMedium: rows(sourceMedium[0]),
        landingPages: rows(landing[0]),
        pages:
          pages[0].rows?.map((r) => {
            const m = r.metricValues ?? [];
            const users = num(m[1]?.value);
            return {
              path: r.dimensionValues?.[0]?.value || "(not set)",
              views: num(m[0]?.value),
              users,
              engagedSeconds: users > 0 ? num(m[2]?.value) / users : 0,
            };
          }) ?? [],
        events: eventRows,
        funnel: [
          // The form lives on the home page, the track pages and /register, so
          // "opened /register" undercounts; GA's own form_start sees them all.
          { label: "Visited the site", value: now(0) },
          { label: "Started the form", value: eventPeople("form_start") },
          { label: "Submitted registration", value: eventPeople("register_submit") },
          { label: "Submitted a day", value: eventPeople("day_submit") },
        ],
        conversions,
        options: {
          countries: rows(countryOptions[0]).map((r) => r.label).filter((c) => c !== "(not set)"),
          devices: rows(deviceOptions[0]).map((r) => r.label),
          pages: rows(pageOptions[0]).map((r) => r.label).filter((p) => p.startsWith("/")),
        },
      };
    } catch (error) {
      console.error("analytics query failed:", error);
      return {
        ...EMPTY,
        configured: true,
        error: "Analytics is configured but the query failed. Check that the service account is a Viewer on the property.",
      };
    }
  },
  ["ga-dashboard-v8"],
  { revalidate: 300 },
);

export async function getAnalyticsDashboard(days = 30, filters: Filters = {}): Promise<AnalyticsDashboard> {
  if (!(await getAdmin())) return EMPTY;
  return fetchDashboard(days, filters.country ?? "", filters.device ?? "", filters.page ?? "");
}

/**
 * Visitors on the site right now (GA's realtime window is the last 30
 * minutes). Cached for a minute: realtime has its own, tighter quota.
 */
const fetchRealtime = unstable_cache(
  async (): Promise<{ active: number; byCountry: Breakdown[] } | null> => {
    const connection = client();
    if (!connection) return null;
    try {
      const [report] = await connection.analytics.runRealtimeReport({
        property: connection.property,
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }],
        limit: 5,
      });
      const byCountry =
        report.rows?.map((r) => ({ label: r.dimensionValues?.[0]?.value || "(not set)", value: num(r.metricValues?.[0]?.value) })) ?? [];
      return { active: byCountry.reduce((s, r) => s + r.value, 0), byCountry };
    } catch (error) {
      console.error("realtime query failed:", error);
      return null;
    }
  },
  ["ga-realtime-v3"],
  { revalidate: 60 },
);

export async function getRealtime() {
  if (!(await getAdmin())) return null;
  return fetchRealtime();
}

export interface MarketingReport {
  configured: boolean;
  /** Distinct people at each step of the $1 webinar sign-up. */
  webinarFunnel: Breakdown[];
  paidByCountry: Breakdown[];
  checkoutFails: Breakdown[];
  /** Taps by what was tapped. Null until link_label is registered as a custom dimension in GA. */
  clicks: Breakdown[] | null;
  clickTypes: Breakdown[] | null;
  clicksByPage: Breakdown[];
  campaigns: { label: string; sessions: number; paid: number }[];
  sources: { label: string; sessions: number; paid: number }[];
}

const NO_MARKETING: MarketingReport = {
  configured: false, webinarFunnel: [], paidByCountry: [], checkoutFails: [], clicks: null, clickTypes: null, clicksByPage: [], campaigns: [], sources: [],
};

type EventFilter = { filter: { fieldName: string; stringFilter: { matchType: "EXACT"; value: string } } };
const eventIs = (name: string): EventFilter => ({ filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: name } } });

/** Clicks, the webinar funnel and campaigns, for the Conversions tab. Each query stands alone, so one failing never blanks the rest. */
const fetchMarketing = unstable_cache(
  async (days: number, country: string, device: string): Promise<MarketingReport> => {
    const connection = client();
    if (!connection) return NO_MARKETING;
    const { analytics, property } = connection;
    const range = [{ startDate: `${days}daysAgo`, endDate: "today" }];
    const scope = dimensionFilter({ country: country || undefined, device: device || undefined });
    const and = (...f: (object | undefined)[]) => {
      const all = f.filter(Boolean) as object[];
      return all.length === 1 ? all[0] : { andGroup: { expressions: all } };
    };
    const report = (dimension: string, metric: string, limit: number, filter?: object) =>
      analytics.runReport({
        property, dateRanges: range,
        dimensions: [{ name: dimension }], metrics: [{ name: metric }],
        orderBys: [{ metric: { metricName: metric }, desc: true }], limit,
        ...(filter || scope ? { dimensionFilter: and(filter, scope) } : {}),
      }).then(([r]) => (r.rows ?? []).map((row) => ({ label: row.dimensionValues?.[0]?.value || "(not set)", value: num(row.metricValues?.[0]?.value) })));

    const steps = ["webinar_form_start", "webinar_register_submit", "webinar_checkout_open", "webinar_paid"];
    const settled = await Promise.allSettled([
      report("pagePath", "totalUsers", 5, { filter: { fieldName: "pagePath", stringFilter: { matchType: "EXACT", value: "/webinar" } } }),
      report("eventName", "totalUsers", 10, { orGroup: { expressions: steps.map(eventIs) } }),
      report("country", "eventCount", 10, eventIs("webinar_paid")),
      report("customEvent:reason", "eventCount", 6, eventIs("webinar_checkout_fail")),
      report("customEvent:link_label", "eventCount", 20, eventIs("ui_click")),
      report("customEvent:link_type", "eventCount", 8, eventIs("ui_click")),
      report("pagePath", "eventCount", 10, eventIs("ui_click")),
      report("sessionCampaignName", "sessions", 12),
      report("sessionCampaignName", "eventCount", 50, eventIs("webinar_paid")),
      report("sessionSourceMedium", "sessions", 12),
      report("sessionSourceMedium", "eventCount", 50, eventIs("webinar_paid")),
    ]);
    const got = (i: number) => (settled[i].status === "fulfilled" ? (settled[i] as PromiseFulfilledResult<Breakdown[]>).value : null);
    for (const s of settled) if (s.status === "rejected") console.error("marketing query failed:", String(s.reason).slice(0, 200));

    const people = got(1) ?? [];
    const of = (name: string) => people.find((r) => r.label === name)?.value ?? 0;
    const join = (sessions: Breakdown[] | null, paid: Breakdown[] | null) =>
      (sessions ?? []).map((s) => ({ label: s.label, sessions: s.value, paid: paid?.find((p) => p.label === s.label)?.value ?? 0 }));

    return {
      configured: true,
      webinarFunnel: [
        { label: "Opened /webinar", value: got(0)?.[0]?.value ?? 0 },
        { label: "Started the form", value: of("webinar_form_start") },
        { label: "Submitted the form", value: of("webinar_register_submit") },
        { label: "Opened payment", value: of("webinar_checkout_open") },
        { label: "Paid $1", value: of("webinar_paid") },
      ],
      paidByCountry: got(2) ?? [],
      checkoutFails: (got(3) ?? []).map((r) => ({ ...r, label: ({ closed: "Closed the payment window", card_failed: "Card declined, then closed", verify: "Paid but not confirmed", script: "Payment window didn't load" } as Record<string, string>)[r.label] ?? r.label })),
      clicks: got(4),
      clickTypes: got(5),
      clicksByPage: got(6) ?? [],
      campaigns: join(got(7), got(8)),
      sources: join(got(9), got(10)),
    };
  },
  ["ga-marketing-v1"],
  { revalidate: 300 },
);

export async function getMarketingReport(days = 30, filters: Filters = {}): Promise<MarketingReport> {
  if (!(await getAdmin())) return NO_MARKETING;
  return fetchMarketing(days, filters.country ?? "", filters.device ?? "");
}
