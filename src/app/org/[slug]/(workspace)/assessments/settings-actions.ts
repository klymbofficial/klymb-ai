"use server";

import { revalidatePath } from "next/cache";
import { allowCompany } from "@/lib/company/access";
import { logCompany } from "@/lib/company/audit";
import { getWorkspaceMember } from "@/lib/company/auth";
import { DEFAULT_TIME_ZONE, canSchedule } from "@/lib/company/batch-rules";
import { companyCatalog } from "@/lib/company/catalog-data";
import { readBasic, readCandidate, readEmail, type TestSettings } from "@/lib/company/test-settings";
import { loadTestSettings, saveTestSettings } from "@/lib/company/test-settings-data";
import { db } from "@/lib/db/client";

/**
 * A company's settings for one test (U06a): the people who invite (admins
 * and recruiters) change them; everyone else reads. The company comes from
 * the signed-in member, and the test must be one this company has. Audit
 * entries name the settings that changed, never an email's words.
 */

export type SettingsResult = { ok: true; message: string; revision: number } | { ok: false; message: string };

const UNAVAILABLE = { ok: false as const, message: "That didn't save just now. Try again in a minute." };
const NOT_ALLOWED = { ok: false as const, message: "Only an admin or a recruiter in your company can change a test's settings. Try signing in again." };
const CHANGED = { ok: false as const, message: "Someone else changed these settings since you opened them. Reload to see theirs; your changes here are not saved." };

async function load(company: string, item: string, expected: number) {
  const member = typeof company === "string" ? await getWorkspaceMember(company) : null;
  if (!allowCompany(member, company) || !canSchedule(member)) return NOT_ALLOWED;
  if (typeof item !== "string" || !Number.isInteger(expected) || expected < 0) return CHANGED;
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const catalog = await companyCatalog(sql, member!.companyId);
  if (!catalog) return UNAVAILABLE;
  if (!catalog.some((e) => e.item.slug === item && e.item.kind === "assessment")) return { ok: false as const, message: "That test is no longer available." };
  const before = await loadTestSettings(sql, member!.companyId, item);
  if (!before) return UNAVAILABLE;
  return { member: member!, sql, before };
}

const changed = (before: TestSettings, after: Partial<TestSettings>) =>
  (Object.keys(after) as (keyof TestSettings)[]).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));

/** Access, end date (typed in India time) and tags. */
export async function saveBasicSettings(company: string, item: string, expected: number, form: Record<string, unknown>): Promise<SettingsResult> {
  const c = await load(company, item, expected);
  if ("ok" in c) return c;
  const read = readBasic(form ?? {}, DEFAULT_TIME_ZONE);
  if (!read.ok) return read;
  const out = await saveTestSettings(c.sql, { group: "basic", companyId: c.member.companyId, item, expected, by: c.member.email, ...read.value });
  if (!out) return UNAVAILABLE;
  if (out.status === "changed") return CHANGED;
  await logCompany(c.member, "company.test_settings_save", { item, group: "basic", revision: out.revision, changed: changed(c.before, read.value) });
  revalidatePath("/org/[slug]/(workspace)", "layout");
  return {
    ok: true,
    revision: out.revision,
    message: read.value.accessOpen ? "Saved." : "Saved. Access is off: nobody can be invited or start until you turn it on.",
  };
}

/** The automatic reminder and the invitation's own words. */
export async function saveEmailSettings(company: string, item: string, expected: number, form: Record<string, unknown>): Promise<SettingsResult> {
  const c = await load(company, item, expected);
  if ("ok" in c) return c;
  const read = readEmail(form ?? {});
  if (!read.ok) return read;
  const out = await saveTestSettings(c.sql, { group: "email", companyId: c.member.companyId, item, expected, by: c.member.email, ...read.value });
  if (!out) return UNAVAILABLE;
  if (out.status === "changed") return CHANGED;
  await logCompany(c.member, "company.test_settings_save", { item, group: "email", revision: out.revision, changed: changed(c.before, read.value) });
  revalidatePath("/org/[slug]/(workspace)", "layout");
  return { ok: true, revision: out.revision, message: read.value.invite ? "Saved. New invitations use your words." : "Saved. New invitations use the standard email." };
}

/** The cut-off (U06b) and the details asked before Start. */
export async function saveCandidateSettings(company: string, item: string, expected: number, form: Record<string, unknown>): Promise<SettingsResult> {
  const c = await load(company, item, expected);
  if ("ok" in c) return c;
  const read = readCandidate(form ?? {});
  if (!read.ok) return read;
  const out = await saveTestSettings(c.sql, { group: "candidate", companyId: c.member.companyId, item, expected, by: c.member.email, ...read.value });
  if (!out) return UNAVAILABLE;
  if (out.status === "changed") return CHANGED;
  await logCompany(c.member, "company.test_settings_save", { item, group: "candidate", revision: out.revision, changed: changed(c.before, read.value) });
  revalidatePath("/org/[slug]/(workspace)", "layout");
  return {
    ok: true,
    revision: out.revision,
    message: read.value.collect.length ? "Saved. People are asked these details before they start; anyone already started isn't asked." : "Saved.",
  };
}
