import { strict as assert } from "node:assert";
import { test } from "node:test";
import { trailLines, type TrailEvent } from "../src/lib/admin/sd-event-words";
import { defaultState, tourDone } from "../src/lib/course-app";

const ev = (at: string, event: string, props: Record<string, unknown> = {}, lesson: string | null = "0-2"): TrailEvent =>
  ({ created_at: `2026-11-05T00:${at}+05:30`, event, lesson, step: null, props } as TrailEvent);

test("the same action back to back is one line with a count", () => {
  const events = [ev("19:01", "video_play", { at: 326 }), ...Array.from({ length: 279 }, () => ev("19:30", "video_play", { at: 326 })), ev("19:40", "video_play", { at: 330 })];
  const lines = trailLines(events);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].text, "Pressed play");
  assert.equal(lines[0].detail, "from 5m 26s");
  assert.equal(lines[0].times, 280);
  assert.equal(lines[0].until, "2026-11-05T00:19:30+05:30");
  assert.equal(lines[1].times, undefined, "a different moment is its own line");
});

test("repeats on another lesson, or apart, stay separate", () => {
  const lines = trailLines([ev("10:00", "video_play", { at: 5 }), ev("10:01", "video_play", { at: 5 }, "0-3"), ev("10:02", "lesson_open"), ev("10:03", "video_play", { at: 5 })]);
  assert.equal(lines.length, 4);
  assert.ok(lines.every((l) => !l.times));
});

test("the tour is skipped for anyone who has passed a lesson", () => {
  const fresh = defaultState();
  assert.equal(tourDone(fresh).toured, false, "someone new still sees it");
  assert.equal(tourDone({ ...fresh, done: ["0-0"] }).toured, true);
  assert.equal(tourDone({ ...fresh, lessons: { "0-0": { post: [0, 1, 2] } } }).toured, true, "passed on the server, so on any device");
  assert.equal(tourDone({ ...fresh, lessons: { "0-0": { watched: true } } }).toured, false, "only watching doesn't count");
});

test("the tour no longer mentions CC", async () => {
  const { readFileSync } = await import("node:fs");
  assert.doesNotMatch(readFileSync("src/components/course-app/lesson/Tour.tsx", "utf8"), /\bCC\b/);
});
