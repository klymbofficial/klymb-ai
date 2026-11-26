"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { allowCompany, isAdmin } from "@/lib/company/access";
import { getWorkspaceMember } from "@/lib/company/auth";
import { savePassword } from "@/lib/company/password";
import type { ChangeField } from "@/lib/company/password-rules";
import { saveAccountUpdates, saveCompanyDetails, saveCompanySwitch, saveMyProfile, signOutOthers } from "@/lib/company/settings-data";
import { isCompanySwitch, readCompanyDetails, readProfile } from "@/lib/company/settings-rules";
import { db } from "@/lib/db/client";

export type PasswordFormState =
  | { ok: true; message: string }
  | { ok: false; field?: ChangeField; message: string }
  | null;

/**
 * Sets or changes the signed-in member's password. Who they are and how this
 * session signed in come from the session and their membership of this
 * workspace, never from the form.
 */
export async function changeMyPassword(slug: string, _prev: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const member = await getWorkspaceMember(slug);
  if (!allowCompany(member, slug)) return { ok: false, message: "You're signed out. Sign in again, then try once more." };
  const session = await auth();
  const result = await savePassword({
    email: member.email,
    signInMethod: session?.user?.signInMethod,
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!result.ok) return { ok: false, field: result.field, message: result.error };
  revalidatePath(`/org/${member.companySlug}/settings/security`);
  return { ok: true, message: "Password saved. Use it next time you sign in." };
}

export type SettingsResult = { ok: true; message: string } | { ok: false; field?: string; message: string };

const SIGNED_OUT = { ok: false, message: "You're signed out. Sign in again, then try once more." } as const;
const NOT_SAVED = { ok: false, message: "That didn't save. Try again in a minute." } as const;
const ADMINS_ONLY = { ok: false, message: "Only your company's admins can change this." } as const;

/** The signed-in member of this workspace; the company and email never come from the form. */
async function me(slug: string) {
  const member = await getWorkspaceMember(slug);
  const sql = db();
  return allowCompany(member, slug) && sql ? { member, sql } : null;
}

export async function saveMyDetails(slug: string, raw: Record<string, unknown>): Promise<SettingsResult> {
  const ctx = await me(slug);
  if (!ctx) return SIGNED_OUT;
  const read = readProfile(raw);
  if (!read.ok) return read;
  if (!(await saveMyProfile(ctx.sql, ctx.member.companyId, ctx.member.email, read.value))) return NOT_SAVED;
  // The name also shows on Team.
  revalidatePath(`/org/${ctx.member.companySlug}/settings/personal`);
  revalidatePath(`/org/${ctx.member.companySlug}/teams`);
  return { ok: true, message: "Saved." };
}

export async function saveMyEmailUpdates(slug: string, on: boolean): Promise<SettingsResult> {
  const ctx = await me(slug);
  if (!ctx) return SIGNED_OUT;
  if (!(await saveAccountUpdates(ctx.sql, ctx.member.companyId, ctx.member.email, on === true))) return NOT_SAVED;
  revalidatePath(`/org/${ctx.member.companySlug}/settings/email`);
  return { ok: true, message: on ? "You'll get the biweekly account updates." : "You won't get the biweekly account updates." };
}

export async function saveCompanyInfo(slug: string, raw: Record<string, unknown>): Promise<SettingsResult> {
  const ctx = await me(slug);
  if (!ctx) return SIGNED_OUT;
  if (!isAdmin(ctx.member)) return ADMINS_ONLY;
  const read = readCompanyDetails(raw);
  if (!read.ok) return read;
  if (!(await saveCompanyDetails(ctx.sql, ctx.member.companyId, read.value))) return NOT_SAVED;
  revalidatePath(`/org/${ctx.member.companySlug}/settings/company`);
  return { ok: true, message: "Company details saved." };
}

export async function saveCompanySetting(slug: string, key: unknown, on: boolean): Promise<SettingsResult> {
  const ctx = await me(slug);
  if (!ctx) return SIGNED_OUT;
  if (!isAdmin(ctx.member)) return ADMINS_ONLY;
  if (!isCompanySwitch(key)) return { ok: false, message: "That isn't a setting here." };
  if (!(await saveCompanySwitch(ctx.sql, ctx.member.companyId, key, on === true))) return NOT_SAVED;
  revalidatePath(`/org/${ctx.member.companySlug}/settings/${key === "eeo_survey" ? "eeo" : "diversity"}`);
  return { ok: true, message: on ? "Turned on." : "Turned off." };
}

/** Signs out every other session of this person on company pages; this one stays signed in. */
export async function logOutOtherSessions(slug: string): Promise<SettingsResult> {
  const ctx = await me(slug);
  if (!ctx) return SIGNED_OUT;
  const sid = (await auth())?.user?.sid;
  if (!sid) return { ok: false, message: "This session is too old to keep while signing out the others. Sign out, sign back in, then press it again." };
  if (!(await signOutOthers(ctx.sql, ctx.member.email, sid))) return NOT_SAVED;
  return { ok: true, message: "Done. Every other session is signed out; this one stays signed in." };
}
