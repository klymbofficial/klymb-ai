import { strict as assert } from "node:assert";
import { test } from "node:test";
import { achievementCaption, achievementSvg } from "../src/lib/achievement";
import { ALL_IDS, badges, defaultState } from "../src/lib/course-app";

test("badge artwork escapes learner input and remains a self-contained image", () => {
  const svg = achievementSvg({ name: "First lesson", description: "Finished a lesson." }, '<script>&"', "System Design");
  assert.ok(!svg.includes("<script>"));
  assert.ok(svg.includes("&lt;script&gt;&amp;&quot;"));
  assert.ok(svg.includes('width="1200" height="900"'));
  assert.ok(!svg.includes("<image"));
});

test("caption describes the actual milestone without claiming certification", () => {
  const caption = achievementCaption({ name: "Builder", description: "Submitted my first practice answer." }, "System Design", "https://www.klymb.ai/learn/system-design");
  assert.ok(caption.includes("Submitted my first practice answer."));
  assert.ok(!caption.includes("certified"));
});

test("course completion requires every lesson, not repeated or unknown IDs", () => {
  const s = defaultState();
  assert.ok(badges(s).every((b) => !b.on));
  assert.equal(badges({ ...s, done: Array(ALL_IDS.length).fill("0-0") }).find((b) => b.name === "Course complete")?.on, false);
  assert.equal(badges({ ...s, done: [...ALL_IDS] }).find((b) => b.name === "Course complete")?.on, true);
});

test("every System Design badge has a description to share", () => {
  const all = badges(defaultState());
  assert.equal(new Set(all.map((b) => b.name)).size, all.length);
  for (const b of all) assert.ok(b.description.length > 10, `${b.name} needs a description`);
});
