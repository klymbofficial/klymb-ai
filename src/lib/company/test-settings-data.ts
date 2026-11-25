import "server-only";
import { DEFAULT_SETTINGS, type TestSettings } from "@/lib/company/test-settings";
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
};

const iso = (v: string | Date | null) => (v === null ? null : new Date(v).toISOString());
const fromRow = (r: Row): TestSettings => ({
  accessOpen: r.access_open,
  endsOn: iso(r.ends_on),
  tags: r.tags ?? [],
  autoRemind: r.auto_remind,
  invite: r.invite_subject !== null && r.invite_body !== null ? { subject: r.invite_subject, body: r.invite_body } : null,
  revision: r.revision,
  updatedBy: r.updated_by,
  updatedAt: iso(r.updated_at),
});

/** This company's settings for one test; the defaults when none are saved. Null on a database error. */
export async function loadTestSettings(sql: Db, companyId: string, item: string): Promise<TestSettings | null> {
  const { data, error } = await sql.row<Row>`
    select item_slug, access_open, ends_on, tags, auto_remind, invite_subject, invite_body, revision, updated_by, updated_at
      from course.company_test_settings where company_id = ${companyId}::uuid and item_slug = ${item}
  `;
  if (error) return error.code === UNDEFINED_TABLE ? { ...DEFAULT_SETTINGS } : fail("read", error);
  return data ? fromRow(data) : { ...DEFAULT_SETTINGS };
}

/** This company's saved settings, by test. Tests with none are left out. Null on a database error. */
export async function companyTestSettings(sql: Db, companyId: string): Promise<Map<string, TestSettings> | null> {
  const { data, error } = await sql.rows<Row>`
    select item_slug, access_open, ends_on, tags, auto_remind, invite_subject, invite_body, revision, updated_by, updated_at
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
  ),
): Promise<SaveSettingsResult> {
  const basic = s.group === "basic";
  const v = {
    accessOpen: basic ? s.accessOpen : true,
    endsOn: basic ? s.endsOn : null,
    tags: basic ? s.tags : [],
    autoRemind: basic ? true : s.autoRemind,
    subject: basic ? null : (s.invite?.subject ?? null),
    body: basic ? null : (s.invite?.body ?? null),
  };
  if (s.expected === 0) {
    const { data, error } = await sql.row<{ revision: number }>`
      insert into course.company_test_settings
        (company_id, item_slug, access_open, ends_on, tags, auto_remind, invite_subject, invite_body, revision, updated_by)
      values (${s.companyId}::uuid, ${s.item}, ${v.accessOpen}, ${v.endsOn}::timestamptz, ${v.tags}::text[], ${v.autoRemind},
              ${v.subject}, ${v.body}, 1, ${s.by})
      on conflict (company_id, item_slug) do nothing
      returning revision
    `;
    if (error) return fail("create", error);
    return data ? { status: "saved", revision: data.revision } : { status: "changed" };
  }
  const { data, error } = basic
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
