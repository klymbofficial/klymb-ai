import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { Client } from "pg";
import { allowCompany, resolveMember } from "../src/lib/company/access";
import { memberLookup } from "../src/lib/company/lookup";
import { connectionOptions } from "../src/lib/db/connection";
import type { Db, DbError } from "../src/lib/db/client";

/**
 * Opt-in: runs only when TEST_DATABASE_URL points at a throwaway database
 * (a Neon branch or a local Postgres) where migration 0010 has been applied.
 *
 *   TEST_DATABASE_URL=postgres://... node --import tsx --test tests/company-access-db.test.ts
 *
 * Everything happens inside one transaction that is rolled back at the end,
 * so the database is left exactly as it was. It refuses to run against the
 * app's own DATABASE_URL or DATABASE_MIGRATE_URL.
 */
const url = process.env.TEST_DATABASE_URL?.trim();
const skip = !url
  ? "TEST_DATABASE_URL is not set"
  : url === process.env.DATABASE_URL?.trim() || url === process.env.DATABASE_MIGRATE_URL?.trim()
    ? "TEST_DATABASE_URL is the app's own database; refusing"
    : false;

describe("company access against a real database", { skip }, () => {
  const client = new Client(connectionOptions(url ?? ""));
  const run = randomUUID().slice(0, 8);
  const email = (name: string) => `${name}-${run}@test.invalid`;
  const ids = { acme: "", globex: "", acmeEng: "", acmeSales: "", globexEng: "" };

  /** The app's Db.row, over this test's connection, so memberLookup runs unchanged. */
  const sql: Pick<Db, "row"> = {
    async row<T>(strings: TemplateStringsArray, ...values: unknown[]) {
      let text = strings[0];
      for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
      try {
        const result = await client.query(text, values);
        return { data: (result.rows[0] as T) ?? null, error: null };
      } catch (e) {
        return { data: null, error: e as DbError };
      }
    },
  };

  const one = async (text: string, values: unknown[]) => (await client.query(text, values)).rows[0];

  /** Expects the database to refuse a write with the given SQLSTATE. */
  async function refused(text: string, values: unknown[], code: string) {
    await client.query("savepoint attempt");
    let error: DbError | null = null;
    try {
      await client.query(text, values);
    } catch (e) {
      error = e as DbError;
    } finally {
      await client.query("rollback to savepoint attempt");
    }
    assert.ok(error, "the database accepted it");
    assert.equal(error.code, code, error.message);
  }

  const addMember = "insert into course.company_members (email, company_id, team_id, role) values ($1, $2, $3, $4)";

  before(async () => {
    await client.connect();
    await client.query("begin");
    const tables = await one(
      "select count(*)::int as n from information_schema.tables where table_schema = 'course' and table_name in ('companies','teams','company_members')",
      [],
    );
    assert.equal(tables.n, 3, "migration 0010 has not been applied to this database");

    ids.acme = (await one("insert into course.companies (slug, name) values ($1, 'Acme') returning id", [`acme-${run}`])).id;
    ids.globex = (await one("insert into course.companies (slug, name) values ($1, 'Globex') returning id", [`globex-${run}`])).id;
    const team = async (company: string, name: string) =>
      (await one("insert into course.teams (company_id, name) values ($1, $2) returning id", [company, name])).id;
    ids.acmeEng = await team(ids.acme, "Engineering");
    ids.acmeSales = await team(ids.acme, "Sales");
    ids.globexEng = await team(ids.globex, "Engineering");

    await client.query(addMember, [email("hr"), ids.acme, null, "hr"]);
    await client.query(addMember, [email("head"), ids.acme, ids.acmeEng, "head"]);
    await client.query(addMember, [email("dev"), ids.acme, ids.acmeEng, "employee"]);
    await client.query(addMember, [email("rival"), ids.globex, ids.globexEng, "hr"]);
  });

  after(async () => {
    await client.query("rollback").catch(() => {});
    await client.end().catch(() => {});
  });

  test("the app's lookup finds a member's own company and role", async () => {
    const member = await resolveMember(email("head"), memberLookup(sql));
    assert.ok(member);
    assert.equal(member.companyId, ids.acme);
    assert.equal(member.companySlug, `acme-${run}`);
    assert.equal(member.role, "head");
    assert.equal(member.teamId, ids.acmeEng);
  });

  test("a member is let into their own company and not the other", async () => {
    const member = await resolveMember(email("dev"), memberLookup(sql));
    assert.equal(allowCompany(member, `acme-${run}`), true);
    assert.equal(allowCompany(member, `globex-${run}`), false);
    const rival = await resolveMember(email("rival"), memberLookup(sql));
    assert.equal(allowCompany(rival, `acme-${run}`, ["hr"]), false);
  });

  test("the lookup is exact: no wildcard or case tricks", async () => {
    assert.equal(await resolveMember(email("de_"), memberLookup(sql)), null);
    assert.equal(await resolveMember(`%-${run}@test.invalid`, memberLookup(sql)), null);
  });

  test("a removed member is nobody on the next lookup", async () => {
    await client.query("savepoint removal");
    await client.query("delete from course.company_members where email = $1", [email("dev")]);
    assert.equal(await resolveMember(email("dev"), memberLookup(sql)), null);
    await client.query("rollback to savepoint removal");
  });

  test("the database refuses a team from another company", async () => {
    await refused(addMember, [email("sneaky"), ids.acme, ids.globexEng, "employee"], "23503");
  });

  test("the database refuses a second company for the same person", async () => {
    await refused(addMember, [email("dev"), ids.globex, ids.globexEng, "employee"], "23505");
  });

  test("the database refuses a head with no team, an unknown role and a mixed-case email", async () => {
    await refused(addMember, [email("lead"), ids.acme, null, "head"], "23514");
    await refused(addMember, [email("boss"), ids.acme, null, "admin"], "23514");
    await refused(addMember, [`Mixed-${run}@test.invalid`, ids.acme, null, "employee"], "23514");
  });
});
