import { strict as assert } from "node:assert";
import { test } from "node:test";
import { sdReminderPush } from "../src/lib/sd-reminders";

test("the reminder notification opens the lesson it names", () => {
  const m = sdReminderPush({ id: "0-2", title: "Why do applications slow down?", minutes: 7 }, "morning");
  assert.equal(m.url, "/learn/system-design?lesson=0-2");
  assert.match(m.body, /slow down\? · 7 min/);
});

test("with every lesson passed it points at the final assessment", () => {
  const m = sdReminderPush(null, "night");
  assert.equal(m.url, "/learn/system-design");
  assert.match(m.title, /final assessment/);
});

test("three a day, each replacing the last, and only the morning sounds", () => {
  const lesson = { id: "0-0", title: "T", minutes: 6 };
  const [morning, evening, night] = (["morning", "evening", "night"] as const).map((slot) => sdReminderPush(lesson, slot));
  assert.deepEqual([morning.loud, evening.loud, night.loud], [true, false, false]);
  assert.equal(new Set([morning.tag, evening.tag, night.tag]).size, 1);
  assert.equal(new Set([morning.title, evening.title, night.title]).size, 3);
});

test("it greets them by first name, and reads fine without one", () => {
  const lesson = { id: "0-0", title: "T", minutes: 6 };
  assert.equal(sdReminderPush(lesson, "morning", " Sarthak Gupta ").title, "Sarthak, your lesson for today is ready");
  assert.equal(sdReminderPush(lesson, "morning", null).title, "Your lesson for today is ready");
});
