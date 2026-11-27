/**
 * Pure and client-safe: the rules an assignment follows, shared by the
 * Learning page's assign panel and the server actions that write it.
 *
 * An assignment gives one course to people fixed at the moment it is
 * confirmed: some people, a team, or everyone in the company. A team lead
 * assigns only within their own team. Someone who already has the course
 * (assigned, or bought it themselves) is left out and said so, so one
 * person never holds two live assignments of the same course.
 */
import { normaliseEmail } from "@/lib/email";

export const REQUIREMENTS = ["required", "recommended"] as const;
export type Requirement = (typeof REQUIREMENTS)[number];
export const REQUIREMENT_LABEL: Record<Requirement, string> = { required: "Required", recommended: "Recommended" };

export type TargetKind = "people" | "team" | "everyone";
export type AssignTarget = { kind: "people"; emails: string[] } | { kind: "team"; teamId: string } | { kind: "everyone" };

/** Whose people a viewer may assign to: the whole company (an admin) or one team (its lead). */
export type AssignScope = { kind: "company" } | { kind: "team"; teamId: string };

export interface AssignPerson {
  email: string;
  name: string | null;
  teamId: string | null;
  /** A live assignment of this course in this company. */
  assigned: boolean;
  /** Bought the course themselves. */
  ownAccess: boolean;
}

export interface AssignForm {
  requirement: Requirement;
  /** YYYY-MM-DD, required assignments only. */
  dueOn: string | null;
  target: AssignTarget;
}

export interface AssignPlan {
  /** Who it will reach, fixed now. */
  recipients: AssignPerson[];
  alreadyAssigned: AssignPerson[];
  ownAccess: AssignPerson[];
  /** What it targeted, as kept with the assignment. */
  label: string;
  teamId: string | null;
}

type Result<T> = { ok: true; value: T } | { ok: false; message: string };

export const MAX_PEOPLE_PER_ASSIGNMENT = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Today in India, as YYYY-MM-DD: due dates are days, not instants. */
export function todayIst(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** A real calendar day, written YYYY-MM-DD. */
const isDay = (s: string) => DAY.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

/** The assign form as sent. A recommendation never carries a due date; a required one may, from today to a year ahead. */
export function readAssignForm(
  raw: { requirement: unknown; dueOn: unknown; targetKind: unknown; emails: unknown; teamId: unknown },
  today: string = todayIst(),
): Result<AssignForm> {
  if (!REQUIREMENTS.includes(raw.requirement as Requirement)) return { ok: false, message: "Choose required or recommended." };
  const requirement = raw.requirement as Requirement;

  let dueOn: string | null = null;
  const due = typeof raw.dueOn === "string" ? raw.dueOn.trim() : "";
  if (requirement === "required" && due) {
    if (!isDay(due)) return { ok: false, message: "Enter the due date as a date." };
    if (due < today) return { ok: false, message: "The due date has passed. Choose today or later." };
    if (due > addDays(today, 366)) return { ok: false, message: "Choose a due date within a year." };
    dueOn = due;
  }

  switch (raw.targetKind) {
    case "people": {
      const list = Array.isArray(raw.emails) ? raw.emails : [];
      const read = list.map(normaliseEmail);
      if (read.some((e) => e === null)) return { ok: false, message: "One of the people chosen has no valid email." };
      const emails = [...new Set(read as string[])];
      if (emails.length === 0) return { ok: false, message: "Choose who to assign it to." };
      if (emails.length > MAX_PEOPLE_PER_ASSIGNMENT) return { ok: false, message: `Choose at most ${MAX_PEOPLE_PER_ASSIGNMENT} people at a time.` };
      return { ok: true, value: { requirement, dueOn, target: { kind: "people", emails } } };
    }
    case "team":
      if (typeof raw.teamId !== "string" || !UUID.test(raw.teamId)) return { ok: false, message: "Choose a team." };
      return { ok: true, value: { requirement, dueOn, target: { kind: "team", teamId: raw.teamId.toLowerCase() } } };
    case "everyone":
      return { ok: true, value: { requirement, dueOn, target: { kind: "everyone" } } };
    default:
      return { ok: false, message: "Choose who to assign it to." };
  }
}

/**
 * Who an assignment reaches, from the company's active members, for this
 * viewer. A lead can reach only people on their own team, and can't target
 * everyone or another team. Nobody is reached twice: people who already
 * have the course are listed apart.
 */
export function planAssignment(
  people: readonly AssignPerson[],
  teams: readonly { id: string; name: string }[],
  target: AssignTarget,
  scope: AssignScope,
): Result<AssignPlan> {
  const inScope = (p: AssignPerson) => scope.kind === "company" || p.teamId === scope.teamId;
  let chosen: AssignPerson[];
  let label: string;
  let teamId: string | null = null;

  if (target.kind === "everyone") {
    if (scope.kind !== "company") return { ok: false, message: "You can assign to people on your team." };
    chosen = [...people];
    label = "Everyone";
  } else if (target.kind === "team") {
    const team = teams.find((t) => t.id === target.teamId);
    if (!team) return { ok: false, message: "That team no longer exists." };
    if (scope.kind === "team" && scope.teamId !== team.id) return { ok: false, message: "You can assign to people on your team." };
    chosen = people.filter((p) => p.teamId === team.id);
    label = `Team: ${team.name}`.slice(0, 120);
    teamId = team.id;
  } else {
    const byEmail = new Map(people.map((p) => [p.email, p]));
    const missing = target.emails.filter((e) => !byEmail.has(e));
    if (missing.length) return { ok: false, message: `Not in your company: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "…" : ""}` };
    chosen = target.emails.map((e) => byEmail.get(e)!);
    const outside = chosen.filter((p) => !inScope(p));
    if (outside.length) return { ok: false, message: `Not on your team: ${outside.slice(0, 3).map((p) => p.email).join(", ")}` };
    label = chosen.length === 1 ? chosen[0].email : `${chosen.length} people`;
  }

  return {
    ok: true,
    value: {
      recipients: chosen.filter((p) => !p.assigned && !p.ownAccess),
      alreadyAssigned: chosen.filter((p) => p.assigned),
      ownAccess: chosen.filter((p) => !p.assigned && p.ownAccess),
      label,
      teamId,
    },
  };
}

/** Whether two recipient lists are the same people, in any order. */
export function sameRecipients(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const x = [...a].sort();
  const y = [...b].sort();
  return x.every((e, i) => e === y[i]);
}

/** Active members with neither an assignment nor a course of their own. */
export function unassignedCount(rows: { assigned: boolean; ownAccess: boolean }[]) {
  return rows.filter((r) => !r.assigned && !r.ownAccess).length;
}

/** How a due date reads for someone who hasn't finished: overdue, due within a week, or later. */
export function dueState(dueOn: string | null, finished: boolean, today: string = todayIst()): "overdue" | "soon" | "later" | null {
  if (!dueOn || finished) return null;
  if (dueOn < today) return "overdue";
  return dueOn <= addDays(today, 7) ? "soon" : "later";
}
