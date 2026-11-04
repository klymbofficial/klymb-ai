import { strict as assert } from "node:assert";
import { test } from "node:test";
import { COURSES } from "../src/data/courses/registry";

test("the Agentic AI Systems course has its eight modules, in order", () => {
  const c = COURSES.find((x) => x.slug === "agentic-ai");
  assert.ok(c, "agentic-ai is missing");
  assert.deepEqual(c.modules.map((m) => m.number), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(new Set(c.modules.map((m) => m.slug)).size, c.modules.length, "two modules share a slug");
});

test("every module's section headings have their own anchors", () => {
  for (const c of COURSES) {
    for (const m of c.modules) {
      const ids = m.blocks.flatMap((b) => (b.type === "h2" ? [b.id] : []));
      assert.ok(ids.length > 0, `${c.slug}/${m.slug} has no sections`);
      assert.equal(new Set(ids).size, ids.length, `${c.slug}/${m.slug} repeats a section anchor`);
    }
  }
});

test("no other brand is left in the course content", () => {
  assert.ok(!/abtalks|app\.klymb/i.test(JSON.stringify(COURSES)), "the course still names ABTalks or app.klymb.ai");
});
