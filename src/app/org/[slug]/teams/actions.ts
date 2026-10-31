"use server";

import { revalidatePath } from "next/cache";
import { hrFor } from "@/lib/company/auth";
import { headBlocked, teamName } from "@/lib/company/people";
import { insertTeam, loadPerson, movePersonRow, setTeamHead } from "@/lib/company/people-data";
import { db } from "@/lib/db/client";
import { normaliseEmail } from "@/lib/email";

export type TeamsResult = { ok: true; message: string } | { ok: false; message: string };

const NOT_ALLOWED: TeamsResult = { ok: false, message: "Only your company's HR can do this. Try signing in again." };
const UNAVAILABLE: TeamsResult = { ok: false, message: "That didn't work just now. Please try again in a minute." };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refresh(slug: string) {
  revalidatePath(`/org/${slug}/teams`);
  revalidatePath(`/org/${slug}/people`);
}

/** 1.10: a new team, unique by name ignoring capitals (CSV uploads match it that way). */
export async function createTeam(slug: string, rawName: string): Promise<TeamsResult> {
  const hr = await hrFor(slug);
  if (!hr) return NOT_ALLOWED;
  const name = teamName(rawName);
  if (!name.ok) return name;
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const created = await insertTeam(sql, hr.companyId, name.value);
  if (created === null) return UNAVAILABLE;
  if (!created) return { ok: false, message: `There is already a team called "${name.value}".` };
  refresh(slug);
  return { ok: true, message: `${name.value} was created.` };
}

/** 1.10: one head per team. The old head stays on the team as an employee. */
export async function chooseHead(slug: string, teamId: string, rawEmail: string): Promise<TeamsResult> {
  const hr = await hrFor(slug);
  if (!hr) return NOT_ALLOWED;
  const email = normaliseEmail(rawEmail);
  if (!UUID.test(teamId) || !email) return { ok: false, message: "Choose a team and a person." };
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const target = await loadPerson(sql, hr.companyId, email);
  if (target === undefined) return UNAVAILABLE;
  const blocked = headBlocked(target);
  if (blocked) return { ok: false, message: blocked };

  const changed = await setTeamHead(sql, hr.companyId, teamId, email);
  if (changed === null) return UNAVAILABLE;
  if (!changed) return { ok: false, message: "That team or person no longer exists. Reload and try again." };
  refresh(slug);
  return { ok: true, message: `${email} is now the team's head.` };
}

/** 1.10: move someone to a team, or to no team (""). A head who moves becomes an employee. */
export async function movePerson(slug: string, rawEmail: string, rawTeamId: string): Promise<TeamsResult> {
  const hr = await hrFor(slug);
  if (!hr) return NOT_ALLOWED;
  const email = normaliseEmail(rawEmail);
  const teamId = rawTeamId === "" ? null : rawTeamId;
  if (!email || (teamId !== null && !UUID.test(teamId))) return { ok: false, message: "Choose a person and a team." };
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const target = await loadPerson(sql, hr.companyId, email);
  if (target === undefined) return UNAVAILABLE;
  if (!target || target.removed) return { ok: false, message: "That person isn't in your company." };

  const moved = await movePersonRow(sql, hr.companyId, email, teamId);
  if (moved === null) return UNAVAILABLE;
  if (!moved) return { ok: false, message: "That team no longer exists. Reload and try again." };
  refresh(slug);
  const wasHead = target.role === "head" && target.teamId !== teamId;
  return { ok: true, message: `${email} was moved${wasHead ? " and is no longer a head" : ""}.` };
}
