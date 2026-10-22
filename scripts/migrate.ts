/**
 * Applies db/migrations/*.sql in order, once each.
 *
 *   npm run db:migrate
 *
 * Connects with DATABASE_MIGRATE_URL when it is set, falling back to
 * DATABASE_URL. Those are normally two different roles: migrations need to
 * create tables, while the running app connects as klymb_course, which may
 * only read and write them — see db/migrations/0002_grants.sql.
 *
 * Each file runs inside one transaction together with the ledger row that
 * records it, so a file that fails leaves nothing behind and can be fixed and
 * re-run. Files are sent whole, in one statement, so that dollar-quoted
 * function bodies are parsed by the server rather than split up here.
 */
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { Client } from "pg";
import { connectionOptions } from "../src/lib/db/connection";

// .env.local and friends, read the way next dev reads them.
loadEnvConfig(process.cwd());

const DIR = path.join(process.cwd(), "db", "migrations");

async function main() {
  const url = process.env.DATABASE_MIGRATE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("Set DATABASE_MIGRATE_URL (or DATABASE_URL) first.");
    process.exit(1);
  }

  const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
  if (files.length === 0) {
    console.error(`No .sql files in ${DIR}`);
    process.exit(1);
  }

  const client = new Client(connectionOptions(url));
  await client.connect();

  try {
    // The ledger has to exist before the first migration can be recorded, and
    // 0001 is what creates the schema it lives in.
    await client.query("create schema if not exists course");
    await client.query(`
      create table if not exists course.schema_migrations (
        name text primary key,
        checksum text not null,
        applied_at timestamptz not null default now()
      )
    `);

    const { rows } = await client.query<{ name: string; checksum: string }>(
      "select name, checksum from course.schema_migrations",
    );
    const applied = new Map(rows.map((r) => [r.name, r.checksum]));

    let count = 0;
    for (const name of files) {
      const sql = readFileSync(path.join(DIR, name), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex").slice(0, 16);
      const seen = applied.get(name);

      if (seen) {
        // An applied migration that has since been edited is a problem the
        // next environment will hit as a schema difference, so say so rather
        // than skipping in silence.
        if (seen !== checksum) console.warn(`! ${name} changed since it was applied (${seen} → ${checksum})`);
        continue;
      }

      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into course.schema_migrations (name, checksum) values ($1, $2)", [name, checksum]);
        await client.query("commit");
        console.log(`✓ ${name}`);
        count += 1;
      } catch (e) {
        await client.query("rollback");
        throw new Error(`${name} failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    console.log(count === 0 ? "Already up to date." : `Applied ${count} migration(s).`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
