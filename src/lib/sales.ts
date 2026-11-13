/**
 * Sales rules, kept free of the database and of Next so they can be tested:
 * the stages and sources on the board, phone clean-up, the CSV import parser
 * and the month-to-date maths behind the report.
 */

export const STAGES = [
  { key: "new", label: "New", hint: "Not spoken to yet" },
  { key: "warm", label: "Warm", hint: "Replied, curious" },
  { key: "potential", label: "Potential convert", hint: "Has a real need" },
  { key: "positive", label: "Positive", hint: "Wants to join" },
  { key: "almost", label: "Almost won", hint: "Payment or approval pending" },
  { key: "signed", label: "Signed", hint: "Paid or contract signed" },
  { key: "rejected", label: "Rejected", hint: "Said no" },
] as const;
export type Stage = (typeof STAGES)[number]["key"];

/** Stages that count as "potential conversions" on the report. */
/**
 * Paid enrolments on the report count from here: 13 Nov 2026, 13:30 IST, when
 * the sales team started. Earlier payments stay in Payments, and a lead who
 * paid before still shows as paid; they just don't count towards targets.
 */
export const PAID_COUNTED_FROM = "2026-11-13T08:00:00.000Z";

/** After a touch with no date set, the next follow-up lands this many days out. */
export const AUTO_FOLLOW_UP_DAYS = 2;

/** Call outcomes, one tap each, the way dialler CRMs log a call. */
export const CALL_OUTCOMES = [
  { key: "talked", label: "Talked", replied: true, followDays: null, stage: null },
  { key: "no_answer", label: "No answer", replied: false, followDays: 1, stage: null },
  { key: "busy", label: "Busy", replied: false, followDays: 1, stage: null },
  { key: "call_back", label: "Call back", replied: true, followDays: 1, stage: null },
  { key: "not_interested", label: "Not interested", replied: true, followDays: null, stage: "rejected" },
  { key: "wrong_number", label: "Wrong number", replied: false, followDays: null, stage: "rejected" },
] as const;

/** YYYY-MM-DD, n days after an IST date. */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The by_email on touches the WhatsApp dashboard sync writes. */
export const WHATSAPP_BY = "whatsapp-dashboard";

export const HOT_STAGES: readonly Stage[] = ["potential", "positive", "almost"];

export const SOURCES = [
  { key: "socials", label: "Socials" },
  { key: "bought", label: "Bought data" },
  { key: "referral", label: "Referral" },
  { key: "hackathon", label: "Hackathon" },
  { key: "webinar", label: "Webinar" },
  { key: "college", label: "College connect" },
  { key: "b2b", label: "B2B" },
  { key: "website", label: "Website form" },
  { key: "other", label: "Other" },
] as const;
export type Source = (typeof SOURCES)[number]["key"];

export const CHANNELS = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "call", label: "Call" },
  { key: "email", label: "Email" },
  { key: "dm", label: "DM" },
  { key: "comment", label: "Comment" },
  { key: "meeting", label: "Meeting" },
] as const;
export type Channel = (typeof CHANNELS)[number]["key"];

const has = <T extends { key: string }>(list: readonly T[], v: unknown): v is T["key"] =>
  typeof v === "string" && list.some((x) => x.key === v);
export const isStage = (v: unknown): v is Stage => has(STAGES, v);
export const isSource = (v: unknown): v is Source => has(SOURCES, v);
export const isChannel = (v: unknown): v is Channel => has(CHANNELS, v);

export const labelOf = (list: readonly { key: string; label: string }[], key: string) =>
  list.find((x) => x.key === key)?.label ?? key;

/**
 * Digits with country code (919876543210), or null when it can't be a phone.
 * A bare 10-digit number, or one with a leading 0, is taken as Indian.
 */
export function normalisePhone(input: unknown): string | null {
  if (typeof input !== "string" && typeof input !== "number") return null;
  let digits = String(input).replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

/** +91 98765 43210 for display. */
export function formatPhone(phone: string | null): string {
  if (!phone) return "—";
  if (phone.length === 12 && phone.startsWith("91")) return `+91 ${phone.slice(2, 7)} ${phone.slice(7)}`;
  return `+${phone}`;
}

// ── CSV import ──────────────────────────────────────────────

/**
 * RFC 4180-ish: quoted fields, doubled quotes, commas and newlines inside
 * quotes. Rows copied out of Google Sheets arrive tab-separated, so a first
 * line with more tabs than commas is read as TSV.
 */
export function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/\t/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i += 1;
      row.push(field); field = "";
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  return rows;
}

const HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "full name", "student name", "contact", "contact name"],
  phone: ["phone", "mobile", "number", "phone number", "mobile number", "whatsapp", "contact number"],
  email: ["email", "email address", "mail", "e-mail"],
  source: ["source", "lead source", "channel"],
  source_detail: ["source detail", "detail", "campaign", "event", "list"],
  org: ["org", "college", "company", "organisation", "organization", "institute"],
  stage: ["stage", "status"],
  notes: ["notes", "note", "remarks", "comment", "comments"],
};

export interface ImportRow {
  name: string;
  phone: string | null;
  email: string | null;
  source: Source;
  source_detail: string | null;
  org: string | null;
  stage: Stage;
  notes: string | null;
}

export interface ImportParse {
  rows: ImportRow[];
  /** 1-based line numbers with why each was skipped. */
  skipped: { line: number; reason: string }[];
  missingHeaders: string[];
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clip = (v: string | undefined, max: number) => (v?.trim() ? v.trim().slice(0, max) : null);

/** Reads a sheet export. Needs a name column and a phone or email column. */
export function parseLeadsCsv(text: string, defaultSource: Source, maxRows = 2000): ImportParse {
  let table = parseCsv(text);
  let header = (table[0] ?? []).map((h) => h.trim().toLowerCase());
  // Rows pasted without their header: read them as name, phone, note.
  const known = Object.values(HEADER_ALIASES).flat();
  if (!header.some((h) => known.includes(h)) && table[0] && normalisePhone(table[0][1] ?? "")) {
    header = ["name", "phone", "notes"];
    table = [header, ...table];
  }
  const col: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const i = header.findIndex((h) => aliases.includes(h));
    if (i !== -1) col[field] = i;
  }
  const missingHeaders: string[] = [];
  if (col.name === undefined) missingHeaders.push("name");
  if (col.phone === undefined && col.email === undefined) missingHeaders.push("phone or email");
  if (missingHeaders.length) return { rows: [], skipped: [], missingHeaders };

  const rows: ImportRow[] = [];
  const skipped: ImportParse["skipped"] = [];
  const seen = new Set<string>();
  table.slice(1).forEach((cells, idx) => {
    const line = idx + 2;
    if (rows.length >= maxRows) { skipped.push({ line, reason: `over the ${maxRows}-row limit` }); return; }
    const get = (f: string) => (col[f] === undefined ? undefined : cells[col[f]]);
    const name = clip(get("name"), 120);
    const phone = normalisePhone(get("phone") ?? "");
    const rawEmail = get("email")?.trim().toLowerCase();
    const email = rawEmail && EMAIL_SHAPE.test(rawEmail) ? rawEmail.slice(0, 254) : null;
    if (!name) { skipped.push({ line, reason: "no name" }); return; }
    if (!phone && !email) { skipped.push({ line, reason: "no usable phone or email" }); return; }
    const key = phone ?? email!;
    if (seen.has(key) || (email && seen.has(email))) { skipped.push({ line, reason: "duplicate in this file" }); return; }
    seen.add(key);
    if (email) seen.add(email);
    const rawSource = get("source")?.trim().toLowerCase();
    const rawStage = get("stage")?.trim().toLowerCase();
    rows.push({
      name,
      phone,
      email,
      source: isSource(rawSource) ? rawSource : (SOURCES.find((s) => s.label.toLowerCase() === rawSource)?.key ?? defaultSource),
      source_detail: clip(get("source_detail"), 120),
      org: clip(get("org"), 120),
      stage: isStage(rawStage) ? rawStage : (STAGES.find((s) => s.label.toLowerCase() === rawStage)?.key ?? "new"),
      notes: clip(get("notes"), 2000),
    });
  });
  return { rows, skipped, missingHeaders };
}

// ── Periods (India time) ────────────────────────────────────

const IST = 5.5 * 3600_000;

/** Midnight IST on the given IST calendar date, as a real instant. */
function istMidnight(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d) - IST);
}

export type PeriodKey = "mtd" | "ytd";

export interface Period {
  key: PeriodKey;
  label: string;
  start: Date;
  end: Date;
  /** The same stretch one month (MTD) or one financial year (YTD) earlier. */
  prevStart: Date;
  prevEnd: Date;
  /** For MTD: first of the month as YYYY-MM-DD, for the target lookup. */
  month: string;
  dayOfMonth: number;
  daysInMonth: number;
}

/**
 * MTD runs from the 1st of this month (IST) to now. YTD is the Indian
 * financial year, from 1 April. The comparison is the same number of days
 * one period earlier, so a half-month is never compared with a whole one.
 */
export function period(key: PeriodKey, now: Date = new Date()): Period {
  const local = new Date(now.getTime() + IST);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const dayOfMonth = local.getUTCDate();
  const month = `${y}-${String(m + 1).padStart(2, "0")}-01`;

  if (key === "mtd") {
    const start = istMidnight(y, m, 1);
    const prevStart = istMidnight(y, m - 1, 1);
    const prevMonthDays = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const elapsed = now.getTime() - start.getTime();
    const prevEnd = new Date(Math.min(prevStart.getTime() + elapsed, istMidnight(y, m - 1, prevMonthDays + 1).getTime()));
    const label = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m, 1)));
    return { key, label, start, end: now, prevStart, prevEnd, month, dayOfMonth, daysInMonth };
  }

  const fyYear = m >= 3 ? y : y - 1;
  const start = istMidnight(fyYear, 3, 1);
  const prevStart = istMidnight(fyYear - 1, 3, 1);
  const prevEnd = new Date(prevStart.getTime() + (now.getTime() - start.getTime()));
  const label = `FY ${fyYear}–${String((fyYear + 1) % 100).padStart(2, "0")}`;
  return { key, label, start, end: now, prevStart, prevEnd, month, dayOfMonth, daysInMonth };
}

/**
 * Where a monthly target says you should be by today, and whether you are
 * on pace. Expected is linear through the month.
 */
export function pace(actual: number, target: number, dayOfMonth: number, daysInMonth: number) {
  const expected = Math.round((target * dayOfMonth) / daysInMonth);
  const remainingDays = Math.max(1, daysInMonth - dayOfMonth + 1);
  const needPerDay = Math.max(0, Math.ceil((target - actual) / remainingDays));
  return { expected, onPace: actual >= expected, needPerDay };
}

/** Today's date in IST, YYYY-MM-DD. */
export function istToday(now: Date = new Date()): string {
  return new Date(now.getTime() + IST).toISOString().slice(0, 10);
}
