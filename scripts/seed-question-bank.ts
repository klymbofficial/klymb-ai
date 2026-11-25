/**
 * Loads Klymb's question bank and job roles (src/data/question-bank.ts) into
 * the database: `npm run db:seed-bank`.
 *
 * Every question is checked with the Library's own rules first; nothing is
 * written if one fails. Questions are matched by their seed key, so a rerun
 * updates them in place (the revision goes up only when something changed)
 * and never adds a copy. Company questions are never touched: seed keys only
 * exist on Klymb's questions. Tests already built keep their own copies, so
 * published versions don't change. Roles are matched by slug.
 *
 * Connects with DATABASE_MIGRATE_URL, falling back to DATABASE_URL, and says
 * which database it is about to change. Run it on a development database;
 * production is a separate rollout decision.
 */
import { loadEnvConfig } from "@next/env";
import { Client } from "pg";
import { BANK_QUESTIONS, BANK_ROLES } from "../src/data/question-bank";
import { connectionOptions } from "../src/lib/db/connection";
import { readQuestion } from "../src/lib/company/library-rules";

loadEnvConfig(process.cwd());
const BY = "klymb-question-bank";

async function main() {
  const url = process.env.DATABASE_MIGRATE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL (or DATABASE_MIGRATE_URL).");
  const u = new URL(url);
  console.log(`→ ${u.pathname.slice(1)} on ${u.hostname.split(".")[0]} as ${decodeURIComponent(u.username)}`);

  const checked = BANK_QUESTIONS.map((b) => {
    const r = readQuestion({ type: "mcq", title: b.title, statement: b.statement, difficulty: b.difficulty, tags: b.tags, points: b.points, minutes: b.minutes, options: b.options, partial: b.partial });
    if (!r.ok) throw new Error(`${b.key}: ${r.message}`);
    return { b, q: r.value };
  });
  const keys = new Set(BANK_QUESTIONS.map((b) => b.key));
  if (keys.size !== BANK_QUESTIONS.length) throw new Error("Two questions share a key.");

  const client = new Client(connectionOptions(url));
  await client.connect();
  let made = 0;
  let changed = 0;
  try {
    await client.query("begin");
    for (const { b, q } of checked) {
      const r = await client.query<{ inserted: boolean; revision: number }>(
        `insert into course.library_questions
           (owner_company_id, type, title, statement, difficulty, tags, points, minutes, options, partial, rubric, status, created_by, updated_by, seed_key, explanation)
         values (null, 'mcq', $1, $2, $3, $4, $5, $6, $7::jsonb, $8, null, 'published', $9, $9, $10, $11)
         on conflict (seed_key) where seed_key is not null do update
           set title = excluded.title, statement = excluded.statement, difficulty = excluded.difficulty, tags = excluded.tags,
               points = excluded.points, minutes = excluded.minutes, options = excluded.options, partial = excluded.partial,
               explanation = excluded.explanation, status = 'published', updated_by = excluded.updated_by, updated_at = now(),
               revision = course.library_questions.revision + 1
           where course.library_questions.owner_company_id is null
             and (course.library_questions.title, course.library_questions.statement, course.library_questions.difficulty,
                  course.library_questions.tags, course.library_questions.points, course.library_questions.minutes,
                  course.library_questions.options, course.library_questions.partial, coalesce(course.library_questions.explanation, ''),
                  course.library_questions.status)
                 is distinct from
                 (excluded.title, excluded.statement, excluded.difficulty, excluded.tags, excluded.points, excluded.minutes,
                  excluded.options, excluded.partial, coalesce(excluded.explanation, ''), 'published')
         returning (xmax = 0) as inserted, revision`,
        [q.title, q.statement, q.difficulty, q.tags, q.points, q.minutes, JSON.stringify(q.options), q.partial, BY, b.key, b.explanation],
      );
      if (r.rows[0]?.inserted) made += 1;
      else if (r.rows[0]) changed += 1;
    }
    for (const role of BANK_ROLES) {
      await client.query(
        `insert into course.assessment_roles (slug, label, summary, skills, status, sort, updated_by)
         values ($1, $2, $3, $4, 'active', $5, $6)
         on conflict (slug) do update
           set label = excluded.label, summary = excluded.summary, skills = excluded.skills, sort = excluded.sort,
               updated_by = excluded.updated_by, updated_at = now(), revision = course.assessment_roles.revision + 1
           where (course.assessment_roles.label, course.assessment_roles.summary, course.assessment_roles.skills, course.assessment_roles.sort)
                 is distinct from (excluded.label, excluded.summary, excluded.skills, excluded.sort)`,
        [role.slug, role.label, role.summary, role.skills, role.sort, BY],
      );
    }
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    await client.end();
  }
  console.log(`✓ ${BANK_QUESTIONS.length} questions checked: ${made} added, ${changed} updated, ${BANK_QUESTIONS.length - made - changed} unchanged. ${BANK_ROLES.length} roles.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
