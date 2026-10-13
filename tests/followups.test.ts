import { strict as assert } from "node:assert";
import { test } from "node:test";
import { dueFollowup } from "../src/lib/followups";

const at = new Date("2026-10-13T10:00:00Z");
const after = (h: number) => new Date(at.getTime() + h * 3_600_000);

test("first follow-up after an hour, not before", () => {
  assert.equal(dueFollowup(0, at, after(0.5)), null);
  assert.equal(dueFollowup(0, at, after(1)), 1);
});

test("second after a day, third after three days", () => {
  assert.equal(dueFollowup(1, at, after(23)), null);
  assert.equal(dueFollowup(1, at, after(24)), 2);
  assert.equal(dueFollowup(2, at, after(71)), null);
  assert.equal(dueFollowup(2, at, after(72)), 3);
});

test("a late run skips ahead instead of sending a burst", () => {
  assert.equal(dueFollowup(0, at, after(30)), 2);
  assert.equal(dueFollowup(0, at, after(100)), 3);
});

test("nothing after the third", () => {
  assert.equal(dueFollowup(3, at, after(500)), null);
});
