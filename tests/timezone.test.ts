import assert from "node:assert/strict";
import { test } from "node:test";
import { IST, dayIn, hourIn, minutesIn, timeZoneOf } from "../src/lib/timezone";
import { paceOf } from "../src/lib/sd-pace";

test("days and hours are read in the given zone, India time by default", () => {
  const at = "2026-11-24T03:00:00Z"; // 08:30 IST, 22:00 the day before in New York
  assert.equal(dayIn(at), "2026-11-24");
  assert.equal(dayIn(at, "America/New_York"), "2026-11-23");
  assert.equal(hourIn(at, IST), 8);
  assert.equal(hourIn(at, "America/New_York"), 22);
  assert.equal(minutesIn(at, IST), 8 * 60 + 30);
  assert.equal(hourIn("2026-11-24T18:30:00Z", IST), 0, "midnight is hour 0, not 24");
});

test("only real IANA zones are kept", () => {
  assert.equal(timeZoneOf("Europe/Berlin"), "Europe/Berlin");
  assert.equal(timeZoneOf("Not/AZone"), null);
  assert.equal(timeZoneOf("x; drop"), null);
  assert.equal(timeZoneOf(""), null);
  assert.equal(timeZoneOf(42), null);
});

test("a learner's lesson day ends at their own midnight", () => {
  const options = { lessons: ["a", "b", "c"], releases: { a: "2026-11-01", b: "2026-11-01", c: "2026-11-01" }, from: "2026-11-01" };
  // Passed "a" at 23:00 on the 23rd in New York: 04:00 on the 24th UTC, 09:30 on the 24th in India.
  const passes = [{ lesson: "a", at: "2026-11-24T04:00:00Z" }];
  const ny = { passes, finals: [], refundable: true, timeZone: "America/New_York" };
  // 20:00 on the 24th in New York: "b" is open and due today there.
  const evening = "2026-11-25T01:00:00Z";
  assert.equal(paceOf(ny, Date.parse(evening), options).state, "open");
  assert.equal(paceOf(ny, Date.parse(evening), options).refund, "on-track");
  // 01:00 on the 25th in New York, 11:30 on the 25th in India: "b" was due on the 24th in New York, so
  // the refund is gone there. On India time the same pass fell on the 24th, so "b" is still due today.
  const later = Date.parse("2026-11-25T06:00:00Z");
  assert.equal(paceOf(ny, later, options).refund, "lost");
  assert.equal(paceOf({ ...ny, timeZone: undefined }, later, options).refund, "on-track");
  assert.equal(paceOf(ny, Date.parse(evening), options).timeZone, "America/New_York");
});
