import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { BANK_QUESTIONS, BANK_ROLES, BANK_WRITTEN } from "../src/data/question-bank";
import { readQuestion } from "../src/lib/company/library-rules";

const AREAS = ["Prompt engineering", "RAG", "AI agents", "LLM evaluation", "Debugging AI apps"];

describe("AI skills library (user, 26 Nov)", () => {
  test("five areas, each with 8 multiple-choice questions (3 easy, 3 medium, 2 hard)", () => {
    for (const area of AREAS) {
      const mine = BANK_QUESTIONS.filter((q) => q.tags.includes(area));
      assert.equal(mine.length, 8, area);
      const n = (d: string) => mine.filter((q) => q.difficulty === d).length;
      assert.deepEqual([n("easy"), n("medium"), n("hard")], [3, 3, 2], area);
    }
  });

  test("ten written questions, two per area, each valid with a rubric adding up to its points", () => {
    assert.equal(BANK_WRITTEN.length, 10);
    assert.equal(new Set(BANK_WRITTEN.map((q) => q.key)).size, 10);
    for (const area of AREAS) assert.equal(BANK_WRITTEN.filter((q) => q.tags.includes(area)).length, 2, area);
    for (const b of BANK_WRITTEN) {
      const points = b.rubric.reduce((n, c) => n + c.points, 0);
      const r = readQuestion({ type: "written", title: b.title, statement: b.statement, difficulty: b.difficulty, tags: b.tags, points, minutes: b.minutes, rubric: b.rubric });
      assert.ok(r.ok, `${b.key}: ${r.ok ? "" : r.message}`);
      assert.ok(r.ok && r.value.points === points, `${b.key} points`);
      assert.ok(b.rubric.every((c) => c.guide.length > 20), `${b.key}: every area has a scoring guide`);
      assert.ok(b.explanation.length > 20, `${b.key}: says what a strong answer covers`);
      assert.match(b.key, /^kb-ai-w-[a-z0-9-]+$/);
    }
  });

  test("an AI engineer and a GenAI developer role draw on the areas", () => {
    const ai = BANK_ROLES.find((r) => r.slug === "ai-engineer");
    const gen = BANK_ROLES.find((r) => r.slug === "genai-developer");
    assert.deepEqual(ai?.skills, AREAS);
    assert.ok(gen && gen.skills.every((s) => AREAS.includes(s)));
  });
});
