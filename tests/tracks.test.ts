import { strict as assert } from "node:assert";
import { test } from "node:test";
import { curricula } from "../src/data/curricula";
import { tracks } from "../src/data/tracks";

/**
 * A track marked contentLive enrols straight into Day 1, so it must have its
 * own complete course: 30 days, numbered 1 to 30, each in one of four weeks.
 */
test("every live track has its own complete 30-day course", () => {
  for (const t of tracks.filter((x) => x.contentLive)) {
    const c = curricula[t.slug];
    assert.ok(c, `${t.slug} is live but has no curriculum`);
    assert.deepEqual(c.days.map((d) => d.day), Array.from({ length: 30 }, (_, i) => i + 1), `${t.slug} days are not 1..30`);
    assert.equal(c.modules.length, 4, `${t.slug} should have four weekly modules`);
    for (const d of c.days) {
      assert.ok(c.modules.some((m) => m.week === d.week), `${t.slug} day ${d.day} is in an unknown week`);
      assert.ok(d.title && d.mission, `${t.slug} day ${d.day} is missing a title or mission`);
      if (d.kind === "build") {
        assert.ok(d.steps.length >= 2 && d.quiz.length >= 1 && d.deliverable, `${t.slug} day ${d.day} build is incomplete`);
      }
      for (const r of d.resources) assert.match(r.url, /^https:\/\//, `${t.slug} day ${d.day} has a non-https resource`);
    }
    assert.equal(c.days.filter((d) => d.kind === "assessment").length, 4, `${t.slug} needs four checkpoints`);
    assert.equal(c.days.filter((d) => d.kind === "interview").length, 2, `${t.slug} needs two mock interviews`);
  }
});

test("a course never shows another track's days", () => {
  // Two tracks may share a day's name or opening line, never its build steps.
  const missions = new Map<string, string>();
  for (const [slug, c] of Object.entries(curricula)) {
    for (const d of c.days.filter((x) => x.kind === "build")) {
      const key = d.steps.join("\n");
      const seen = missions.get(key);
      assert.ok(!seen || seen === slug, `Day ${d.day} steps appear in both ${seen} and ${slug}`);
      missions.set(key, slug);
    }
  }
});

test("a track cannot have live content while closed to registration", () => {
  for (const t of tracks) assert.ok(!t.contentLive || t.available, `${t.slug} is contentLive but not available`);
});
