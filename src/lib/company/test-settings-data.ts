import "server-only";
import { DEFAULT_SETTINGS, DETAIL_KEYS, type DetailField, type Proctoring, type TestSettings } from "@/lib/company/test-settings";
import type { Db } from "@/lib/db/client";

/**
 * A company's settings for its tests (U06a, migration 0065). Every query
 * names the company, so one company never reads or writes another's. No row
 * means the defaults. Saves name the revision they read (0 before the first
 * save) and are refused when someone saved since.
 */

const UNDEFINED_TABLE = "42P01";

const fail = (what: string, error: { code?: string; message: string }) => {
  console.error(`test settings ${what} failed:`, error.code, error.message);
  return null;
};

type Row = {
  item_slug: string; access_open: boolean; ends_on: string | null; tags: string[]; auto_remind: boolean;
  invite_subject: string | null; invite_body: string | null; revision: number; updated_by: string; updated_at: string;
  cutoff_percent?: number | null; collect?: string[] | null;
  proctor_fullscreen?: boolean; proctor_tabs?: boolean; proctor_copy?: boolean; proctor_webcam?: boolean; proctor_limit?: number | null;
};

const iso = (v: string | Date | null) => (v === null ? null : new Date(v).toISOString());
const fromRow = (r: Row): TestSettings => ({
  accessOpen: r.access_open,
  endsOn: iso(r.ends_on),
  tags: r.tags ?? [],
  autoRemind: r.auto_remind,
  invite: r.invite_subject !== null && r.invite_body !== null ? { subject: r.invite_subject, body: r.invite_body } : null,
  cutoffPercent: r.cutoff_percent ?? null,
  collect: DETAIL_KEYS.filter((k) => (r.collect ?? []).includes(k)),
  proctor: { fullscreen: !!r.proctor_fullscreen, tabs: !!r.proctor_tabs, copy: !!r.proctor_copy, webcam: !!r.proctor_webcam, limit: r.proctor_limit ?? null },
  revision: r.revision,
  updatedBy: r.updated_by,
  updatedAt: iso(r.updated_at),
});

/** This company's settings for one test; the defaults when none are saved. Null on a database error. */
export async function loadTestSettings(sql: Db, companyId: string, item: string): Promise<TestSettings | null> {
  const { data, error } = await sql.row<Row>`
    select item_slug, access_open, ends_on, tags, auto_remind, invite_subject, invite_body, cutoff_percent, collect, proctor_fullscreen, proctor_tabs, proctor_copy, proctor_webcam, proctor_limit, revision, updated_by, updated_at
      from course.company_test_settings where company_id = ${companyId}::uuid and item_slug = ${item}
  `;
  if (error) return error.code === UNDEFINED_TABLE ? { ...DEFAULT_SETTINGS } : fail("read", error);
  return data ? fromRow(data) : { ...DEFAULT_SETTINGS };
}

/** This company's saved settings, by test. Tests with none are left out. Null on a database error. */
export async function companyTestSettings(sql: Db, companyId: string): Promise<Map<string, TestSettings> | null> {
  const { data, error } = await sql.rows<Row>`
    select item_slug, access_open, ends_on, tags, auto_remind, invite_subject, invite_body, cutoff_percent, collect, proctor_fullscreen, proctor_tabs, proctor_copy, proctor_webcam, proctor_limit, revision, updated_by, updated_at
      from course.company_test_settings where company_id = ${companyId}::uuid
  `;
  if (error) return error.code === UNDEFINED_TABLE ? new Map() : fail("list", error);
  return new Map((data ?? []).map((r) => [r.item_slug, fromRow(r)]));
}

export type SaveSettingsResult = { status: "saved"; revision: number } | { status: "changed" } | null;

/**
 * Saves one group of settings, the rest kept as they are. `expected` 0 makes
 * the row (with the defaults for the other group); otherwise the row must
 * still be at `expected`.
 */
export async function saveTestSettings(
  sql: Db,
  s: { companyId: string; item: string; expected: number; by: string } & (
    | { group: "basic"; accessOpen: boolean; endsOn: string | null; tags: string[] }
    | { group: "email"; autoRemind: boolean; invite: { subject: string; body: string } | null }
    | { group: "candidate"; cutoffPercent: number | null; collect: DetailField[] }
    | { group: "proctoring"; proctor: Proctoring }
  ),
): Promise<SaveSettingsResult> {
  const basic = s.group === "basic";
  const v = {
    accessOpen: s.group === "basic" ? s.accessOpen : true,
    endsOn: s.group === "basic" ? s.endsOn : null,
    tags: s.group === "basic" ? s.tags : [],
    autoRemind: s.group === "email" ? s.autoRemind : true,
    subject: s.group === "email" ? (s.invite?.subject ?? null) : null,
    body: s.group === "email" ? (s.invite?.body ?? null) : null,
    cutoff: s.group === "candidate" ? s.cutoffPercent : null,
    collect: s.group === "candidate" ? s.collect : [],
    proctor: s.group === "proctoring" ? s.proctor : DEFAULT_SETTINGS.proctor,
  };
  if (s.expected === 0) {
    const { data, error } = await sql.row<{ revision: number }>`
      insert into course.company_test_settings
        (company_id, item_slug, access_open, ends_on, tags, auto_remind, invite_subject, invite_body, cutoff_percent, collect,
         proctor_fullscreen, proctor_tabs, proctor_copy, proctor_webcam, proctor_limit, revision, updated_by)
      values (${s.companyId}::uuid, ${s.item}, ${v.accessOpen}, ${v.endsOn}::timestamptz, ${v.tags}::text[], ${v.autoRemind},
              ${v.subject}, ${v.body}, ${v.cutoff}::int, ${v.collect}::text[],
              ${v.proctor.fullscreen}, ${v.proctor.tabs}, ${v.proctor.copy}, ${v.proctor.webcam}, ${v.proctor.limit}::int, 1, ${s.by})
      on conflict (company_id, item_slug) do nothing
      returning revision
    `;
    if (error) return fail("create", error);
    return data ? { status: "saved", revision: data.revision } : { status: "changed" };
  }
  const { data, error } = s.group === "proctoring"
    ? await sql.row<{ revision: number }>`
        update course.company_test_settings
           set proctor_fullscreen = ${v.proctor.fullscreen}, proctor_tabs = ${v.proctor.tabs}, proctor_copy = ${v.proctor.copy},
               proctor_webcam = ${v.proctor.webcam}, proctor_limit = ${v.proctor.limit}::int,
               revision = revision + 1, updated_by = ${s.by}, updated_at = now()
         where company_id = ${s.companyId}::uuid and item_slug = ${s.item} and revision = ${s.expected}::int
        returning revision
      `
    : s.group === "candidate"
    ? await sql.row<{ revision: number }>`
        update course.company_test_settings
           set cutoff_percent = ${v.cutoff}::int, collect = ${v.collect}::text[],
               revision = revision + 1, updated_by = ${s.by}, updated_at = now()
         where company_id = ${s.companyId}::uuid and item_slug = ${s.item} and revision = ${s.expected}::int
        returning revision
      `
    : basic
    ? await sql.row<{ revision: number }>`
        update course.company_test_settings
           set access_open = ${v.accessOpen}, ends_on = ${v.endsOn}::timestamptz, tags = ${v.tags}::text[],
               revision = revision + 1, updated_by = ${s.by}, updated_at = now()
         where company_id = ${s.companyId}::uuid and item_slug = ${s.item} and revision = ${s.expected}::int
        returning revision
      `
    : await sql.row<{ revision: number }>`
        update course.company_test_settings
           set auto_remind = ${v.autoRemind}, invite_subject = ${v.subject}, invite_body = ${v.body},
               revision = revision + 1, updated_by = ${s.by}, updated_at = now()
         where company_id = ${s.companyId}::uuid and item_slug = ${s.item} and revision = ${s.expected}::int
        returning revision
      `;
  if (error) return fail("save", error);
  return data ? { status: "saved", revision: data.revision } : { status: "changed" };
}

/**
 * Every reviewed attempt's score in percent for this company and test (its
 * latest review), for the suggested cut-off (U06b). Null on a database error.
 */
export async function reviewedPercents(sql: Db, companyId: string, item: string): Promise<number[] | null> {
  const { data, error } = await sql.rows<{ p: number }>`
    select (100.0 * r.total / nullif(r.max, 0))::float8 as p
      from course.hiring_batches b
      join course.candidate_attempts a on a.batch_id = b.id and a.company_id = b.company_id
      join lateral (
        select x.total, x.max from course.attempt_reviews x where x.attempt_id = a.id and x.company_id = b.company_id order by x.revision desc limit 1
      ) r on true
     where b.company_id = ${companyId}::uuid and b.item = ${item} and r.max > 0
  `;
  if (error) return error.code === UNDEFINED_TABLE ? [] : fail("reviewed scores", error);
  return (data ?? []).map((r) => Number(r.p));
}
