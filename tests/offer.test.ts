import { strict as assert } from "node:assert";
import { test } from "node:test";
import { LAUNCH_OFFER, offerOpen, priceNow } from "../src/lib/offer";

const during = new Date("2026-10-20T12:00:00+05:30");
const lastMinute = new Date("2026-10-31T23:59:00+05:30");
const after = new Date("2026-11-01T00:00:00+05:30");

test("₹2,000 off during the offer, full price after it ends", () => {
  assert.equal(priceNow(12999, during), 10999);
  assert.equal(priceNow(12999, lastMinute), 10999);
  assert.equal(priceNow(12999, after), 12999);
});

test("the offer closes once 50 seats are taken", () => {
  assert.equal(offerOpen(during, LAUNCH_OFFER.seats - 1), true);
  assert.equal(offerOpen(during, LAUNCH_OFFER.seats), false);
  assert.equal(priceNow(4999, during, 50), 4999);
});

test("free tracks stay free", () => {
  assert.equal(priceNow(0, during), 0);
});
