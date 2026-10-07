import { strict as assert } from "node:assert";
import { test } from "node:test";
import { buildReminder, slotForIstHour, streakEnding, type ReminderInput } from "../src/lib/reminders";

const base: ReminderInput = { slot: "morning", name: "Divya", day: 4, title: "API testing", minutes: 105, kind: "build", streak: 3, doneToday: false, behind: false, seed: 1 };

test("slots map to IST hours, nothing before 8am", () => {
  assert.deepEqual([7, 9, 14, 20].map(slotForIstHour), [null, "morning", "midday", "night"]);
});

test("once today is done, only the morning message ever goes", () => {
  for (const slot of ["midday", "night"] as const) assert.equal(buildReminder({ ...base, slot, doneToday: true }), null);
  assert.ok(buildReminder({ ...base, doneToday: true }));
});

test("behind on yesterday: points to yesterday's day", () => {
  const r = buildReminder({ ...base, behind: true })!;
  assert.equal(r.url, "/learn/day/3");
  assert.match(r.body, /Day 3/);
});

test("streak shows up in the copy", () => {
  assert.match(buildReminder({ ...base, slot: "midday", seed: 0 })!.title, /3-day streak/);
});

test("only the morning reminder makes a sound", () => {
  assert.deepEqual((["morning", "midday", "night"] as const).map((slot) => buildReminder({ ...base, slot })!.loud), [true, false, false]);
});

test("no spam-trigger wording in any version", () => {
  for (const slot of ["morning", "midday", "night"] as const)
    for (const behind of [false, true])
      for (const seed of [0, 1, 2, 3, 4, 5, 6, 7]) {
        const r = buildReminder({ ...base, slot, behind, seed })!;
        assert.doesNotMatch(r.title + r.body, /last call|hours left|khatre|ab ya kabhi|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/iu, `${slot} ${seed}`);
      }
});

test("same day shares a tag so reminders replace, not stack", () => {
  const tags = (["morning", "midday", "night"] as const).map((slot) => buildReminder({ ...base, slot })!.tag);
  assert.equal(new Set(tags).size, 1);
});

test("streakEnding counts back from a day", () => {
  assert.equal(streakEnding(new Set([1, 2, 3, 5]), 3), 3);
  assert.equal(streakEnding(new Set([1, 2, 3, 5]), 4), 0);
});

test("every slot has eight distinct versions (English and Hinglish), each reads cleanly", () => {
  for (const slot of ["morning", "midday", "night"] as const) {
    for (const behind of slot === "morning" ? [false, true] : [false]) {
      const out = [0, 1, 2, 3, 4, 5, 6, 7].map((seed) => buildReminder({ ...base, slot, behind, seed })!);
      assert.equal(new Set(out.map((r) => r.title + r.body)).size, 8, `${slot}${behind ? " behind" : ""}`);
      for (const r of out) assert.doesNotMatch(r.title + r.body, /undefined|null|NaN/);
    }
  }
});

test("behind: later nudges name the same day the button opens", () => {
  for (const slot of ["midday", "night"] as const)
    for (const seed of [0, 1, 2, 3, 4, 5, 6, 7]) {
      const r = buildReminder({ ...base, slot, behind: true, behindTitle: "Triage basics", seed })!;
      assert.equal(r.url, "/learn/day/3");
      assert.doesNotMatch(r.title + r.body, /Day 4/, `${slot} ${seed}: ${r.title} ${r.body}`);
    }
});
