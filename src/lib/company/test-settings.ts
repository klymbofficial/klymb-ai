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
  /** 0 until the first save. */
  revision: number;
  updatedBy: string | null;
  updatedAt: string | null;
}

export const DEFAULT_SETTINGS: TestSettings = {
  accessOpen: true, endsOn: null, tags: [], autoRemind: true, invite: null, revision: 0, updatedBy: null, updatedAt: null,
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
