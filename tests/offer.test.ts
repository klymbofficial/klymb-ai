import { strict as assert } from "node:assert";
import { test } from "node:test";
import { priceNow } from "../src/lib/offer";

const during = new Date("2026-10-20T12:00:00+05:30");
const lastMinute = new Date("2026-10-31T23:59:00+05:30");
const after = new Date("2026-11-01T00:00:00+05:30");

test("every paid track is ₹449 during the launch, list price after", () => {
  for (const list of [4999, 6999, 12999]) {
    assert.equal(priceNow(list, during), 449);
    assert.equal(priceNow(list, lastMinute), 449);
    assert.equal(priceNow(list, after), list);
  }
});

test("free tracks stay free", () => {
  assert.equal(priceNow(0, during), 0);
});
