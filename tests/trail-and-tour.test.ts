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

test("extra practice: waiting only on a passed day with parts left, latest first", async () => {
  const { setLessons, practiceLeft, practiceStart, practiceWaiting, openPractice } = await import("../src/lib/course-app");
  const { lessonContent } = await import("../src/lib/sd-lessons");
  setLessons(lessonContent(true));
  const base = { ...defaultState(), onboarded: true, commitment: { name: "T", date: "2026-11-01" } } as ReturnType<typeof defaultState>;
  assert.equal(practiceLeft(base, "0-0"), null, "not passed yet");
  const passed = { ...base, done: ["0-0", "0-1"], lessons: { "0-0": { watched: true, post: [0] }, "0-1": { watched: true, post: [0] } } } as ReturnType<typeof defaultState>;
  assert.equal(practiceLeft(passed, "0-0"), practiceStart(passed, "0-0"), "Day 1 starts on its first part");
  assert.equal(practiceLeft(passed, "0-1"), practiceStart(passed, "0-1"));
  assert.equal(practiceWaiting(passed), "0-1", "the latest passed day first");
  const opened = openPractice(passed, "0-0");
  assert.equal(opened.screen, "player");
  assert.equal(opened.stage, practiceStart(passed, "0-0"));
  const all = { ...passed, lessons: { ...passed.lessons, "0-0": { watched: true, post: [0], est: [1], built: 0, drawn: { score: 1, of: 1 }, design: "x", follow: [true] } } } as ReturnType<typeof defaultState>;
  assert.equal(practiceLeft(all, "0-0"), null, "all done: no nudge");
});
