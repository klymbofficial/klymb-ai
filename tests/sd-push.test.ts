import { strict as assert } from "node:assert";
import { test } from "node:test";
import { COURSE_LESSONS, pushStanding, sdReminderPush } from "../src/lib/sd-reminders";

const day3 = COURSE_LESSONS.find((l) => l.id === "0-2")!;
const fresh = { started: false, streak: 0, lapsed: false };

test("a learner with nothing special gets the lesson's own hook", () => {
  const m = sdReminderPush(day3, "morning", "Sarthak Gupta", fresh);
  assert.equal(m.title, "Users badhe, app slow. Kyun? 🤔");
  assert.equal(m.body, "Sarthak, aaj samjho apps slow kyun hoti hain. Day 3 ready hai.");
  assert.equal(m.url, "/learn/system-design?lesson=0-2");
  assert.equal(sdReminderPush(day3, "evening", "Sarthak", fresh).title, "App slow hai. Pehle kya check karoge?");
  assert.equal(sdReminderPush(day3, "night", "Sarthak", fresh).title, "Sarthak, aaj ka lesson kar lein?");
});

test("started, lapsed and streak each speak differently, started first", () => {
  assert.match(sdReminderPush(day3, "morning", "A", { ...fresh, started: true, lapsed: true }).title, /shuru kiya tha/);
  assert.match(sdReminderPush(day3, "morning", "A", { ...fresh, lapsed: true }).title, /Koi baat nahi/);
  assert.match(sdReminderPush(day3, "night", "A", { ...fresh, streak: 4 }).title, /4 din ki streak/);
});

test("it reads fine with no name, and for the final assessment", () => {
  assert.equal(sdReminderPush(day3, "night", null, fresh).title, "Aaj ka lesson kar lein?");
  assert.equal(sdReminderPush(null, "night", "Sarthak", fresh).body, "Yeh kar lo aur course poora.");
});

test("only the morning sounds, and each replaces the last", () => {
  const all = (["morning", "evening", "night"] as const).map((s) => sdReminderPush(day3, s, "A", fresh));
  assert.deepEqual(all.map((m) => m.loud), [true, false, false]);
  assert.equal(new Set(all.map((m) => m.tag)).size, 1);
});

test("no spam wording in any combination", () => {
  for (const lesson of [...COURSE_LESSONS, null]) for (const slot of ["morning", "evening", "night"] as const) for (const s of [fresh, { ...fresh, started: true }, { ...fresh, lapsed: true }, { ...fresh, streak: 5 }]) {
    const m = sdReminderPush(lesson, slot, "A", s);
    assert.doesNotMatch(`${m.title} ${m.body}`, /last call|hurry|undefined/i);
  }
});

test("standing comes from the dates of their passes", () => {
  assert.deepEqual(pushStanding([], false, "2026-11-05"), fresh);
  assert.deepEqual(pushStanding(["2026-11-04", "2026-11-03"], false, "2026-11-05"), { started: false, streak: 2, lapsed: false });
  assert.deepEqual(pushStanding(["2026-11-01"], true, "2026-11-05"), { started: true, streak: 0, lapsed: true });
});
