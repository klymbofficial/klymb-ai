import "server-only";
import { readRubric } from "@/lib/company/assessment-rules";
import {
  DIFFICULTIES,
  QUESTION_STATUSES,
  QUESTION_TYPES,
  type Difficulty,
  type LibraryQuestion,
  type McqOption,
  type QuestionInput,
  type QuestionStatus,
  type QuestionType,
} from "@/lib/company/library-rules";
import type { Db } from "@/lib/db/client";

/**
 * The question library (L1, migration 0088). Klymb's questions have no
 * owner; a company sees them once published. A company's own questions are
 * read and written only with that company's id, so another company's
 * question reads as not found. Every save names the revision it started
 * from and is refused when someone saved since.
 */

const UNDEFINED_TABLE = "42P01";

const fail = (what: string, error: { code?: string; message: string }) => {
  console.error(`library ${what} failed:`, error.code, error.message);
  return null;
};

type Row = {
  id: string; owner_company_id: string | null; type: string; title: string; statement: string; difficulty: string; tags: string[];
  points: number; minutes: number; options: unknown; partial: boolean; rubric: unknown; status: string; revision: number; updated_at: string;
  explanation?: string | null;
};

function readOptions(raw: unknown): McqOption[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.flatMap((o) => {
    const r = (o ?? {}) as Record<string, unknown>;
    return typeof r.text === "string" ? [{ text: r.text, correct: r.correct === true }] : [];
  });
}

function fromRow(r: Row): LibraryQuestion | null {
  if (!QUESTION_TYPES.includes(r.type as QuestionType) || !DIFFICULTIES.includes(r.difficulty as Difficulty)) return null;
  return {
    id: r.id,
    own: r.owner_company_id !== null,
    type: r.type as QuestionType,
    title: r.title,
    statement: r.statement,
    difficulty: r.difficulty as Difficulty,
    tags: r.tags ?? [],
    points: r.points,
    minutes: r.minutes,
    options: r.type === "mcq" ? readOptions(r.options) : null,
    partial: r.partial,
    rubric: r.type === "mcq" ? null : readRubric(r.rubric),
    status: QUESTION_STATUSES.includes(r.status as QuestionStatus) ? (r.status as QuestionStatus) : "draft",
    revision: r.revision,
    updatedAt: r.updated_at,
    explanation: r.explanation ?? null,
  };
}

const many = (rows: Row[] | null) => (rows ?? []).flatMap((r) => fromRow(r) ?? []);
const json = (v: unknown) => (v === null ? null : JSON.stringify(v));

/** Klymb's published questions, newest first. Empty before 0063; null on a database error. */
export async function klymbLibrary(sql: Db): Promise<LibraryQuestion[] | null> {
  const { data, error } = await sql.rows<Row>`
    select id, owner_company_id, type, title, statement, difficulty, tags, points, minutes, options, partial, rubric, status, revision, updated_at, explanation
      from course.library_questions
     where owner_company_id is null and status = 'published'
     order by updated_at desc limit 2000
  `;
  if (error) return error.code === UNDEFINED_TABLE ? [] : fail("klymb list", error);
  return many(data);
}

/** This company's own questions (not removed), newest first. Empty before 0063; null on a database error. */
export async function ownLibrary(sql: Db, companyId: string): Promise<LibraryQuestion[] | null> {
  const { data, error } = await sql.rows<Row>`
    select id, owner_company_id, type, title, statement, difficulty, tags, points, minutes, options, partial, rubric, status, revision, updated_at, explanation
      from course.library_questions
     where owner_company_id = ${companyId}::uuid and status <> 'retired'
     order by updated_at desc limit 2000
  `;
  if (error) return error.code === UNDEFINED_TABLE ? [] : fail("own list", error);
  return many(data);
}

/**
 * One question this company may open: Klymb's published, or its own (not
 * removed). Undefined when it can't; null on a database error.
 */
export async function libraryQuestion(sql: Db, companyId: string, id: string): Promise<LibraryQuestion | undefined | null> {
  if (!UUID.test(id)) return undefined;
  const { data, error } = await sql.row<Row>`
    select id, owner_company_id, type, title, statement, difficulty, tags, points, minutes, options, partial, rubric, status, revision, updated_at, explanation
      from course.library_questions
     where id = ${id}::uuid
       and ((owner_company_id is null and status = 'published') or (owner_company_id = ${companyId}::uuid and status <> 'retired'))
  `;
  if (error) return error.code === UNDEFINED_TABLE ? undefined : fail("read", error);
  return data ? (fromRow(data) ?? undefined) : undefined;
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Adds a question to this company's library, usable at once. Returns its id. */
export async function createOwnQuestion(sql: Db, c: { companyId: string; q: QuestionInput; by: string }): Promise<string | null> {
  const q = c.q;
  const { data, error } = await sql.row<{ id: string }>`
    insert into course.library_questions
      (owner_company_id, type, title, statement, difficulty, tags, points, minutes, options, partial, rubric, status, created_by, updated_by)
    values (${c.companyId}::uuid, ${q.type}, ${q.title}, ${q.statement}, ${q.difficulty}, ${q.tags}::text[], ${q.points}::int, ${q.minutes}::int,
            ${json(q.options)}::jsonb, ${q.partial}, ${json(q.rubric)}::jsonb, 'published', ${c.by}, ${c.by})
    returning id
  `;
  if (error) return fail("create", error);
  return data?.id ?? null;
}

type SaveResult = { status: "saved"; revision: number } | { status: "changed" } | null;

/** Saves this company's question when it is still at `expected`; "changed" when someone saved since or it isn't theirs. */
export async function saveOwnQuestion(sql: Db, s: { companyId: string; id: string; q: QuestionInput; expected: number; by: string }): Promise<SaveResult> {
  const q = s.q;
  const { data, error } = await sql.row<{ revision: number }>`
    update course.library_questions
       set type = ${q.type}, title = ${q.title}, statement = ${q.statement}, difficulty = ${q.difficulty}, tags = ${q.tags}::text[],
           points = ${q.points}::int, minutes = ${q.minutes}::int, options = ${json(q.options)}::jsonb, partial = ${q.partial},
           rubric = ${json(q.rubric)}::jsonb, revision = revision + 1, updated_by = ${s.by}, updated_at = now()
     where id = ${s.id}::uuid and owner_company_id = ${s.companyId}::uuid and status <> 'retired' and revision = ${s.expected}::int
    returning revision
  `;
  if (error) return fail("save", error);
  return data ? { status: "saved", revision: data.revision } : { status: "changed" };
}

/** Removes one of this company's questions from its library. Tests that copied it keep their copy. False when it isn't theirs. */
export async function removeOwnQuestion(sql: Db, r: { companyId: string; id: string; by: string }): Promise<boolean | null> {
  const { data, error } = await sql.run`
    update course.library_questions set status = 'retired', revision = revision + 1, updated_by = ${r.by}, updated_at = now()
     where id = ${r.id}::uuid and owner_company_id = ${r.companyId}::uuid and status <> 'retired'
  `;
  if (error) return fail("remove", error);
  return (data ?? 0) > 0;
}

// ── Klymb's library, for Klymb admins ────────────────────────────────────

/** Every Klymb question in any status, newest first. Null on a database error. */
export async function adminLibrary(sql: Db): Promise<LibraryQuestion[] | null> {
  const { data, error } = await sql.rows<Row>`
    select id, owner_company_id, type, title, statement, difficulty, tags, points, minutes, options, partial, rubric, status, revision, updated_at, explanation
      from course.library_questions
     where owner_company_id is null
     order by updated_at desc limit 2000
  `;
  if (error) return error.code === UNDEFINED_TABLE ? [] : fail("admin list", error);
  return many(data);
}

/** One Klymb question in any status. Undefined when there is none; null on a database error. */
export async function adminQuestion(sql: Db, id: string): Promise<LibraryQuestion | undefined | null> {
  if (!UUID.test(id)) return undefined;
  const { data, error } = await sql.row<Row>`
    select id, owner_company_id, type, title, statement, difficulty, tags, points, minutes, options, partial, rubric, status, revision, updated_at, explanation
      from course.library_questions where id = ${id}::uuid and owner_company_id is null
  `;
  if (error) return error.code === UNDEFINED_TABLE ? undefined : fail("admin read", error);
  return data ? (fromRow(data) ?? undefined) : undefined;
}

/** Adds a question to Klymb's library in `status`. Returns its id. */
export async function createKlymbQuestion(sql: Db, c: { q: QuestionInput; status: QuestionStatus; by: string }): Promise<string | null> {
  const q = c.q;
  const { data, error } = await sql.row<{ id: string }>`
    insert into course.library_questions
      (owner_company_id, type, title, statement, difficulty, tags, points, minutes, options, partial, rubric, status, created_by, updated_by)
    values (null, ${q.type}, ${q.title}, ${q.statement}, ${q.difficulty}, ${q.tags}::text[], ${q.points}::int, ${q.minutes}::int,
            ${json(q.options)}::jsonb, ${q.partial}, ${json(q.rubric)}::jsonb, ${c.status}, ${c.by}, ${c.by})
    returning id
  `;
  if (error) return fail("klymb create", error);
  return data?.id ?? null;
}

/** Saves a Klymb question and its status when it is still at `expected`. */
export async function saveKlymbQuestion(sql: Db, s: { id: string; q: QuestionInput; status: QuestionStatus; expected: number; by: string }): Promise<SaveResult> {
  const q = s.q;
  const { data, error } = await sql.row<{ revision: number }>`
    update course.library_questions
       set type = ${q.type}, title = ${q.title}, statement = ${q.statement}, difficulty = ${q.difficulty}, tags = ${q.tags}::text[],
           points = ${q.points}::int, minutes = ${q.minutes}::int, options = ${json(q.options)}::jsonb, partial = ${q.partial},
           rubric = ${json(q.rubric)}::jsonb, status = ${s.status}, revision = revision + 1, updated_by = ${s.by}, updated_at = now()
     where id = ${s.id}::uuid and owner_company_id is null and revision = ${s.expected}::int
    returning revision
  `;
  if (error) return fail("klymb save", error);
  return data ? { status: "saved", revision: data.revision } : { status: "changed" };
}
