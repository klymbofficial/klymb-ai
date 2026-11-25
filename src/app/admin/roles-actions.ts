"use server";

import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/admin/auth";
import { logAdmin } from "@/lib/admin/audit";
import { readSkills } from "@/lib/company/auto-test";
import { saveRole } from "@/lib/company/roles-data";
import { db } from "@/lib/db/client";

export type RoleResult = { ok: true; message: string; revision: number } | { ok: false; message: string };

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * A job role for automatic tests (P0.4, 0068), for any Klymb admin: its name,
 * a line about it, the skills (Library tags) its questions come from, its
 * order and whether companies see it. New roles take expected 0.
 */
export async function saveJobRole(expected: number, form: Record<string, unknown>): Promise<RoleResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, message: "Not authorised." };
  const slug = typeof form.slug === "string" ? form.slug.trim().toLowerCase() : "";
  const label = typeof form.label === "string" ? form.label.trim().replace(/\s+/g, " ") : "";
  const summary = typeof form.summary === "string" ? form.summary.trim().replace(/\s+/g, " ") : "";
  const skills = readSkills(form.skills);
  const status = form.status === "hidden" ? "hidden" : "active";
  const sort = Number(form.sort);
  if (!SLUG.test(slug) || slug.length > 60) return { ok: false, message: "The key is lowercase letters, digits and dashes, e.g. backend-developer." };
  if (!label || label.length > 80) return { ok: false, message: "Give the role a name under 80 characters." };
  if (summary.length > 300) return { ok: false, message: "Keep the line about it under 300 characters." };
  if (!skills.length) return { ok: false, message: "List at least one skill, matching the Library's tags." };
  if (!Number.isInteger(sort) || sort < 0 || sort > 10000) return { ok: false, message: "Order is a whole number." };
  if (!Number.isInteger(expected) || expected < 0) return { ok: false, message: "Reload and try again." };
  const sql = db();
  if (!sql) return { ok: false, message: "Unavailable right now. Try again in a minute." };
  const out = await saveRole(sql, { slug, label, summary, skills, status, sort, expected, by: admin.email });
  if (!out) return { ok: false, message: "Unavailable right now. Try again in a minute." };
  if (out.status === "exists") return { ok: false, message: "A role with that key already exists." };
  if (out.status !== "saved") return { ok: false, message: "Someone saved this role since you opened it. Reload to see it." };
  await logAdmin(admin, "catalog.role_save", slug, { revision: out.revision, status, skills: skills.length });
  revalidatePath("/admin/catalog/roles");
  return { ok: true, message: `Saved (revision ${out.revision}).`, revision: out.revision };
}
