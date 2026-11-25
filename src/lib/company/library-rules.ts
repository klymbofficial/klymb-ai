/**
 * The question library's rules (L1, LIBRARY_PROPOSAL.txt): what a question
 * holds, how one is checked before saving, and how the Library page narrows
 * the list. Pure, so it can be tested; the database side is
 * src/lib/company/library-data.ts.
 *
 * Two libraries: Klymb's (every company sees its published questions) and
 * each company's own (only that company sees it). Only the question types a
 * candidate can answer here are offered: multiple choice, written, and
 * written with files.
 */
import { hasRole, type CompanyMember } from "@/lib/company/access";
import { TEST_WRITERS, readCriteria, seesAssessments, type Criterion } from "@/lib/company/assessment-rules";

export const QUESTION_TYPES = ["mcq", "written", "written_file"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];
export const TYPE_LABEL: Record<QuestionType, string> = { mcq: "Multiple choice", written: "Written", written_file: "Written + files" };

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

export const QUESTION_STATUSES = ["draft", "published", "retired"] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export const LIB_LIMITS = {
  title: 160,
  statement: 6000,
  optionsMin: 2,
  optionsMax: 8,
  option: 500,
  tags: 10,
  tag: 40,
  points: 100,
  minutes: 120,
} as const;

/** Who opens the Library: the people who see Assessments. */
export const seesLibrary = (member: CompanyMember | null): boolean => seesAssessments(member);
/** Who writes questions in the company's own library: the people who write its tests. */
export const canWriteQuestions = (member: CompanyMember | null): boolean => hasRole(member, TEST_WRITERS);

export interface McqOption {
  text: string;
  correct: boolean;
}

/** What a person writes; everything a question holds apart from who and when. */
export interface QuestionInput {
  type: QuestionType;
  title: string;
  statement: string;
  difficulty: Difficulty;
  tags: string[];
  /** A multiple-choice question's worth; a written one's is its rubric's total. */
  points: number;
  minutes: number;
  /** Multiple choice only. */
  options: McqOption[] | null;
  /** Multiple choice with several correct options only: partial marks. */
  partial: boolean;
  /** Written questions only. */
  rubric: Criterion[] | null;
}

export interface LibraryQuestion extends QuestionInput {
  id: string;
  /** This company's own (My Library), not Klymb's. */
  own: boolean;
  status: QuestionStatus;
  revision: number;
  updatedAt: string;
  /** Why the right options are right (Klymb's bank, 0068); for test writers and reviewers, never candidates. */
  explanation?: string | null;
}

type Result<T> = { ok: true; value: T } | { ok: false; message: string };

const text = (v: unknown) => (typeof v === "string" ? v.replace(/\r\n?/g, "\n").trim() : "");
const line = (v: unknown) => text(v).replace(/\s+/g, " ");
const isType = (v: unknown): v is QuestionType => QUESTION_TYPES.includes(v as QuestionType);
const isDifficulty = (v: unknown): v is Difficulty => DIFFICULTIES.includes(v as Difficulty);

/** True when more than one option is correct: the candidate picks all that apply. */
export const isMulti = (q: Pick<QuestionInput, "options">) => (q.options ?? []).filter((o) => o.correct).length > 1;

/** Tags from a list or a comma-separated line: trimmed, no repeats (ignoring case), at most 10. */
export function readTags(raw: unknown): Result<string[]> {
  const parts = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
  const tags: string[] = [];
  for (const p of parts) {
    const t = line(p);
    if (!t) continue;
    if (t.length > LIB_LIMITS.tag) return { ok: false, message: `Keep each tag under ${LIB_LIMITS.tag} characters.` };
    if (!tags.some((x) => x.toLowerCase() === t.toLowerCase())) tags.push(t);
  }
  if (tags.length > LIB_LIMITS.tags) return { ok: false, message: `Use at most ${LIB_LIMITS.tags} tags.` };
  return { ok: true, value: tags };
}

/**
 * A complete question from the form, or what's missing. A library question
 * is always complete: it can be added to a test as it stands.
 */
export function readQuestion(raw: Record<string, unknown>): Result<QuestionInput> {
  const type = raw.type;
  if (!isType(type)) return { ok: false, message: "Choose the question type." };
  const title = line(raw.title);
  if (!title) return { ok: false, message: "Give the question a title." };
  if (title.length > LIB_LIMITS.title) return { ok: false, message: `Keep the title under ${LIB_LIMITS.title} characters.` };
  const statement = text(raw.statement);
  if (!statement) return { ok: false, message: "Write the question." };
  if (statement.length > LIB_LIMITS.statement) return { ok: false, message: `Keep the question under ${LIB_LIMITS.statement} characters.` };
  if (!isDifficulty(raw.difficulty)) return { ok: false, message: "Choose a difficulty." };
  const tags = readTags(raw.tags);
  if (!tags.ok) return tags;
  const minutes = Number(raw.minutes);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > LIB_LIMITS.minutes) {
    return { ok: false, message: `Recommended time is a whole number of minutes from 1 to ${LIB_LIMITS.minutes}.` };
  }
  const base = { type, title, statement, difficulty: raw.difficulty, tags: tags.value, minutes };

  if (type === "mcq") {
    if (!Array.isArray(raw.options)) return { ok: false, message: "The options didn't arrive. Reload and try again." };
    const options: McqOption[] = [];
    for (const [i, o] of (raw.options as unknown[]).entries()) {
      const r = (o ?? {}) as Record<string, unknown>;
      const t = text(r.text);
      if (!t) return { ok: false, message: `Option ${i + 1} is empty. Write it or remove it.` };
      if (t.length > LIB_LIMITS.option) return { ok: false, message: `Option ${i + 1}: keep it under ${LIB_LIMITS.option} characters.` };
      options.push({ text: t, correct: r.correct === true });
    }
    if (options.length < LIB_LIMITS.optionsMin || options.length > LIB_LIMITS.optionsMax) {
      return { ok: false, message: `A multiple-choice question has ${LIB_LIMITS.optionsMin} to ${LIB_LIMITS.optionsMax} options.` };
    }
    const seen = options.map((o) => o.text.toLowerCase());
    if (new Set(seen).size !== seen.length) return { ok: false, message: "Two options say the same thing." };
    const correct = options.filter((o) => o.correct).length;
    if (correct === 0) return { ok: false, message: "Mark at least one option as correct." };
    if (correct === options.length) return { ok: false, message: "At least one option must be wrong." };
    const points = Number(raw.points);
    if (!Number.isInteger(points) || points < 1 || points > LIB_LIMITS.points) {
      return { ok: false, message: `Points are a whole number from 1 to ${LIB_LIMITS.points}.` };
    }
    // Partial marks only make sense when there is more than one right answer.
    const partial = correct > 1 && raw.partial === true;
    return { ok: true, value: { ...base, points, options, partial, rubric: null } };
  }

  const rubric = readCriteria(raw.rubric, "Area");
  if (!rubric.ok) return rubric;
  if (rubric.value.length === 0) return { ok: false, message: "Add at least one scoring area." };
  const unnamed = rubric.value.findIndex((c) => !c.title);
  if (unnamed >= 0) return { ok: false, message: `Area ${unnamed + 1}: give it a name.` };
  const points = rubric.value.reduce((s, c) => s + c.points, 0);
  return { ok: true, value: { ...base, points, options: null, partial: false, rubric: rubric.value } };
}

// ── The Library page ─────────────────────────────────────────────────────

export const PAGE_SIZE = 20;
export type LibraryTab = "klymb" | "mine";

export interface LibraryFilters {
  tab: LibraryTab;
  types: QuestionType[];
  difficulties: Difficulty[];
  tag: string | null;
  q: string | null;
  page: number;
}

const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v === undefined ? [] : [v]);
const one = (v: string | string[] | undefined) => all(v)[0];

/** The filters in a Library URL; anything unknown is dropped. */
export function readLibraryFilters(sp: Record<string, string | string[] | undefined>): LibraryFilters {
  const q = line(one(sp.q)).slice(0, 120) || null;
  const tag = line(one(sp.tag)).slice(0, LIB_LIMITS.tag) || null;
  const page = Number(one(sp.page));
  return {
    tab: one(sp.tab) === "mine" ? "mine" : "klymb",
    types: QUESTION_TYPES.filter((t) => all(sp.type).includes(t)),
    difficulties: DIFFICULTIES.filter((d) => all(sp.difficulty).includes(d)),
    tag,
    q,
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

/** The Library URL for these filters. */
export function libraryHref(base: string, f: LibraryFilters, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams();
  if (f.tab === "mine") p.set("tab", "mine");
  for (const t of f.types) p.append("type", t);
  for (const d of f.difficulties) p.append("difficulty", d);
  if (f.tag) p.set("tag", f.tag);
  if (f.q) p.set("q", f.q);
  if (f.page > 1) p.set("page", String(f.page));
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}

/** The questions that match, in the order given (newest first from the database). Search reads the title, statement and tags. */
export function filterQuestions(list: readonly LibraryQuestion[], f: Pick<LibraryFilters, "types" | "difficulties" | "tag" | "q">): LibraryQuestion[] {
  const words = (f.q ?? "").toLowerCase().split(" ").filter(Boolean);
  const tag = f.tag?.toLowerCase();
  return list.filter((q) => {
    if (f.types.length && !f.types.includes(q.type)) return false;
    if (f.difficulties.length && !f.difficulties.includes(q.difficulty)) return false;
    if (tag && !q.tags.some((t) => t.toLowerCase() === tag)) return false;
    if (words.length) {
      const hay = `${q.title} ${q.statement} ${q.tags.join(" ")}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
}

/** How many questions of each type, for the filter's counts. */
export function typeCounts(list: readonly LibraryQuestion[]): Record<QuestionType, number> {
  const out = { mcq: 0, written: 0, written_file: 0 };
  for (const q of list) out[q.type] += 1;
  return out;
}

/** Every tag in use, sorted, each once (first spelling wins). */
export function tagOptions(list: readonly LibraryQuestion[]): string[] {
  const seen = new Map<string, string>();
  for (const q of list) for (const t of q.tags) if (!seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), t);
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/** One page of a list, and how many pages there are (at least one). */
export function pageOf<T>(list: readonly T[], page: number): { items: T[]; page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const p = Math.min(Math.max(1, page), pages);
  return { items: list.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE), page: p, pages };
}
