import { strict as assert } from "node:assert";
import { test } from "node:test";
import { tracks } from "../src/data/tracks";

/**
 * The learner app renders one built course: Project Manager. A track marked
 * contentLive enrols straight into it, so marking any other track live would
 * show its learners the wrong course. Add a track here only with its course.
 */
const TRACKS_WITH_A_BUILT_COURSE = ["project-manager"];

test("only tracks whose course is built can enrol straight into Day 1", () => {
  const live = tracks.filter((t) => t.contentLive).map((t) => t.slug);
  assert.deepEqual(live, TRACKS_WITH_A_BUILT_COURSE);
});

test("a track cannot have live content while closed to registration", () => {
  for (const t of tracks) assert.ok(!t.contentLive || t.available, `${t.slug} is contentLive but not available`);
});
