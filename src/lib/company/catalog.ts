/**
 * The business catalog's rules: what each company may see, how people narrow
 * it down, and what a Klymb admin may save. Pure, so it can be tested; the
 * database side is src/lib/company/catalog-data.ts and the item details are
 * src/data/business-catalog.ts.
 *
 * A company sees an item only when it is published and granted to that
 * company, directly or as a step of a published program granted to it.
 * Drafts and retired items never reach a company page, whoever is looking.
 */
import {
  CATALOG_KINDS,
  CATALOG_PURPOSES,
  CODE_ITEMS,
  codeItem,
  type CatalogKind,
  type CatalogPurpose,
  type CodeItem,
} from "@/data/business-catalog";
import { hasRole, type CompanyMember, type CompanyRole } from "@/lib/company/access";

export const CATALOG_STATUSES = ["draft", "published", "retired"] as const;
export type CatalogStatus = (typeof CATALOG_STATUSES)[number];
export const STATUS_LABEL: Record<CatalogStatus, string> = { draft: "Draft", published: "Published", retired: "Retired" };

/** A row of course.catalog_items as read. */
export interface CatalogRow {
  slug: string;
  kind: string;
  status: string;
  skills: string[] | null;
  purposes: string[] | null;
  title: string | null;
  summary: string | null;
  steps: string[] | null;
}

/** A program: other items in an order, kept only in the database. */
export interface ProgramItem {
  kind: "program";
  slug: string;
  title: string;
  summary: string | null;
  /** Course and assessment slugs, in order. */
  steps: string[];
  author: string;
}

export type CatalogItem = CodeItem | ProgramItem;

export interface CatalogEntry {
  item: CatalogItem;
  status: CatalogStatus;
  skills: string[];
  purposes: CatalogPurpose[];
}

type Result<T> = { ok: true; value: T } | { ok: false; message: string };

const isStatus = (s: unknown): s is CatalogStatus => CATALOG_STATUSES.includes(s as CatalogStatus);
const isPurpose = (s: unknown): s is CatalogPurpose => CATALOG_PURPOSES.includes(s as CatalogPurpose);
const isKind = (s: unknown): s is CatalogKind => CATALOG_KINDS.includes(s as CatalogKind);

/** A step a program may hold: a Klymb course or assessment, never another program. */
const stepSlugs = (steps: readonly string[] | null) => [...new Set((steps ?? []).filter((s) => codeItem(s) !== undefined))];

/**
 * Every item with its saved state, keyed by slug. A Klymb item nobody has
 * saved yet is a draft with its suggested tags. A row whose kind doesn't
 * match the code, or that names an item no longer in the code, is left out.
 */
export function readCatalog(rows: readonly CatalogRow[], code: readonly CodeItem[] = CODE_ITEMS): Map<string, CatalogEntry> {
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const all = new Map<string, CatalogEntry>();
  for (const item of code) {
    const row = bySlug.get(item.slug);
    const saved = row && row.kind === item.kind ? row : undefined;
    all.set(item.slug, {
      item,
      status: saved && isStatus(saved.status) ? saved.status : "draft",
      skills: saved ? (saved.skills ?? []) : [...item.suggestedSkills],
      purposes: saved ? (saved.purposes ?? []).filter(isPurpose) : [...item.suggestedPurposes],
    });
  }
  for (const row of rows) {
    if (row.kind !== "program" || all.has(row.slug) || !row.title) continue;
    all.set(row.slug, {
      item: { kind: "program", slug: row.slug, title: row.title, summary: row.summary, steps: stepSlugs(row.steps), author: "Klymb" },
      status: isStatus(row.status) ? row.status : "draft",
      skills: row.skills ?? [],
      purposes: (row.purposes ?? []).filter(isPurpose),
    });
  }
  return all;
}

/**
 * What one company may see: published items granted to it, and the
 * published steps of a published program granted to it. Programs first, then
 * Klymb items in catalog order. A program lists only the steps it can show.
 */
export function visibleCatalog(all: ReadonlyMap<string, CatalogEntry>, granted: ReadonlySet<string>): CatalogEntry[] {
  const published = (slug: string) => all.get(slug)?.status === "published";
  const visible = new Set<string>();
  for (const [slug, entry] of all) {
    if (!published(slug) || !granted.has(slug)) continue;
    visible.add(slug);
    if (entry.item.kind === "program") for (const step of entry.item.steps) if (published(step)) visible.add(step);
  }
  const out: CatalogEntry[] = [];
  for (const [slug, entry] of all) {
    if (!visible.has(slug)) continue;
    out.push(entry.item.kind === "program" ? { ...entry, item: { ...entry.item, steps: entry.item.steps.filter(published) } } : entry);
  }
  return [...out.filter((e) => e.item.kind === "program"), ...out.filter((e) => e.item.kind !== "program")];
}

// ── Finding things ───────────────────────────────────────────────────────

/** Choosing what people learn or are tested on. Employees and candidates see only what they are given. */
export const CATALOG_ROLES = ["admin", "company_head", "team_lead", "recruiter", "reviewer"] as const satisfies readonly CompanyRole[];
export const seesCatalog = (member: CompanyMember | null): boolean => hasRole(member, CATALOG_ROLES);

/** Where the catalog opens: hiring for someone who only hires, upskilling for a lead, everything otherwise. */
export function defaultPurpose(member: CompanyMember): CatalogPurpose | null {
  if (hasRole(member, ["admin", "company_head"])) return null;
  if (hasRole(member, ["team_lead"])) return "workforce";
  if (hasRole(member, ["recruiter", "reviewer"])) return "hiring";
  return null;
}

export interface CatalogFilters {
  purpose: CatalogPurpose | null;
  kind: CatalogKind | null;
  skill: string | null;
  q: string | null;
}

const one = (v: unknown) => (Array.isArray(v) ? v[0] : v);

/** The filters in a catalog URL. Anything unknown is ignored; `purpose=all` asks for everything. */
export function readFilters(params: Record<string, unknown>, fallbackPurpose: CatalogPurpose | null): CatalogFilters {
  const purpose = one(params.purpose);
  const kind = one(params.kind);
  const skill = one(params.skill);
  const q = one(params.q);
  return {
    purpose: purpose === "all" ? null : isPurpose(purpose) ? purpose : fallbackPurpose,
    kind: isKind(kind) ? kind : null,
    skill: typeof skill === "string" && skill.trim() ? skill.trim().slice(0, 40) : null,
    q: typeof q === "string" && q.trim() ? q.trim().slice(0, 80) : null,
  };
}

const fold = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export function filterCatalog(entries: readonly CatalogEntry[], f: CatalogFilters): CatalogEntry[] {
  return entries.filter((e) => {
    if (f.purpose && !e.purposes.includes(f.purpose)) return false;
    if (f.kind && e.item.kind !== f.kind) return false;
    if (f.skill && !e.skills.some((s) => fold(s) === fold(f.skill!))) return false;
    if (f.q) {
      const words = [e.item.title, e.item.summary ?? "", ...e.skills, "audience" in e.item ? e.item.audience : ""].map(fold).join(" ");
      if (!fold(f.q).split(" ").every((w) => words.includes(w))) return false;
    }
    return true;
  });
}

/** Every skill tag on these entries, once each, in alphabetical order. */
export function skillOptions(entries: readonly CatalogEntry[]): string[] {
  const seen = new Map<string, string>();
  for (const e of entries) for (const s of e.skills) if (!seen.has(fold(s))) seen.set(fold(s), s);
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

// ── What a Klymb admin may save ─────────────────────────────────────────

export const MAX_SKILLS = 12;

/** Tags typed as a comma- or line-separated list: trimmed, at most 40 characters, once each. */
export function parseSkills(raw: unknown): Result<string[]> {
  if (typeof raw !== "string") return { ok: false, message: "Skills are missing." };
  const out = new Map<string, string>();
  for (const part of raw.split(/[,\n]/)) {
    const tag = part.replace(/\s+/g, " ").trim();
    if (!tag) continue;
    if (tag.length > 40) return { ok: false, message: `"${tag.slice(0, 20)}…" is too long for a skill. Keep each under 40 characters.` };
    if (!out.has(fold(tag))) out.set(fold(tag), tag);
  }
  if (out.size > MAX_SKILLS) return { ok: false, message: `Use at most ${MAX_SKILLS} skills.` };
  return { ok: true, value: [...out.values()] };
}

export function parsePurposes(raw: readonly unknown[]): Result<CatalogPurpose[]> {
  if (!raw.every(isPurpose)) return { ok: false, message: "Choose upskilling, hiring or both." };
  return { ok: true, value: CATALOG_PURPOSES.filter((p) => raw.includes(p)) };
}

export function parseStatus(raw: unknown): Result<CatalogStatus> {
  return isStatus(raw) ? { ok: true, value: raw } : { ok: false, message: "Choose draft, published or retired." };
}

const SLUG = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

export interface ProgramInput {
  slug: string;
  title: string;
  summary: string | null;
  steps: string[];
}

/**
 * A program as typed: a URL name no Klymb item uses, a title, an optional
 * summary, and its steps as course or assessment URL names, one per line,
 * in order, each once.
 */
export function parseProgram(form: { slug: unknown; title: unknown; summary: unknown; steps: unknown }): Result<ProgramInput> {
  const slug = typeof form.slug === "string" ? form.slug.trim().toLowerCase() : "";
  if (!SLUG.test(slug)) return { ok: false, message: "The URL name needs 3 to 64 lowercase letters, numbers and dashes." };
  if (codeItem(slug)) return { ok: false, message: `"${slug}" is already a course or assessment. Choose another URL name.` };
  const title = typeof form.title === "string" ? form.title.replace(/\s+/g, " ").trim() : "";
  if (!title || title.length > 120) return { ok: false, message: "Give the program a title of up to 120 characters." };
  const summaryText = typeof form.summary === "string" ? form.summary.trim() : "";
  if (summaryText.length > 600) return { ok: false, message: "Keep the summary under 600 characters." };
  const lines = typeof form.steps === "string" ? form.steps.split(/[\n,]/).map((s) => s.trim().toLowerCase()).filter(Boolean) : [];
  if (lines.length === 0) return { ok: false, message: "Add at least one step." };
  if (lines.length > 50) return { ok: false, message: "A program can have at most 50 steps." };
  const unknown = lines.filter((s) => !codeItem(s));
  if (unknown.length) return { ok: false, message: `Not a course or assessment: ${unknown.join(", ")}.` };
  if (new Set(lines).size !== lines.length) return { ok: false, message: "Each step can appear once." };
  return { ok: true, value: { slug, title, summary: summaryText || null, steps: lines } };
}

/** Why an item can't be published yet, or null. A program needs steps, all of them published. */
export function publishBlocked(entry: CatalogEntry, all: ReadonlyMap<string, CatalogEntry>): string | null {
  if (entry.item.kind !== "program") return null;
  if (entry.item.steps.length === 0) return "Add a step before publishing the program.";
  const drafts = entry.item.steps.filter((s) => all.get(s)?.status !== "published");
  return drafts.length ? `Publish its steps first: ${drafts.join(", ")}.` : null;
}

/** The course or assessment a program step names, or null. */
export const stepItem = (slug: string): CodeItem | null => codeItem(slug) ?? null;
