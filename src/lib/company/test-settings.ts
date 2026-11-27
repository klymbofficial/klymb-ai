/**
 * A company's settings for one test (U06a, U06_PROPOSAL.txt): access, an
 * end date, tags, the automatic reminder, and the invitation's own words.
 * They belong to the company and the test, never to a version, so a company
 * can tune a Klymb test without changing it for anyone else. Pure, so it can
 * be tested; the database side is src/lib/company/test-settings-data.ts.
 */
import { zonedToUtc } from "@/lib/company/batch-rules";

export interface InviteTemplate {
  subject: string;
  body: string;
}

export interface TestSettings {
  accessOpen: boolean;
  /** ISO; nobody starts after it. */
  endsOn: string | null;
  tags: string[];
  autoRemind: boolean;
  /** Null: the standard invitation. */
  invite: InviteTemplate | null;
  /** U06b: a whole percent, or null for no cut-off. */
  cutoffPercent: number | null;
  /** U06b: details asked before Start. */
  collect: DetailField[];
  /** Proctoring (0070): what the test window enforces; limit = warnings before automatic submission, or null. */
  proctor: Proctoring;
  /** 0 until the first save. */
  revision: number;
  updatedBy: string | null;
  updatedAt: string | null;
}

export const DEFAULT_SETTINGS: TestSettings = {
  accessOpen: true, endsOn: null, tags: [], autoRemind: true, invite: null, cutoffPercent: null, collect: [],
  proctor: { fullscreen: false, tabs: false, copy: false, webcam: false, limit: null, shuffle: false, watermark: false, integrity: false },
  revision: 0, updatedBy: null, updatedAt: null,
};

export const SETTINGS_LIMITS = { tags: 10, tag: 40, subject: 160, body: 3000 } as const;

/** What a template may say; each is filled in per person when the email goes. */
export const TEMPLATE_VARS = {
  candidate_name: "The person's name",
  test_name: "The test's name",
  company: "Your company's name",
  start_by: "Their last moment to start",
  time_allowed: "How long they have once they start",
} as const;
export type TemplateVar = keyof typeof TEMPLATE_VARS;

type Result<T> = { ok: true; value: T } | { ok: false; message: string };

const text = (v: unknown) => (typeof v === "string" ? v.replace(/\r\n?/g, "\n").trim() : "");
const line = (v: unknown) => text(v).replace(/\s+/g, " ");
const on = (v: unknown) => v === true || v === "on" || v === "true";

/** Access, end date (typed in `timeZone`) and tags, as a person sets them. */
export function readBasic(raw: Record<string, unknown>, timeZone: string, now = new Date()): Result<Pick<TestSettings, "accessOpen" | "endsOn" | "tags">> {
  let endsOn: string | null = null;
  const typed = text(raw.endsOn);
  if (typed) {
    const at = zonedToUtc(typed, timeZone);
    if (!at) return { ok: false, message: "Enter the end date and time in full." };
    if (at.getTime() <= now.getTime()) return { ok: false, message: "Choose an end date in the future, or leave it empty." };
    endsOn = at.toISOString();
  }
  const parts = Array.isArray(raw.tags) ? raw.tags : typeof raw.tags === "string" ? raw.tags.split(",") : [];
  const tags: string[] = [];
  for (const p of parts) {
    const t = line(p);
    if (!t) continue;
    if (t.length > SETTINGS_LIMITS.tag) return { ok: false, message: `Keep each tag under ${SETTINGS_LIMITS.tag} characters.` };
    if (!tags.some((x) => x.toLowerCase() === t.toLowerCase())) tags.push(t);
  }
  if (tags.length > SETTINGS_LIMITS.tags) return { ok: false, message: `Use at most ${SETTINGS_LIMITS.tags} tags.` };
  return { ok: true, value: { accessOpen: on(raw.accessOpen), endsOn, tags } };
}

const VAR = /\{\{\s*([a-z_]+)\s*\}\}/g;

/** The {{names}} a text uses that aren't variables. */
export function unknownVars(s: string): string[] {
  return [...new Set([...s.matchAll(VAR)].map((m) => m[1]).filter((n) => !(n in TEMPLATE_VARS)))];
}

/** The reminder switch and the invitation's words. Both template fields empty: the standard email. */
export function readEmail(raw: Record<string, unknown>): Result<Pick<TestSettings, "autoRemind" | "invite">> {
  const subject = line(raw.inviteSubject);
  const body = text(raw.inviteBody);
  const autoRemind = on(raw.autoRemind);
  if (!subject && !body) return { ok: true, value: { autoRemind, invite: null } };
  if (!subject) return { ok: false, message: "Add a subject, or clear the message to use the standard email." };
  if (!body) return { ok: false, message: "Add the message, or clear the subject to use the standard email." };
  if (subject.length > SETTINGS_LIMITS.subject) return { ok: false, message: `Keep the subject under ${SETTINGS_LIMITS.subject} characters.` };
  if (body.length > SETTINGS_LIMITS.body) return { ok: false, message: `Keep the message under ${SETTINGS_LIMITS.body} characters.` };
  const bad = unknownVars(`${subject}\n${body}`);
  if (bad.length) return { ok: false, message: `{{${bad[0]}}} isn't a variable. Use ${Object.keys(TEMPLATE_VARS).map((v) => `{{${v}}}`).join(", ")}.` };
  return { ok: true, value: { autoRemind, invite: { subject, body } } };
}

/** The text with each variable filled in. Anything else in braces is left as typed. */
export function renderTemplate(s: string, vars: Record<TemplateVar, string>): string {
  return s.replace(VAR, (whole, name: string) => (name in vars ? vars[name as TemplateVar] : whole));
}

/** Why nobody may start this test now, or null. An attempt already running is never stopped. */
export function startBlocked(s: Pick<TestSettings, "accessOpen" | "endsOn">, now = new Date()): "closed" | "ended" | null {
  if (!s.accessOpen) return "closed";
  if (s.endsOn && new Date(s.endsOn).getTime() <= now.getTime()) return "ended";
  return null;
}

/** Why a new round can't be made or sent for this test, or null. */
export function roundBlocked(s: Pick<TestSettings, "accessOpen" | "endsOn">, closesAt: Date | string, now = new Date()): string | null {
  const why = startBlocked(s, now);
  if (why === "closed") return "This test's access is off in its settings, so nobody can be invited or start. Turn it on to invite people.";
  if (why === "ended") return "This test has ended (see its settings), so nobody can be invited or start.";
  if (s.endsOn && new Date(closesAt).getTime() > new Date(s.endsOn).getTime()) {
    return "This round closes after the test ends. Close it by the test's end date, or move the end date in the test's settings.";
  }
  return null;
}

// ── U06b: cut-off and the details asked before Start ─────────────────────

/** Details a company may ask for before Start (name and email are always known). */
export const DETAIL_FIELDS = {
  phone: { label: "Phone number", max: 20, kind: "phone" },
  linkedin: { label: "LinkedIn profile", max: 200, kind: "url" },
  experience: { label: "Years of experience", max: 4, kind: "years" },
  company: { label: "Current company", max: 120, kind: "text" },
  notice: { label: "Notice period", max: 60, kind: "text" },
  college: { label: "College or university", max: 160, kind: "text" },
  graduation: { label: "Graduation year", max: 4, kind: "year" },
} as const;
export type DetailField = keyof typeof DETAIL_FIELDS;
export const DETAIL_KEYS = Object.keys(DETAIL_FIELDS) as DetailField[];

/** The cut-off (a whole percent, or none) and which details to ask, as a person sets them. */
export function readCandidate(raw: Record<string, unknown>): Result<{ cutoffPercent: number | null; collect: DetailField[] }> {
  const typed = text(raw.cutoffPercent);
  let cutoffPercent: number | null = null;
  if (typed) {
    const n = Number(typed);
    if (!Number.isInteger(n) || n < 0 || n > 100) return { ok: false, message: "The cut-off is a whole percent from 0 to 100, or empty for none." };
    cutoffPercent = n;
  }
  const asked = Array.isArray(raw.collect) ? raw.collect : [];
  const collect = DETAIL_KEYS.filter((k) => asked.includes(k));
  return { ok: true, value: { cutoffPercent, collect } };
}

/**
 * What a candidate typed for the asked details, checked: every asked field
 * filled, each within its limit and shape. Unasked fields are dropped.
 */
export function readDetails(raw: Record<string, unknown>, collect: readonly DetailField[], now = new Date()): Result<Partial<Record<DetailField, string>>> {
  const out: Partial<Record<DetailField, string>> = {};
  for (const k of collect) {
    const f = DETAIL_FIELDS[k];
    const v = line(raw[k]);
    if (!v) return { ok: false, message: `Fill in ${f.label.toLowerCase()}.` };
    if (v.length > f.max) return { ok: false, message: `${f.label}: keep it under ${f.max} characters.` };
    if (f.kind === "phone" && !/^\+?[0-9][0-9 -]{5,18}$/.test(v)) return { ok: false, message: "Enter a phone number with digits only, and a + for the country code if you like." };
    if (f.kind === "url" && !/^(https?:\/\/)?([a-z]{2,3}\.)?linkedin\.com\/\S+$/i.test(v)) return { ok: false, message: "Enter your LinkedIn profile link (linkedin.com/in/…)." };
    if (f.kind === "years" && !(/^\d{1,2}(\.\d)?$/.test(v) && Number(v) <= 60)) return { ok: false, message: "Years of experience is a number, like 3 or 4.5." };
    if (f.kind === "year") {
      const y = Number(v);
      if (!/^\d{4}$/.test(v) || y < 1960 || y > now.getUTCFullYear() + 6) return { ok: false, message: "Enter your graduation year, like 2024." };
    }
    out[k] = v;
  }
  return { ok: true, value: out };
}

/** A reviewed score against the cut-off; null when there is none. */
export function cutoffResult(total: number, max: number, cutoffPercent: number | null): "cleared" | "below" | null {
  if (cutoffPercent === null || max <= 0) return null;
  return (total / max) * 100 >= cutoffPercent ? "cleared" : "below";
}

export const SUGGEST_MIN = 5;

/** A suggested cut-off: the median reviewed percent, once SUGGEST_MIN people are reviewed. A hint, never applied by itself. */
export function suggestCutoff(percents: readonly number[]): number | null {
  if (percents.length < SUGGEST_MIN) return null;
  const s = [...percents].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2);
}

// ── Proctoring (0070) ─────────────────────────────────────────────────────

export interface Proctoring {
  fullscreen: boolean;
  tabs: boolean;
  copy: boolean;
  webcam: boolean;
  /** Full-screen exits plus tab/window switches before the test submits itself; null: never. */
  limit: number | null;
  /** 0099: each candidate's own question and option order. */
  shuffle: boolean;
  /** 0099: the candidate's email shown faintly across the test. */
  watermark: boolean;
  /** 0099: reviewers see an integrity index worked out from the warnings. */
  integrity: boolean;
}

export const PROCTOR_LIMIT_MAX = 20;
/** Minutes between webcam snapshots. */
export const SNAPSHOT_EVERY_MIN = 2;

/** The proctoring switches as a recruiter sets them. A limit only counts when full screen or tab detection is on. */
export function readProctoring(raw: Record<string, unknown>): Result<Proctoring> {
  const typed = text(raw.limit);
  let limit: number | null = null;
  if (typed) {
    const n = Number(typed);
    if (!Number.isInteger(n) || n < 1 || n > PROCTOR_LIMIT_MAX) return { ok: false, message: `The warning limit is a whole number from 1 to ${PROCTOR_LIMIT_MAX}, or empty for none.` };
    limit = n;
  }
  const p = { fullscreen: on(raw.fullscreen), tabs: on(raw.tabs), copy: on(raw.copy), webcam: on(raw.webcam), limit, shuffle: on(raw.shuffle), watermark: on(raw.watermark), integrity: on(raw.integrity) };
  if (limit !== null && !p.fullscreen && !p.tabs) return { ok: false, message: "A warning limit needs full screen or tab detection switched on." };
  return { ok: true, value: p };
}

/** True when any proctoring is on: the candidate is told before Start. */
export const proctored = (p: Proctoring) => p.fullscreen || p.tabs || p.copy || p.webcam || p.shuffle || p.watermark;

/** What the candidate is told before Start, one line each. */
export function proctorRules(p: Proctoring): string[] {
  const out: string[] = [];
  if (p.fullscreen) out.push("The test runs in full screen. Leaving full screen is recorded.");
  if (p.tabs) out.push("Switching to another tab or window is recorded.");
  if (p.copy) out.push("Copying, pasting and right-click are turned off.");
  if (p.webcam) out.push(`Your camera takes a photo every ${SNAPSHOT_EVERY_MIN} minutes, seen only by the company's reviewers. You'll be asked to agree first.`);
  if (p.shuffle) out.push("Questions and answer options appear in your own order.");
  if (p.watermark) out.push("Your email is shown faintly across the test.");
  if (p.limit !== null && (p.fullscreen || p.tabs)) out.push(`After ${p.limit} ${p.limit === 1 ? "warning" : "warnings"}, your test is submitted automatically with the answers saved so far.`);
  return out;
}

/**
 * The integrity index (0099): 100 for an attempt with no proctoring
 * warnings, 10 less for each full-screen exit or tab/window switch, never
 * below 0. Said in words too, so the number is never read alone.
 */
export function integrityIndex(warnings: number): { score: number; label: "High" | "Medium" | "Low" } {
  const score = Math.max(0, 100 - 10 * Math.max(0, Math.floor(warnings)));
  return { score, label: score >= 80 ? "High" : score >= 50 ? "Medium" : "Low" };
}
