import { GRANTABLE_ROLES, type GrantableRole } from "@/lib/company/access";
import { normaliseEmail } from "@/lib/email";

/**
 * HR's People and Teams rules, kept free of the database and of Next so
 * they can be tested. The server actions in src/app/org/[slug]/ gather the
 * facts, ask these functions, and only then write.
 */

export const MAX_CSV_ROWS = 500;
/** Comfortably above 500 rows of email, name and team, and under the 1 MB action limit. */
export const MAX_CSV_BYTES = 256 * 1024;
export const CSV_COLUMNS = ["email", "name", "team"] as const;

// ── CSV ─────────────────────────────────────────────────────

/**
 * RFC 4180 CSV: commas, quoted fields with "" for a quote, CRLF or LF line
 * ends, and a byte-order mark from Excel. Returns each record with the line
 * number it started on, so errors can point at the right line.
 */
export function parseCsv(text: string): { line: number; cells: string[] }[] {
  const input = text.replace(/^﻿/, "");
  const records: { line: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 1;
  let start = 1;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else { if (ch === "\n") line += 1; cell += ch; }
      continue;
    }
    if (ch === '"' && cell === "") quoted = true;
    else if (ch === ",") { cells.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i += 1;
      cells.push(cell);
      records.push({ line: start, cells });
      cells = []; cell = "";
      line += 1; start = line;
    } else cell += ch;
  }
  if (cell !== "" || cells.length) { cells.push(cell); records.push({ line: start, cells }); }
  // Blank lines (a trailing newline, a spacer row) carry nothing.
  return records.filter((r) => r.cells.some((c) => c.trim() !== ""));
}

export interface CsvPerson {
  line: number;
  email: string;
  name: string | null;
  team: string | null;
}

export interface RowError {
  /** The file's line number, or null for a problem with the whole file. */
  line: number | null;
  message: string;
}

/** Reads the People CSV: a header naming the columns, then one person per line. */
export function readPeopleCsv(text: string): { people: CsvPerson[]; errors: RowError[] } {
  const records = parseCsv(text);
  if (!records.length) return { people: [], errors: [{ line: null, message: "The file is empty." }] };

  const [header, ...rows] = records;
  const names = header.cells.map((c) => c.trim().toLowerCase());
  const errors: RowError[] = [];
  const unknown = names.filter((n) => !(CSV_COLUMNS as readonly string[]).includes(n));
  if (!names.includes("email")) {
    return { people: [], errors: [{ line: header.line, message: `The first line must name the columns, including "email". Found: ${header.cells.join(", ") || "nothing"}.` }] };
  }
  if (unknown.length) errors.push({ line: header.line, message: `Unknown column${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}. Use only email, name and team.` });
  const repeated = names.filter((n, i) => names.indexOf(n) !== i);
  if (repeated.length) errors.push({ line: header.line, message: `Column named twice: ${[...new Set(repeated)].join(", ")}.` });
  if (!rows.length) errors.push({ line: null, message: "The file has a header but no people." });
  if (rows.length > MAX_CSV_ROWS) {
    errors.push({ line: null, message: `The file has ${rows.length} people. Upload at most ${MAX_CSV_ROWS} at a time.` });
    return { people: [], errors };
  }

  const col = (n: string) => names.indexOf(n);
  const people: CsvPerson[] = [];
  for (const r of rows) {
    const get = (n: string) => (col(n) >= 0 ? (r.cells[col(n)] ?? "").trim() : "");
    if (r.cells.length > names.length && r.cells.slice(names.length).some((c) => c.trim())) {
      errors.push({ line: r.line, message: `Has more values than the header has columns. Check for an unquoted comma.` });
      continue;
    }
    people.push({ line: r.line, email: get("email"), name: tidyName(get("name")), team: get("team") || null });
  }
  return { people, errors };
}

export function tidyName(input: unknown): string | null {
  const value = typeof input === "string" ? input.trim().replace(/\s+/g, " ").slice(0, 80) : "";
  return value || null;
}

// ── Planning an add ─────────────────────────────────────────

/** How someone joins from the People page or a CSV; more responsibilities are given afterwards. */
export type AddRole = "employee" | "admin";

/** What the database says about an email in this company, gathered before planning. */
export interface ExistingPerson {
  removed: boolean;
}

/**
 * Facts for planning an add. Only this company's rows matter: the same email
 * may belong to other companies, and may be a Klymb learner with their own
 * courses, which this company never sees (see progress-data).
 */
export interface AddContext {
  seatCount: number;
  activeMembers: number;
  /** Team name, lowercased and trimmed → team id. */
  teams: Map<string, string>;
  existing: Map<string, ExistingPerson>;
}

export interface PlannedPerson {
  line: number;
  email: string;
  name: string | null;
  teamId: string | null;
  role: AddRole;
  /** A removed member of this company, coming back. */
  returning: boolean;
}

export const teamKey = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * All or nothing: `ok` only when every person can be added and they fit in
 * the free seats. Otherwise every problem is listed, by line.
 */
export function planAdd(people: (CsvPerson & { role?: AddRole })[], ctx: AddContext): { ok: boolean; add: PlannedPerson[]; errors: RowError[] } {
  const errors: RowError[] = [];
  const add: PlannedPerson[] = [];
  const firstLine = new Map<string, number>();

  for (const p of people) {
    const email = normaliseEmail(p.email);
    if (!email) { errors.push({ line: p.line, message: p.email ? `"${p.email}" isn't a valid email.` : "The email is missing." }); continue; }
    const seen = firstLine.get(email);
    if (seen !== undefined) { errors.push({ line: p.line, message: `${email} is already on line ${seen}.` }); continue; }
    firstLine.set(email, p.line);

    const existing = ctx.existing.get(email);
    if (existing && !existing.removed) { errors.push({ line: p.line, message: `${email} is already in your company.` }); continue; }

    let teamId: string | null = null;
    if (p.team) {
      teamId = ctx.teams.get(teamKey(p.team)) ?? null;
      if (!teamId) { errors.push({ line: p.line, message: `There is no team called "${p.team}". Create it on the Teams page first.` }); continue; }
    }
    add.push({ line: p.line, email, name: p.name, teamId, role: p.role ?? "employee", returning: !!existing?.removed });
  }

  const free = Math.max(0, ctx.seatCount - ctx.activeMembers);
  if (add.length > free) {
    const asked = people.length === 1 ? "Adding this person" : `This adds ${add.length} ${add.length === 1 ? "person" : "people"}, but`;
    errors.push({
      line: null,
      message: people.length === 1
        ? `${asked} needs a free seat, and all ${ctx.seatCount} are taken. Ask Klymb for more seats or remove someone first.`
        : `${asked} only ${free} of ${ctx.seatCount} seats ${free === 1 ? "is" : "are"} free. Ask Klymb for more seats or upload fewer people.`,
    });
  }
  return { ok: errors.length === 0, add: errors.length ? [] : add, errors };
}

// ── Removing ────────────────────────────────────────────────

/** Why an admin may not remove this person, or null when they may. */
export function removeBlocked(p: { actorEmail: string; target: { email: string; roles: readonly string[]; removed: boolean } | null; activeAdmins: number }): string | null {
  if (!p.target) return "That person isn't in your company.";
  if (p.target.removed) return "That person has already been removed.";
  if (p.target.email === p.actorEmail) return "You can't remove yourself. Ask another admin.";
  if (p.target.roles.includes("admin") && p.activeAdmins <= 1) return "The last admin can't be removed.";
  return null;
}

// ── Responsibilities ────────────────────────────────────────

/** The responsibilities ticked on the People page, checked: known ones only, no repeats, in a fixed order. */
export function grantedRoles(input: unknown): GrantableRole[] | null {
  if (!Array.isArray(input) || input.length > GRANTABLE_ROLES.length * 2) return null;
  if (!input.every((r) => typeof r === "string" && (GRANTABLE_ROLES as readonly string[]).includes(r))) return null;
  return GRANTABLE_ROLES.filter((r) => input.includes(r));
}

/**
 * Why an admin may not set these responsibilities, or null when they may.
 * Everyone keeps at least one (a team lead's role counts); an admin can't
 * take their own admin away, and the last admin stays one.
 */
export function rolesBlocked(p: {
  actorEmail: string;
  target: { email: string; roles: readonly string[]; removed: boolean } | null;
  next: readonly GrantableRole[];
  activeAdmins: number;
}): string | null {
  if (!p.target || p.target.removed) return "That person isn't in your company.";
  const leads = p.target.roles.includes("team_lead");
  if (!p.next.length && !leads) return "Everyone needs at least one responsibility. Choose Employee if nothing else fits.";
  const losesAdmin = p.target.roles.includes("admin") && !p.next.includes("admin");
  if (losesAdmin && p.target.email === p.actorEmail) return "You can't take away your own admin role. Ask another admin.";
  if (losesAdmin && p.activeAdmins <= 1) return "The last admin must stay an admin. Make someone else an admin first.";
  return null;
}

// ── Teams ───────────────────────────────────────────────────

export function teamName(input: unknown): { ok: true; value: string } | { ok: false; message: string } {
  const value = typeof input === "string" ? input.trim().replace(/\s+/g, " ") : "";
  if (!value) return { ok: false, message: "Enter a team name." };
  if (value.length > 60) return { ok: false, message: "Keep team names under 60 characters." };
  return { ok: true, value };
}

/** Why this person can't be made a team's lead, or null. Any active member can lead, admins included. */
export function leadBlocked(target: { removed: boolean } | null): string | null {
  if (!target || target.removed) return "That person isn't in your company.";
  return null;
}

/** A lead who moves to another team stops leading the old one; everything else they hold stays. */
export function leadsAfterMove(leadTeamId: string | null, toTeam: string | null): string | null {
  return leadTeamId !== null && leadTeamId === toTeam ? leadTeamId : null;
}
