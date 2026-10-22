import "server-only";
import { Pool, types } from "pg";
import { connectionOptions } from "@/lib/db/connection";

/**
 * The database: the `course` schema on the Neon instance that runs
 * app.klymb.ai, so a learner here is the same person as the platform user
 * with that address.
 *
 * Replaces the Supabase client this app used to hold. Two things about the
 * shape of this module are deliberate, because the call sites depend on them:
 *
 *  1. `db()` returns null when DATABASE_URL is unset, exactly as
 *     createServiceClient() did, so callers keep their degraded path — most
 *     importantly src/lib/access.ts, which fails *open* so a database outage
 *     never locks a paying learner out of the day they bought.
 *  2. Queries resolve to `{ data, error }` and never reject. node-postgres
 *     throws where supabase-js returned an error object, and silently turning
 *     a fail-open check into a thrown exception would change who gets locked
 *     out. Errors are logged here and handed back for the caller to judge.
 */

// ── Type parsers ────────────────────────────────────────────
// supabase-js handed back JSON, so dates arrived as strings and numerics as
// numbers. node-postgres decodes to richer types, and two of those would
// break things quietly:
//
//   * `date` → Date. cohort_start is pasted straight into a template string
//     (`${cohortStart}T00:00:00Z` in src/lib/learn.ts, and the same in
//     formatDate), which on a Date object yields an unparseable string and an
//     Invalid Date on every day page. It must stay 'YYYY-MM-DD'.
//   * `numeric` → string. weighted_score is read as a number.
//
// Timestamps keep the ISO form the app writes with new Date().toISOString():
// `new Date(...)` is called on them all over, one is rendered into a <time
// dateTime> attribute, and submitted_at is sorted lexically in
// src/lib/admin/data.ts — which is only correct for a consistent ISO string.
const OID = { DATE: 1082, TIMESTAMP: 1114, TIMESTAMPTZ: 1184, NUMERIC: 1700, INT8: 20 } as const;

/** Reuse node-postgres's own timestamp parsing, then re-render as ISO. */
function isoParser(oid: number) {
  const parse = types.getTypeParser(oid, "text") as (v: string) => unknown;
  return (value: string) => {
    const parsed = parse(value);
    return parsed instanceof Date ? parsed.toISOString() : String(parsed);
  };
}

types.setTypeParser(OID.DATE, (value) => value);
types.setTypeParser(OID.TIMESTAMPTZ, isoParser(OID.TIMESTAMPTZ));
types.setTypeParser(OID.TIMESTAMP, isoParser(OID.TIMESTAMP));
types.setTypeParser(OID.NUMERIC, (value) => Number(value));
// Only admin_audit_log.id is a bigint, and it is a sequence counter well
// inside Number's exact range. Anything that could outgrow it must not use
// this parser.
types.setTypeParser(OID.INT8, (value) => Number(value));

// ── Pool ────────────────────────────────────────────────────
// This database serves app.klymb.ai's users, so the connection budget is not
// ours alone to spend: keep the per-instance pool small and point
// DATABASE_URL at Neon's -pooler host, which multiplexes server-side.
//
// Cached on globalThis because Next re-evaluates modules on every hot reload
// in development, and a fresh Pool each time would leak connections.
const globalForDb = globalThis as typeof globalThis & { klymbPool?: Pool };

function pool(url: string): Pool {
  if (globalForDb.klymbPool) return globalForDb.klymbPool;
  const created = new Pool({
    ...connectionOptions(url),
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  // An idle client erroring (a Neon scale-to-zero, a network blip) emits on
  // the pool; without a listener Node treats it as an unhandled error and
  // takes the process down.
  created.on("error", (e) => console.error("database pool error:", e.message));
  globalForDb.klymbPool = created;
  return created;
}

/**
 * node-postgres rejects with a DatabaseError carrying the five-character
 * SQLSTATE, and callers branch on it — src/lib/rate-limit.ts treats 42883
 * (undefined_function) as "the migration has not run here yet" and falls back
 * rather than failing open. The object is handed back as thrown, so the code
 * survives; this type is what makes it reachable.
 */
export type DbError = Error & { code?: string };

export interface Result<T> {
  data: T | null;
  error: DbError | null;
}

export interface Db {
  /** Every matching row. */
  rows<T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<Result<T[]>>;
  /** The first row, or null — what .maybeSingle() gave. */
  row<T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<Result<T>>;
  /** The first column of the first row — what .rpc() gave for a scalar function. */
  scalar<T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<Result<T>>;
  /** A write. `data` is the number of rows affected. */
  run(strings: TemplateStringsArray, ...values: unknown[]): Promise<Result<number>>;
}

/**
 * Interpolations become $1..$n, so a value can never be read as SQL. There is
 * deliberately no escape hatch: a table name, a column list or a sort
 * direction has to be written into the template literally, because anything
 * that could inline a string here could inline a caller's string too.
 */
function build(strings: TemplateStringsArray, values: unknown[]) {
  let text = strings[0];
  for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
  return { text, values };
}

export function db(): Db | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const client = pool(url);

  async function query(strings: TemplateStringsArray, values: unknown[]) {
    const { text, values: params } = build(strings, values);
    try {
      return { result: await client.query(text, params), error: null };
    } catch (e) {
      const error: DbError = e instanceof Error ? e : new Error(String(e));
      // The statement, never the parameters: those carry learner data.
      console.error("query failed:", error.message, "—", text.trim().split("\n")[0]);
      return { result: null, error };
    }
  }

  return {
    async rows<T>(strings: TemplateStringsArray, ...values: unknown[]) {
      const { result, error } = await query(strings, values);
      return { data: (result?.rows as T[]) ?? null, error };
    },
    async row<T>(strings: TemplateStringsArray, ...values: unknown[]) {
      const { result, error } = await query(strings, values);
      return { data: (result?.rows[0] as T) ?? null, error };
    },
    async scalar<T>(strings: TemplateStringsArray, ...values: unknown[]) {
      const { result, error } = await query(strings, values);
      const first = result?.rows[0];
      const value = first ? (Object.values(first)[0] as T) : null;
      return { data: value ?? null, error };
    },
    async run(strings: TemplateStringsArray, ...values: unknown[]) {
      const { result, error } = await query(strings, values);
      return { data: result?.rowCount ?? null, error };
    },
  };
}
