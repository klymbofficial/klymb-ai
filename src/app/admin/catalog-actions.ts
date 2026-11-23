"use server";

import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/admin/auth";
import { logAdmin } from "@/lib/admin/audit";
import { parseProgram, parsePurposes, parseSkills, parseStatus, publishBlocked } from "@/lib/company/catalog";
import { loadCatalog, saveItemSettings, saveProgram, setGrant } from "@/lib/company/catalog-data";
import { db } from "@/lib/db/client";

export type CatalogResult = { ok: true; message: string } | { ok: false; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNAVAILABLE: CatalogResult = { ok: false, message: "Unavailable right now. Try again in a minute." };
const NOT_ALLOWED: CatalogResult = { ok: false, message: "Not authorised." };

/** Companies see the change on their next page, so their catalog pages are refreshed too. */
function refresh() {
  revalidatePath("/admin/catalog");
  revalidatePath("/org", "layout");
}

/** Any Klymb admin. Draft, published or retired, plus skill tags and purposes, for one item. */
export async function saveCatalogItem(slug: string, form: { status: string; skills: string; purposes: string[] }): Promise<CatalogResult> {
  const admin = await getAdmin();
  if (!admin) return NOT_ALLOWED;
  const status = parseStatus(form.status);
  if (!status.ok) return status;
  const skills = parseSkills(form.skills);
  if (!skills.ok) return skills;
  const purposes = parsePurposes(Array.isArray(form.purposes) ? form.purposes : []);
  if (!purposes.ok) return purposes;

  const sql = db();
  if (!sql) return UNAVAILABLE;
  const all = await loadCatalog(sql);
  if (!all) return UNAVAILABLE;
  const entry = all.get(slug);
  if (!entry) return { ok: false, message: "That item no longer exists." };
  if (status.value === "published") {
    const blocked = publishBlocked(entry, all);
    if (blocked) return { ok: false, message: blocked };
  }
  // Taking a step out of publication would leave a published program with a hole in it.
  if (status.value !== "published") {
    const holders = [...all.values()].filter((e) => e.status === "published" && e.item.kind === "program" && e.item.steps.includes(slug));
    if (holders.length) return { ok: false, message: `A published program uses it: ${holders.map((h) => h.item.title).join(", ")}. Unpublish the program first.` };
  }

  const saved = await saveItemSettings(sql, { slug, kind: entry.item.kind, status: status.value, skills: skills.value, purposes: purposes.value }, admin.email);
  if (saved === null) return UNAVAILABLE;
  if (!saved) return { ok: false, message: "That item no longer exists." };
  await logAdmin(admin, "catalog.item_save", slug, { status: status.value, skills: skills.value, purposes: purposes.value });
  refresh();
  return { ok: true, message: `Saved. ${entry.item.title} is ${status.value === "published" ? "published" : status.value === "retired" ? "retired" : "a draft"}.` };
}

/** Any Klymb admin. Creates a program as a draft, or changes an existing one's title, summary and steps. */
export async function saveCatalogProgram(form: { slug: string; title: string; summary: string; steps: string }): Promise<CatalogResult> {
  const admin = await getAdmin();
  if (!admin) return NOT_ALLOWED;
  const program = parseProgram(form);
  if (!program.ok) return program;

  const sql = db();
  if (!sql) return UNAVAILABLE;
  const all = await loadCatalog(sql);
  if (!all) return UNAVAILABLE;
  const current = all.get(program.value.slug);
  if (current && current.item.kind !== "program") return { ok: false, message: `"${program.value.slug}" is already used. Choose another URL name.` };
  if (current?.status === "published") {
    // A published program can only gain steps that are published too.
    const drafts = program.value.steps.filter((step) => all.get(step)?.status !== "published");
    if (drafts.length) return { ok: false, message: `The program is published. Publish its steps first: ${drafts.join(", ")}.` };
  }

  const saved = await saveProgram(sql, program.value, admin.email);
  if (saved === null) return UNAVAILABLE;
  if (!saved) return { ok: false, message: `"${program.value.slug}" is already used. Choose another URL name.` };
  await logAdmin(admin, "catalog.program_save", program.value.slug, { title: program.value.title, steps: program.value.steps, created: !current });
  refresh();
  return { ok: true, message: current ? "Program saved." : "Program created as a draft. Publish it once its steps are published." };
}

/** Any Klymb admin. Gives a company an item, or takes it back. */
export async function setCatalogGrant(companyId: string, slug: string, granted: boolean): Promise<CatalogResult> {
  const admin = await getAdmin();
  if (!admin) return NOT_ALLOWED;
  if (!UUID.test(companyId)) return { ok: false, message: "That company no longer exists." };

  const sql = db();
  if (!sql) return UNAVAILABLE;
  const all = await loadCatalog(sql);
  if (!all) return UNAVAILABLE;
  if (!all.has(slug)) return { ok: false, message: "That item no longer exists." };

  const changed = await setGrant(sql, companyId, slug, granted, admin.email);
  if (changed === null) return UNAVAILABLE;
  if (changed) await logAdmin(admin, granted ? "catalog.grant" : "catalog.revoke", companyId, { item: slug });
  refresh();
  return { ok: true, message: granted ? "Given to the company." : "Taken back." };
}
