import { hasRole, type CompanyMember, type CompanyRole } from "@/lib/company/access";
import { parseCsv, tidyName } from "@/lib/company/people";
import { normaliseEmail } from "@/lib/email";

/**
 * Hiring batch rules (T06), free of the database and of Next so they can be
 * tested. A recruiter picks a test version their company approved, a role,
 * an optional prep course, a reviewer, when the batch opens and closes (in a
 * time zone they choose) and the candidates; previews; then sends.
 *
 * The timing rule: everyone who starts in time gets their full time. The
 * last moment to start is the closing time minus the time allowed (the
 * version's minutes plus any extra minutes the person was given), unless an
 * extension set a later last start for that one person.
 */

// ── Who ─────────────────────────────────────────────────────

/** Recruiters run batches; reviewers score submissions in them (H09); admins and company heads can look. */
export const HIRING_VIEWERS = ["admin", "company_head", "recruiter", "reviewer"] as const satisfies readonly CompanyRole[];
export const seesHiring = (m: CompanyMember | null) => hasRole(m, HIRING_VIEWERS);
export const canSchedule = (m: CompanyMember | null) => hasRole(m, ["recruiter"]);
/** Any reviewer of the company scores (H05 D5: A); the batch's named reviewer is shown as assigned. */
export const canScore = (m: CompanyMember | null) => hasRole(m, ["reviewer"]);
/** Records hiring decisions and shares results (H05 D6: recruiters and company heads; reviewers score, admins view). */
export const canDecide = (m: CompanyMember | null) => hasRole(m, ["recruiter", "company_head"]);

// ── Limits ──────────────────────────────────────────────────

export const BATCH_LIMITS = {
  candidates: 200,
  role: 120,
  name: 120,
  extraMinutes: 480,
  /** The longest a batch can stay open. */
  windowDays: 60,
  /** How much later than closing an extension can let one person start. */
  extensionDays: 30,
  /** A pasted list or CSV: comfortably above 200 rows, under the action limit. */
  listBytes: 64 * 1024,
} as const;

/** A send that has held a candidate this long without finishing was interrupted, and may be retried. */
export const STALE_SEND_MINUTES = 10;
/** The automatic reminder goes to people who haven't started, within this many hours of their last start. */
export const AUTO_REMIND_HOURS = 24;
/** At most this many automatic reminder attempts per person and link, so a dead address isn't retried every run. */
export const AUTO_REMIND_ATTEMPTS = 3;
/** The prep courses a batch can open for its candidates. */
export const PREP_COURSES = { "system-design": "System Design" } as const;
export type PrepCourse = keyof typeof PREP_COURSES;
export const isPrepCourse = (v: unknown): v is PrepCourse => typeof v === "string" && Object.hasOwn(PREP_COURSES, v);

// ── Time zones ──────────────────────────────────────────────

export const DEFAULT_TIME_ZONE = "Asia/Kolkata";

export function isTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Minutes the zone is ahead of UTC at that instant. */
function offsetMinutes(at: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(at));
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const wall = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return Math.round((wall - Math.floor(at / 1000) * 1000) / 60000);
}

const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * "2026-12-04T18:00" on the wall clock in `tz`, as an instant. Null when it
 * isn't a real date and time. In the hour a clock skips, it lands just
 * after; in the hour it repeats, on the first of the two.
 */
export function zonedToUtc(local: unknown, tz: string): Date | null {
  const m = typeof local === "string" ? LOCAL.exec(local) : null;
  if (!m || !isTimeZone(tz)) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  const check = new Date(wall);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d || h > 23 || mi > 59) return null;
  let at = wall - offsetMinutes(wall, tz) * 60000;
  at = wall - offsetMinutes(at, tz) * 60000;
  return new Date(at);
}

/** An instant as the value of a datetime-local input in `tz`. */
export function toZonedInput(at: Date | string, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(new Date(at));
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return `${p("year")}-${p("month")}-${p("day")}T${p("hour")}:${p("minute")}`;
}

/** "Thu 4 Dec 2026, 6:00 pm" on the clock in `tz`. */
export function formatInZone(at: Date | string, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  }).formatToParts(new Date(at));
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return `${p("weekday")} ${p("day")} ${p("month")} ${p("year")}, ${p("hour")}:${p("minute")} ${p("dayPeriod").toLowerCase()}`;
}

/** "India Standard Time", or the zone's own name when there is no long one. */
export function zoneName(tz: string, at: Date | string = new Date()): string {
  const part = new Intl.DateTimeFormat("en-GB", { timeZone: tz, timeZoneName: "long" }).formatToParts(new Date(at)).find((p) => p.type === "timeZoneName");
  return part?.value && !/^GMT[+-]/.test(part.value) ? part.value : tz.replace(/_/g, " ");
}

/** "Thu 4 Dec 2026, 6:00 pm India Standard Time": a deadline a candidate reads. */
export const deadlineText = (at: Date | string, tz: string) => `${formatInZone(at, tz)} ${zoneName(tz, at)}`;

/** "1 hour 30 minutes". */
export function durationText(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = h ? `${h} hour${h === 1 ? "" : "s"}` : "";
  const mins = m ? `${m} minute${m === 1 ? "" : "s"}` : "";
  return [hours, mins].filter(Boolean).join(" ") || "0 minutes";
}

// ── Timing ──────────────────────────────────────────────────

/** The minutes one person has once they start. */
export const allowedMinutes = (versionMinutes: number, extraMinutes: number) => versionMinutes + extraMinutes;

/** The last moment this person can start and still get their full time. */
export function lastStart(b: { closesAt: string | Date; minutes: number }, c: { extraMinutes: number; lastStartAt: string | Date | null }): Date {
  if (c.lastStartAt) return new Date(c.lastStartAt);
  return new Date(new Date(b.closesAt).getTime() - allowedMinutes(b.minutes, c.extraMinutes) * 60000);
}

/**
 * True when an email carrying this person's link would arrive too late to
 * use: their last start is now or past. Sending, retrying and replacing a
 * link all refuse such a person; giving them a later start is the way back.
 * Kept in step with the SQL in batch-data (`coalesce(c.last_start_at, …) > now()`).
 */
export function startPassed(b: { closesAt: string | Date; minutes: number }, c: { extraMinutes: number; lastStartAt: string | Date | null }, now: Date): boolean {
  return lastStart(b, c) <= now;
}

/** "2 people weren't sent: …". What a recruiter reads about the people a send left out because their time to start had passed. */
export function passedNote(n: number): string {
  if (!n) return "";
  const who = n === 1 ? "1 person wasn't sent: their" : `${n} people weren't sent: their`;
  return `${who} time to start has passed. Use Change time to give ${n === 1 ? "them" : "each"} a later start, which emails a working link.`;
}

export type LinkState = "draft" | "batch_cancelled" | "cancelled" | "not_open" | "open" | "missed";

/** Where one candidate's link stands right now. Only "open" may start the test. */
export function linkState(p: { batchStatus: string; candidateStatus: string; opensAt: string | Date; lastStart: Date; now: Date }): LinkState {
  if (p.batchStatus === "cancelled") return "batch_cancelled";
  if (p.candidateStatus === "cancelled") return "cancelled";
  if (p.batchStatus !== "sent") return "draft";
  if (p.now < new Date(p.opensAt)) return "not_open";
  if (p.now > p.lastStart) return "missed";
  return "open";
}

// ── Candidates ──────────────────────────────────────────────

export interface CandidateInput {
  name: string;
  email: string;
  extraMinutes: number;
}

export interface ListProblem {
  line: number | null;
  message: string;
}

const isMinutes = (s: string) => /^\d{1,3}$/.test(s);

/**
 * Reads the pasted list or a CSV. Each line is a name and an email, in either
 * order, and optionally extra minutes for that person. A first line naming
 * the columns (name, email, extra minutes) is used when present. Problems are
 * per line; a duplicate keeps the first.
 */
export function parseCandidates(text: string): { candidates: CandidateInput[]; problems: ListProblem[] } {
  if (text.length > BATCH_LIMITS.listBytes) return { candidates: [], problems: [{ line: null, message: "The list is too long. Add at most 200 people." }] };
  // Tabs (pasted from a spreadsheet) and semicolons (some CSV exports) read as commas.
  const records = parseCsv(text.replace(/\t|;/g, ","));
  const problems: ListProblem[] = [];
  if (!records.length) return { candidates: [], problems: [{ line: null, message: "Add at least one person." }] };

  const head = records[0].cells.map((c) => c.trim().toLowerCase());
  const hasHeader = head.includes("email") && !head.some((c) => c.includes("@"));
  const col = (...names: string[]) => head.findIndex((c) => names.some((n) => c === n || c.startsWith(n)));
  const at = hasHeader ? { name: col("name", "full name"), email: col("email"), extra: col("extra") } : null;
  const rows = hasHeader ? records.slice(1) : records;
  if (rows.length > BATCH_LIMITS.candidates) {
    return { candidates: [], problems: [{ line: null, message: `The list has ${rows.length} people. Add at most ${BATCH_LIMITS.candidates} to one batch.` }] };
  }

  const seen = new Set<string>();
  const candidates: CandidateInput[] = [];
  for (const r of rows) {
    const cells = r.cells.map((c) => c.trim());
    let email = "", name = "", extra = "";
    if (at) {
      email = cells[at.email] ?? "";
      name = at.name >= 0 ? cells[at.name] ?? "" : "";
      extra = at.extra >= 0 ? cells[at.extra] ?? "" : "";
    } else {
      email = cells.find((c) => c.includes("@")) ?? "";
      name = cells.find((c) => c && !c.includes("@") && !isMinutes(c)) ?? "";
      extra = cells.find((c) => isMinutes(c)) ?? "";
    }
    const address = normaliseEmail(email);
    const who = tidyName(name);
    if (!address) { problems.push({ line: r.line, message: email ? `"${email}" isn't an email address.` : "No email address." }); continue; }
    if (!who) { problems.push({ line: r.line, message: `Add a name for ${address}.` }); continue; }
    if (who.length > BATCH_LIMITS.name) { problems.push({ line: r.line, message: "The name is too long." }); continue; }
    const minutes = extra === "" ? 0 : Number(extra);
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > BATCH_LIMITS.extraMinutes) {
      problems.push({ line: r.line, message: `Extra minutes for ${address} must be a whole number from 0 to ${BATCH_LIMITS.extraMinutes}.` });
      continue;
    }
    if (seen.has(address)) { problems.push({ line: r.line, message: `${address} is in the list twice. Keeping the first.` }); continue; }
    seen.add(address);
    candidates.push({ name: who, email: address, extraMinutes: minutes });
  }
  if (!candidates.length && !problems.length) problems.push({ line: null, message: "Add at least one person." });
  return { candidates, problems };
}

// ── The batch form ──────────────────────────────────────────

export interface ApprovedTest {
  item: string;
  title: string;
  versionId: string;
  version: number;
  minutes: number;
  role: string;
}

/** Hiring: candidates, with shortlisting. Internal: colleagues (U11), scored and reviewed but never shortlisted. */
export type RoundPurpose = "hiring" | "internal";
export const PURPOSE_LABEL: Record<RoundPurpose, string> = { hiring: "Hiring", internal: "Internal" };

export interface BatchInput {
  item: string;
  /** Defaults to hiring when not given (older callers). */
  purpose?: RoundPurpose;
  versionId: string;
  role: string;
  prepCourse: PrepCourse | null;
  reviewer: string;
  timeZone: string;
  opensAt: Date;
  closesAt: Date;
  candidates: CandidateInput[];
}

export type BatchField = "test" | "role" | "prep" | "reviewer" | "timeZone" | "opens" | "closes" | "candidates";
export type BatchFormResult = { ok: true; value: BatchInput } | { ok: false; errors: Partial<Record<BatchField, string>>; problems: ListProblem[] };

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/**
 * Checks a new batch against what the company can use right now: a test
 * version it approved, one of its reviewers, an allowed prep course. The
 * window must leave every person their full time: the last start of the
 * person with the most time can't be before opening or already past.
 */
export function readBatchForm(
  raw: Record<string, unknown>,
  ctx: { now: Date; tests: ApprovedTest[]; reviewers: string[]; prepCourses: readonly string[] },
): BatchFormResult {
  const errors: Partial<Record<BatchField, string>> = {};
  const test = ctx.tests.find((t) => t.versionId === text(raw.versionId));
  if (!test) errors.test = ctx.tests.length ? "Choose a test." : "Your company has no approved test yet.";

  const role = text(raw.role).replace(/\s+/g, " ");
  if (!role) errors.role = text(raw.purpose) === "internal" ? "Name this round, e.g. \"Engineering team check\"." : "Name the role you're hiring for.";
  else if (role.length > BATCH_LIMITS.role) errors.role = `Keep the role under ${BATCH_LIMITS.role} characters.`;

  const prepRaw = text(raw.prepCourse);
  const prepCourse = prepRaw ? (isPrepCourse(prepRaw) && ctx.prepCourses.includes(prepRaw) ? prepRaw : null) : null;
  if (prepRaw && !prepCourse) errors.prep = "That course isn't in your plan.";

  const reviewer = normaliseEmail(raw.reviewer);
  if (!reviewer || !ctx.reviewers.includes(reviewer)) errors.reviewer = ctx.reviewers.length ? "Choose a reviewer." : "Your company has no reviewer. An admin can give someone that role on People.";

  const timeZone = text(raw.timeZone);
  const tzOk = isTimeZone(timeZone);
  if (!tzOk) errors.timeZone = "Choose a time zone.";
  const opensAt = tzOk ? zonedToUtc(text(raw.opens), timeZone) : null;
  const closesAt = tzOk ? zonedToUtc(text(raw.closes), timeZone) : null;
  if (tzOk && !opensAt) errors.opens = "Enter when the batch opens.";
  if (tzOk && !closesAt) errors.closes = "Enter when the batch closes.";

  const { candidates, problems } = parseCandidates(typeof raw.candidates === "string" ? raw.candidates : "");
  if (!candidates.length) errors.candidates = problems[0]?.message ?? "Add at least one person.";
  else if (problems.length) errors.candidates = `Fix ${problems.length === 1 ? "1 line" : `${problems.length} lines`} in the list first.`;

  if (opensAt && closesAt) {
    if (closesAt <= opensAt) errors.closes = "Close after it opens.";
    else if (closesAt.getTime() - opensAt.getTime() > BATCH_LIMITS.windowDays * 86400000) errors.closes = `Keep a batch open for at most ${BATCH_LIMITS.windowDays} days.`;
    else if (closesAt <= ctx.now) errors.closes = "That time has passed.";
    else if (test && candidates.length) {
      const most = Math.max(...candidates.map((c) => c.extraMinutes));
      const last = lastStart({ closesAt, minutes: test.minutes }, { extraMinutes: most, lastStartAt: null });
      const allowed = durationText(allowedMinutes(test.minutes, most));
      if (last < opensAt) errors.closes = `With ${allowed} allowed, the window is too short. Close at least ${allowed} after it opens.`;
      else if (last <= ctx.now) errors.closes = `With ${allowed} allowed, nobody could start in time. Close later.`;
    }
  }

  if (Object.keys(errors).length || !test || !reviewer || !opensAt || !closesAt) return { ok: false, errors, problems };
  const purpose: RoundPurpose = text(raw.purpose) === "internal" ? "internal" : "hiring";
  return { ok: true, value: { item: test.item, purpose, versionId: test.versionId, role, prepCourse, reviewer, timeZone, opensAt, closesAt, candidates } };
}

// ── One person's extension ──────────────────────────────────

export type ExtensionResult = { ok: true; value: { extraMinutes: number; lastStartAt: Date | null } } | { ok: false; message: string };

/**
 * Extra minutes once they start, and optionally a later last start than the
 * batch gives them. Blank keeps the batch's rule.
 */
export function readExtension(
  raw: { extraMinutes: unknown; lastStart: unknown },
  ctx: { now: Date; timeZone: string; closesAt: string; minutes: number },
): ExtensionResult {
  const extra = Number(text(raw.extraMinutes) || "0");
  if (!Number.isInteger(extra) || extra < 0 || extra > BATCH_LIMITS.extraMinutes) {
    return { ok: false, message: `Extra minutes must be a whole number from 0 to ${BATCH_LIMITS.extraMinutes}.` };
  }
  const given = text(raw.lastStart);
  const usual = lastStart({ closesAt: ctx.closesAt, minutes: ctx.minutes }, { extraMinutes: extra, lastStartAt: null });
  if (!given) {
    // The email this sends carries their link: it must still start the test.
    if (usual <= ctx.now) return { ok: false, message: "With this time allowed, their last start has already passed. Set a later last start." };
    return { ok: true, value: { extraMinutes: extra, lastStartAt: null } };
  }
  const at = zonedToUtc(given, ctx.timeZone);
  if (!at) return { ok: false, message: "Enter a last start date and time, or leave it blank." };
  if (at <= usual) return { ok: false, message: `Pick a time after ${formatInZone(usual, ctx.timeZone)}, the usual last start with this time allowed. Or leave it blank.` };
  if (at <= ctx.now) return { ok: false, message: "That time has passed." };
  if (at.getTime() > new Date(ctx.closesAt).getTime() + BATCH_LIMITS.extensionDays * 86400000) {
    return { ok: false, message: `Pick a time within ${BATCH_LIMITS.extensionDays} days of closing.` };
  }
  return { ok: true, value: { extraMinutes: extra, lastStartAt: at } };
}

// ── Delivery ────────────────────────────────────────────────

export type Delivery = "pending" | "sending" | "sent" | "failed" | "skipped";

/**
 * Where one person's email stands, as a recruiter reads it. "sent" only means
 * the mail service accepted it: nothing here confirms it reached the inbox,
 * so no label says "delivered". `skipped` is the mail service declining to
 * send (for example an address that bounced before); it was never sent.
 */
export const DELIVERY_LABEL: Record<Delivery, string> = {
  pending: "Not sent",
  sending: "Sending",
  sent: "Sent",
  failed: "Failed",
  skipped: "Not sent",
};

/** One email in a person's history, by how the send ended. */
export const MAIL_OUTCOME_LABEL: Record<"sent" | "failed" | "skipped", string> = { sent: "sent", failed: "failed", skipped: "not sent" };

/** Said once beside the counts, so "Sent" isn't read as "in their inbox". */
export const SENT_MEANS = "Sent means our mail service accepted the email. It doesn't confirm it reached their inbox.";

/** True when a recruiter can send this person's email again. */
export function canRetry(d: { delivery: Delivery; claimedAt: string | null }, now: Date): boolean {
  if (d.delivery === "failed" || d.delivery === "skipped") return true;
  return d.delivery === "sending" && !!d.claimedAt && now.getTime() - new Date(d.claimedAt).getTime() > STALE_SEND_MINUTES * 60000;
}

export type MailKind = "invite" | "reminder" | "auto_reminder" | "new_link" | "extension";
export const MAIL_KIND_LABEL: Record<MailKind, string> = {
  invite: "Invitation",
  reminder: "Reminder",
  auto_reminder: "Automatic reminder",
  new_link: "New link",
  extension: "New time",
};

/**
 * What one person's reminders came to, read from their mail log (never from
 * the claim stamps, which are set before anything is sent). `history` is
 * that person's log, newest first.
 */
export function reminderSummary(history: readonly { kind: MailKind; outcome: "sent" | "failed" | "skipped"; error: string | null }[]): {
  /** Reminders a recruiter sent that the mail service accepted. */
  manual: number;
  /** The automatic reminder went out. */
  autoSent: boolean;
  /** The latest automatic attempt didn't go out, and none did: why, for the recruiter. */
  autoFailed: { outcome: "failed" | "skipped"; error: string | null } | null;
} {
  const manual = history.filter((m) => m.kind === "reminder" && m.outcome === "sent").length;
  const autos = history.filter((m) => m.kind === "auto_reminder");
  const autoSent = autos.some((m) => m.outcome === "sent");
  const latest = autos[0];
  const autoFailed = !autoSent && latest && latest.outcome !== "sent" ? { outcome: latest.outcome, error: latest.error } : null;
  return { manual, autoSent, autoFailed };
}

/** The mailer's reason, short enough to show a recruiter and store. */
export function deliveryError(reason: string): string {
  if (reason === "not configured") return "Email isn't set up on this server.";
  return reason.replace(/\s+/g, " ").trim().slice(0, 300) || "The mail service refused it.";
}

// ── Adding people from the company (user, 24 Nov: tests go to anyone, team members too) ──

export interface PickablePerson {
  email: string;
  name: string | null;
  teamId: string | null;
}

/** A list line for one person, quoted when the name holds a comma or quote, so the list parser reads it back exactly. */
export function personLine(p: { email: string; name: string | null }): string {
  const name = (p.name?.trim() || p.email.split("@")[0]).slice(0, 120);
  const safe = /[",\n]/.test(name) ? `"${name.replace(/"/g, '""')}"` : name;
  return `${safe}, ${p.email}`;
}

/** The list with these people added at the end, skipping anyone whose email is already in it (any case). */
export function addPeopleToList(list: string, people: readonly { email: string; name: string | null }[]): { list: string; added: number; skipped: number } {
  const have = new Set((list.toLowerCase().match(/[^\s,;"<>]+@[^\s,;"<>]+/g) ?? []).map((e) => e.trim()));
  const lines: string[] = [];
  let skipped = 0;
  for (const p of people) {
    const email = p.email.toLowerCase();
    if (have.has(email)) { skipped += 1; continue; }
    have.add(email);
    lines.push(personLine({ ...p, email }));
  }
  if (!lines.length) return { list, added: 0, skipped };
  return { list: list.trim() ? `${list.trimEnd()}\n${lines.join("\n")}` : lines.join("\n"), added: lines.length, skipped };
}
