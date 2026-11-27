import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { BANK_QUESTIONS, BANK_ROLES } from "../src/data/question-bank";
import { candidateQuestions, publishGaps } from "../src/lib/company/assessment-rules";
import { AUTO_LIMITS, autoContent, availability, eligible, pickQuestions, plannedMix, readSkills, summarise } from "../src/lib/company/auto-test";
import { readQuestion, type LibraryQuestion } from "../src/lib/company/library-rules";
import { STATS_MIN, questionStats } from "../src/lib/company/question-stats";
import { histogram, questionResults, timeEdges } from "../src/lib/company/test-hub-view";

/** P0.3 bank, P0.4 automatic tests, P0.6 numbers. */

const asLibrary = (): LibraryQuestion[] =>
  BANK_QUESTIONS.map((b, i) => ({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, own: false, type: "mcq", title: b.title, statement: b.statement, difficulty: b.difficulty,
    tags: b.tags, points: b.points, minutes: b.minutes, options: b.options, partial: b.partial, rubric: null, status: "published", revision: 1, updatedAt: "", explanation: b.explanation,
  }));

/** A repeatable random source. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

describe("P0.3 question bank", () => {
  test("160 distinct questions (120 + 40 in the AI skills library), each valid by the Library's own rules", () => {
    assert.equal(BANK_QUESTIONS.length, 160);
    assert.equal(new Set(BANK_QUESTIONS.map((q) => q.key)).size, 160, "keys unique");
    assert.equal(new Set(BANK_QUESTIONS.map((q) => q.title.toLowerCase())).size, 160, "titles unique");
    assert.equal(new Set(BANK_QUESTIONS.map((q) => q.statement.toLowerCase())).size, 160, "no repeated filler");
    for (const b of BANK_QUESTIONS) {
      const r = readQuestion({ type: "mcq", title: b.title, statement: b.statement, difficulty: b.difficulty, tags: b.tags, points: b.points, minutes: b.minutes, options: b.options, partial: b.partial });
      assert.ok(r.ok, `${b.key}: ${r.ok ? "" : r.message}`);
      assert.ok(b.explanation.length > 10 && b.explanation.length <= 1000, `${b.key} explanation`);
      assert.match(b.key, /^kb-[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  test("balanced: 51 easy, 69 medium, 40 hard; single and multi answer both present", () => {
    const n = (d: string) => BANK_QUESTIONS.filter((q) => q.difficulty === d).length;
    assert.deepEqual([n("easy"), n("medium"), n("hard")], [51, 69, 40]);
    const multi = BANK_QUESTIONS.filter((q) => q.options.filter((o) => o.correct).length > 1);
    assert.ok(multi.length >= 18 && multi.every((q) => q.partial), "pick-all questions give partial marks");
  });

  test("every role has at least 20 distinct questions and enough at each level for two 10-question tests", () => {
    const lib = asLibrary();
    for (const r of BANK_ROLES) {
      const a = availability(lib, r.skills);
      assert.ok(a.total >= 20, `${r.slug}: ${a.total}`);
      assert.ok(a.byDifficulty.easy >= 6 && a.byDifficulty.medium >= 10 && a.byDifficulty.hard >= 4, `${r.slug}: ${JSON.stringify(a.byDifficulty)}`);
      for (const s of r.skills) assert.ok(a.bySkill[s] > 0, `${r.slug} skill ${s} has questions`);
    }
  });
});

describe("P0.4 automatic selection", () => {
  const lib = asLibrary();
  const backend = BANK_ROLES.find((r) => r.slug === "backend-developer")!;

  test("10 unique questions, 3 easy / 5 medium / 2 hard, all within the skills, every skill covered", () => {
    for (const seed of [1, 2, 3, 42]) {
      const p = pickQuestions(lib, backend.skills, 10, seeded(seed));
      assert.ok(p.ok);
      assert.equal(p.questions.length, 10);
      assert.equal(new Set(p.questions.map((q) => q.id)).size, 10, "no duplicates");
      assert.deepEqual(p.mix, { easy: 3, medium: 5, hard: 2 });
      assert.equal(p.adapted, false);
      const want = new Set(backend.skills.map((s) => s.toLowerCase()));
      assert.ok(p.questions.every((q) => q.tags.some((t) => want.has(t.toLowerCase()))), "never outside the skills");
      for (const s of backend.skills) assert.ok(p.questions.some((q) => q.tags.includes(s)), `${s} covered`);
    }
  });

  test("never another company's library, unpublished or non-MCQ questions", () => {
    const extra: LibraryQuestion[] = [
      { ...lib[0], id: "11111111-1111-4111-8111-111111111111", status: "draft", title: "draft" },
      { ...lib[0], id: "22222222-2222-4222-8222-222222222222", status: "retired", title: "retired" },
      { ...lib[0], id: "33333333-3333-4333-8333-333333333333", type: "written", options: null, title: "written" },
    ];
    const e = eligible([...extra, ...lib], ["Java"]);
    assert.ok(e.every((q) => q.status === "published" && q.type === "mcq"));
    assert.equal(eligible([lib[0], lib[0]], ["Java"]).length, 1, "a question once");
  });

  test("a shortage is reported, never padded; an empty skill must be removed", () => {
    const short = pickQuestions(lib, ["Git"], 10);
    assert.ok(!short.ok && short.reason === "short" && short.available === 3);
    const empty = pickQuestions(lib, ["Java", "Cobol"], 5);
    assert.ok(!empty.ok && empty.reason === "skill_empty" && empty.emptySkills[0] === "Cobol");
    assert.ok(!pickQuestions(lib, [], 5).ok);
  });

  test("when a level runs short the mix adapts and says so", () => {
    const fewHard = lib.filter((q) => !(q.difficulty === "hard" && q.tags.includes("Statistics")));
    const p = pickQuestions(fewHard, ["Statistics"], 5, seeded(7));
    assert.ok(p.ok);
    assert.equal(p.questions.length, 5);
    assert.equal(p.mix.hard, 0);
    assert.equal(p.adapted, true);
  });

  test("the draft is ready to publish, and candidates never see the answers", () => {
    const p = pickQuestions(lib, backend.skills, 10, seeded(9));
    assert.ok(p.ok);
    const sum = summarise(p.questions);
    assert.equal(sum.count, 10);
    assert.equal(sum.minutes % 5, 0);
    assert.ok(sum.minutes >= 10);
    const c = autoContent("Backend developer", p.questions, sum.minutes);
    assert.deepEqual(publishGaps(c), []);
    assert.ok(c.questions!.every((q, i) => q.source === p.questions[i].id), "copies remember their source");
    assert.doesNotMatch(JSON.stringify(candidateQuestions(c.questions!)), /"correct"/);
  });

  test("planned mix, skills and limits", () => {
    assert.deepEqual(plannedMix(10), { easy: 3, medium: 5, hard: 2 });
    assert.deepEqual(plannedMix(5), { easy: 2, medium: 2, hard: 1 });
    assert.deepEqual(plannedMix(20), { easy: 6, medium: 10, hard: 4 });
    assert.deepEqual(readSkills("Java, java ,  SQL,"), ["Java", "SQL"]);
    assert.equal(AUTO_LIMITS.max, 20);
  });

  test("creation is one press: the action carries a key and the modal doesn't open the editor", () => {
    const action = readFileSync(new URL("../src/app/org/[slug]/(workspace)/assessments/test-actions.ts", import.meta.url), "utf8");
    assert.match(action, /createTestKeyed\(sql, \{[^}]*createKey: input\.createKey/);
    const modal = readFileSync(new URL("../src/components/company/CreateAssessment.tsx", import.meta.url), "utf8");
    assert.match(modal, /crypto\.randomUUID\(\)/);
    assert.match(modal, /setView\("summary"\)/);
    assert.doesNotMatch(modal.slice(modal.indexOf("const createAuto"), modal.indexOf("const publish")), /router|redirect|location/);
    const mig = readFileSync(new URL("../db/migrations/0093_roles_and_question_bank.sql", import.meta.url), "utf8");
    assert.match(mig, /catalog_items_create_once on course\.catalog_items \(owner_company_id, create_key\)/);
  });
});

describe("P0.6 numbers", () => {
  test("question stats hide rates below the minimum and count months", () => {
    const now = new Date("2026-11-25T00:00:00Z");
    const few = questionStats([{ month: "2026-11", points: 2, max: 2 }], now);
    assert.deepEqual([few.attempts, few.fullRate, few.averageRate], [1, null, null]);
    assert.equal(few.months.length, 12);
    assert.equal(few.months[11].count, 1);
    const rows = Array.from({ length: STATS_MIN }, (_, i) => ({ month: "2026-10", points: i < 7 ? 4 : 2, max: 4 }));
    const s = questionStats(rows, now);
    assert.deepEqual([s.fullRate, s.averageRate], [70, 85]);
    assert.equal(s.months[10].count, 10);
  });

  test("histograms and per-question results", () => {
    assert.deepEqual(histogram([5, 15, 15, 95], [0, 10, 20, 90]).map((b) => b.count), [1, 2, 0, 1]);
    assert.deepEqual(timeEdges(45), [0, 10, 20, 30, 40, 50]);
    const r = questionResults([{ questionNo: 1, points: 3, max: 3 }, { questionNo: 1, points: 0, max: 3 }, { questionNo: 2, points: 2, max: 4 }], 3);
    assert.deepEqual(r.map((x) => [x.attempts, x.full, x.average]), [[2, 1, 50], [1, 0, 50], [0, 0, null]]);
  });
});
