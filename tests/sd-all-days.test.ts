import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { BUILT_LESSONS, LESSON_RELEASES, MODULES } from "../src/data/system-design/course-app";
import { LESSON_DAYS } from "../src/data/system-design/lessons";
import { lessonContent } from "../src/lib/sd-lessons";
import type { DayCopy, Question } from "../src/data/system-design/types";
import { checkPct, flowDone, defaultState, passed, setLessons } from "../src/lib/course-app";
import { pairKey } from "../src/lib/canvas";

// The whole course, day by day, so a new or edited day can't ship with a broken
// assessment. Only the five-question check decides a pass; everything else is optional.
setLessons(lessonContent(true));
const ids = Object.keys(LESSON_DAYS);
const bestOf = (q: Question) => q.choices.findIndex((c) => c.best);

test("all 21 days exist, in order, each released with a real video length", () => {
  assert.equal(ids.length, 21);
  assert.deepEqual([...BUILT_LESSONS].sort(), [...ids].sort());
  const outline = MODULES.flatMap((m, a) => m.lessons.map((l, b) => ({ id: `${a}-${b}`, duration: l[1] })));
  assert.equal(outline.length, 21);
  outline.forEach(({ id, duration }, i) => {
    assert.equal(LESSON_DAYS[id].day, i + 1, `lesson ${id} is Day ${i + 1}`);
    assert.notEqual(duration, "0:00", `lesson ${id} has its video length`);
    assert.match(LESSON_RELEASES[id], /^\d{4}-\d{2}-\d{2}$/);
  });
});

for (const [id, day] of Object.entries(LESSON_DAYS)) {
  test(`Day ${day.day}: video and poster belong to this day`, () => {
    assert.equal(day.video.src, `/api/video/essentials-day-${day.day}.mp4`);
    assert.equal(day.video.wide?.src, day.video.src);
    assert.ok(existsSync(join(process.cwd(), "public", day.video.poster)), day.video.poster);
  });

  test(`Day ${day.day}: every question has exactly one right answer, in both languages`, () => {
    for (const lang of ["en", "hi"] as const) {
      for (const q of [...day.copy[lang].pre, ...day.copy[lang].post]) {
        assert.equal(q.choices.filter((c) => c.best).length, 1, `${lang} ${q.id}`);
        assert.ok(q.choices.length >= 2 && q.choices.every((c) => c.text.trim() && c.why.trim()), `${lang} ${q.id}`);
      }
    }
    const { en, hi } = day.copy;
    assert.equal(en.post.length, 5);
    for (const key of ["pre", "post"] as const) {
      assert.deepEqual(en[key].map(bestOf), hi[key].map(bestOf), `${key}: saved answers must mean the same in both languages`);
      assert.deepEqual(en[key].map((q) => q.choices.length), hi[key].map((q) => q.choices.length));
    }
  });

  test(`Day ${day.day}: three right of five passes, two doesn't, and nothing else is needed`, () => {
    const post = day.copy.en.post;
    const right = post.map(bestOf);
    const score = (n: number) => checkPct(post, right.map((best, i) => (i < n ? best : (best + 1) % post[i].choices.length)));
    assert.equal(score(3), 60);
    assert.equal(passed(score(3)), true);
    assert.equal(score(2), 40);
    assert.equal(passed(score(2)), false);
    assert.equal(passed(59), false);
    // Watched and passed, with none of the estimate, build, drawing, design or follow-ups touched.
    const s = { ...defaultState(0), lessons: { [id]: { watched: true, post: [] } } } as ReturnType<typeof defaultState>;
    assert.equal(flowDone(s, id), true);
  });

  for (const lang of ["en", "hi"] as const) {
    test(`Day ${day.day} (${lang}): the optional practice is complete and consistent`, () => {
      const c: DayCopy = day.copy[lang];
      if (c.build) {
        const chips = new Set(c.build.chips.map((x) => x.id));
        for (const slot of Object.values(c.build.slots)) {
          assert.ok(chips.has(slot.answer), `no chip for ${slot.answer}`);
          assert.ok(!slot.role.includes(": "), `a slot's role splits at a colon: ${slot.role}`);
        }
        assert.deepEqual(c.build.rows.flat().sort(), Object.keys(c.build.slots).sort());
        if (c.build.rowLabels) assert.equal(c.build.rowLabels.length, c.build.rows.length);
      }
      if (c.canvas) {
        const part = new Map(c.canvas.model.nodes.map((n) => [n.id, n.part]));
        for (const n of c.canvas.model.nodes) assert.ok(c.canvas.parts.includes(n.part), `${n.part} isn't in the tray`);
        for (const [a, b] of c.canvas.model.edges) {
          assert.ok(part.has(a) && part.has(b), `edge ${a}>${b}`);
          assert.ok(c.canvas.why[pairKey(part.get(a)!, part.get(b)!)]?.trim(), `no reason for ${a}>${b}`);
        }
      }
      for (const e of c.estimates ?? []) assert.ok(e.answer > 0 && e.working.length > 0, e.id);
    });

    test(`Day ${day.day} (${lang}): no mock interview is promised`, () => {
      assert.doesNotMatch(JSON.stringify(day.copy[lang]), /mock interview/i);
    });
  }
}
