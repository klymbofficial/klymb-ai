import { strict as assert } from "node:assert";
import { test } from "node:test";
import { buildReminder, slotForIstHour, streakEnding, type ReminderInput } from "../src/lib/reminders";

const base: ReminderInput = { slot: "morning", name: "Divya", day: 4, title: "API testing", minutes: 105, kind: "build", streak: 3, doneToday: false, behind: false, seed: 1 };

test("slots map to IST hours, nothing before 8am", () => {
  assert.deepEqual([7, 9, 13, 17, 21].map(slotForIstHour), [null, "morning", "midday", "evening", "night"]);
});

test("once today is done, only the morning message ever goes", () => {
  for (const slot of ["midday", "evening", "night"] as const) assert.equal(buildReminder({ ...base, slot, doneToday: true }), null);
  assert.ok(buildReminder({ ...base, doneToday: true }));
});

test("behind on yesterday: points to yesterday's day", () => {
  const r = buildReminder({ ...base, behind: true })!;
  assert.equal(r.url, "/learn/day/3");
  assert.match(r.body, /Day 3/);
});

test("streak shows up in the copy, and the night one is a last call", () => {
  const night = [0, 1].map((seed) => buildReminder({ ...base, slot: "night", seed })!);
  assert.ok(night.some((r) => /Last call/.test(r.title)));
  assert.match(buildReminder({ ...base, slot: "evening", seed: 0 })!.title, /3-day streak/);
});

test("same day shares a tag so reminders replace, not stack", () => {
  const tags = (["morning", "midday", "evening", "night"] as const).map((slot) => buildReminder({ ...base, slot })!.tag);
  assert.equal(new Set(tags).size, 1);
});

test("streakEnding counts back from a day", () => {
  assert.equal(streakEnding(new Set([1, 2, 3, 5]), 3), 3);
  assert.equal(streakEnding(new Set([1, 2, 3, 5]), 4), 0);
});

test("every slot has eight distinct versions (English and Hinglish), each reads cleanly", () => {
  for (const slot of ["morning", "midday", "evening", "night"] as const) {
    for (const behind of slot === "morning" ? [false, true] : [false]) {
      const out = [0, 1, 2, 3, 4, 5, 6, 7].map((seed) => buildReminder({ ...base, slot, behind, seed })!);
      assert.equal(new Set(out.map((r) => r.title + r.body)).size, 8, `${slot}${behind ? " behind" : ""}`);
      for (const r of out) assert.doesNotMatch(r.title + r.body, /undefined|null|NaN/);
    }
  }
});
