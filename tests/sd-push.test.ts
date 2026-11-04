import { strict as assert } from "node:assert";
import { test } from "node:test";
import { sdReminderPush } from "../src/lib/sd-reminders";

test("the reminder notification opens the lesson it names", () => {
  const m = sdReminderPush({ id: "0-2", title: "Why do applications slow down?", minutes: 7 });
  assert.equal(m.url, "/learn/system-design?lesson=0-2");
  assert.match(m.body, /slow down\? · 7 min/);
});

test("with every lesson passed it points at the final assessment", () => {
  const m = sdReminderPush(null);
  assert.equal(m.url, "/learn/system-design");
  assert.match(m.title, /final assessment/);
});
