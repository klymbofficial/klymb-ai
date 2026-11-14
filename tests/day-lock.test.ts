import { strict as assert } from "node:assert";
import { test } from "node:test";
import { dayActionLabel, dayLockFor, nextDayFor } from "../src/lib/day-lock";

test("Day 1 is always open", () => {
  assert.equal(dayLockFor({ day: 1, price: 6999, paid: false, submittedDays: [] }), "open");
});

test("days unlock in order", () => {
  assert.equal(dayLockFor({ day: 3, price: 6999, paid: true, submittedDays: [1] }), "previous");
  assert.equal(dayLockFor({ day: 3, price: 6999, paid: true, submittedDays: [1, 2] }), "open");
});

test("a paid track asks for payment before Day 2, and before the order rule", () => {
  assert.equal(dayLockFor({ day: 2, price: 6999, paid: false, submittedDays: [1] }), "pay");
  assert.equal(dayLockFor({ day: 5, price: 6999, paid: false, submittedDays: [] }), "pay");
});

test("free tracks only follow the order rule", () => {
  assert.equal(dayLockFor({ day: 2, price: 0, paid: false, submittedDays: [1] }), "open");
  assert.equal(dayLockFor({ day: 3, price: 0, paid: false, submittedDays: [1] }), "previous");
});

test("a submitted day stays open for review", () => {
  assert.equal(dayLockFor({ day: 4, price: 6999, paid: false, submittedDays: [4] }), "open");
});

test("the next day is the first one not submitted, and none once all are in", () => {
  assert.equal(nextDayFor([], 30), 1);
  assert.equal(nextDayFor([1, 2, 3], 30), 4);
  assert.equal(nextDayFor(Array.from({ length: 30 }, (_, i) => i + 1), 30), null);
});

test("a day's button says start, continue or review", () => {
  assert.equal(dayActionLabel(1, false), "Start Day 1");
  assert.equal(dayActionLabel(7, false), "Continue Day 7");
  assert.equal(dayActionLabel(7, true), "Review Day 7");
});
