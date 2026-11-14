"use server";

import { revalidatePath } from "next/cache";
import { currentEmail } from "@/auth";
import { HACKATHON, hackathonPhase, rosterOpen } from "@/data/hackathon";
import { addInterest, createTeam, joinTeam, publishedResults, removeMember, saveEntry } from "@/lib/hackathon";
import { normaliseTeamCode, parseEntry, parseMemberDetails, type DetailErrors, type EntryErrors } from "@/lib/hackathon-validate";
import { checkRateLimit } from "@/lib/rate-limit";

export type FormResult = { ok?: boolean; message?: string; errors?: DetailErrors & EntryErrors; values?: Record<string, string> } | null;

const typed = (form: FormData) =>
  Object.fromEntries([...form.entries()].filter((e): e is [string, string] => typeof e[1] === "string" && !e[0].startsWith("$")).map(([k, v]) => [k, v.slice(0, 600)]));

async function phase() {
  return hackathonPhase((await publishedResults()).length > 0);
}

function refresh() {
  revalidatePath("/learn/hackathon");
  revalidatePath("/hackathons");
  revalidatePath("/learn");
}

/** Registers solo, as a new team's leader, or into a team by its code. */
export async function registerForHackathon(_: FormResult, form: FormData): Promise<FormResult> {
  const email = await currentEmail();
  if (!email) return { message: "Log in again to register." };
  if ((await phase()) !== "registration") return { message: "Registration isn't open right now." };
  const { details, errors } = parseMemberDetails(form);
  const mode = form.get("mode") === "join" ? "join" : "create";
  const code = mode === "join" ? normaliseTeamCode(form.get("code")) : null;
  if (mode === "join" && !code) errors.code = "Enter the 6-character team code.";
  const teamName = typeof form.get("teamName") === "string" ? String(form.get("teamName")).trim().slice(0, 60) : "";
  if (Object.keys(errors).length) return { errors, message: "Check the fields marked above.", values: typed(form) };
  const limit = await checkRateLimit("hackathon_register", { limit: 20, windowMinutes: 60, identity: email });
  if (!limit.allowed) return { message: "Too many tries in an hour. Please wait a few minutes.", values: typed(form) };
  const result = mode === "join" ? await joinTeam(email, details, code!) : await createTeam(email, details, teamName);
  if (!result.ok) return { message: result.message, values: typed(form) };
  refresh();
  return { ok: true };
}

/** A leader removing a teammate, or a member leaving, until the roster locks. */
export async function removeFromTeam(memberId: string): Promise<{ ok: boolean; message?: string }> {
  const email = await currentEmail();
  if (!email) return { ok: false, message: "Log in again." };
  const p = await phase();
  if (!rosterOpen() || p === "live" || p === "judging" || p === "results") return { ok: false, message: "The team roster is locked now." };
  const result = await removeMember(email, memberId);
  if (result.ok) refresh();
  return result.ok ? { ok: true } : { ok: false, message: result.message };
}

/** The team's submission, while the build window is open. */
export async function submitHackathonEntry(_: FormResult, form: FormData): Promise<FormResult> {
  const email = await currentEmail();
  if (!email) return { message: "Log in again to submit." };
  if ((await phase()) !== "live") return { message: "Submissions are only open during the build window." };
  const { entry, errors } = parseEntry(form, HACKATHON.briefs.map((b) => b.id));
  if (Object.keys(errors).length) return { errors, message: "Check the fields marked above.", values: typed(form) };
  const limit = await checkRateLimit("hackathon_entry", { limit: 30, windowMinutes: 60, identity: email });
  if (!limit.allowed) return { message: "Too many saves in an hour. Please wait a few minutes.", values: typed(form) };
  const result = await saveEntry(email, entry);
  if (!result.ok) return { message: result.message, values: typed(form) };
  refresh();
  return { ok: true };
}

/** "Tell me when it opens." */
export async function notifyMeAboutHackathon(): Promise<{ ok: boolean }> {
  const email = await currentEmail();
  if (!email) return { ok: false };
  const ok = await addInterest(email);
  if (ok) revalidatePath("/hackathons");
  return { ok };
}
