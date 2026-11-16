import { strict as assert } from "node:assert";
import { test } from "node:test";
import { couponCodeProblem, couponOf, couponProblem, endOfDayIST, withCoupon, type Coupon } from "../src/lib/sd-coupons";
import { offerPath } from "../src/lib/sd-offer";

const NOW = new Date("2026-11-16T10:00:00+05:30");
const live: Coupon = { code: "KLYMB499", price: 499, max_uses: null, ends_at: null, paused_at: null, used: 0 };

test("a typed code is cleaned to upper case, and anything odd is no code", () => {
  assert.equal(couponOf(" klymb499 "), "KLYMB499");
  assert.equal(couponOf("AB1"), null, "too short");
  assert.equal(couponOf("KLYMB 499"), null, "no spaces");
  assert.equal(couponOf("X".repeat(21)), null, "too long");
  assert.equal(couponOf(42), null);
  assert.equal(couponCodeProblem(""), null, "blank is fine");
  assert.match(couponCodeProblem("a b")!, /coupon code/);
});

test("a coupon works until it's paused, past its last day, or used up", () => {
  assert.equal(couponProblem(live, NOW), null);
  assert.match(couponProblem(null, NOW)!, /isn't valid/);
  assert.match(couponProblem({ ...live, paused_at: "2026-11-15T00:00:00Z" }, NOW)!, /isn't active/);
  assert.match(couponProblem({ ...live, ends_at: endOfDayIST("2026-11-15") }, NOW)!, /expired/);
  assert.equal(couponProblem({ ...live, ends_at: endOfDayIST("2026-11-16") }, NOW), null, "works through its whole last day in India");
  assert.match(couponProblem({ ...live, max_uses: 3, used: 3 }, NOW)!, /fully used/);
  assert.equal(couponProblem({ ...live, max_uses: 3, used: 2 }, NOW), null);
});

test("a coupon sets the price but never raises it", () => {
  assert.equal(withCoupon(1999, { price: 499 }), 499);
  assert.equal(withCoupon(299, { price: 499 }), 299, "a lower locked price stays");
  assert.equal(withCoupon(1999, null), 1999);
});

test("the last day is the end of that day in India", () => {
  assert.equal(endOfDayIST("2026-11-30"), "2026-11-30T23:59:59+05:30");
  assert.equal(endOfDayIST("30 Nov"), null);
});

test("the coupon rides along through the trip to Google", () => {
  assert.equal(offerPath(null, true, null, "KLYMB499"), "/system-design?claim=1&coupon=KLYMB499");
  assert.equal(offerPath("ig", false), "/system-design?utm_campaign=ig");
});
