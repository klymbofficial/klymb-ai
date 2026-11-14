import { strict as assert } from "node:assert";
import { test } from "node:test";
import { referralTree, type ReferralPayment } from "../src/lib/admin/referral-tree";

const pay = (email: string, referred_by: string | null = null, created_at = "2026-11-01", status = "paid"): ReferralPayment => ({ email, referred_by, created_at, status, amount: 49900 });

test("friends of friends nest under whoever started it, biggest tree first", () => {
  const [top, next] = referralTree([pay("a"), pay("b", "a"), pay("c", "b"), pay("d", "a"), pay("x"), pay("y", "x"), pay("loner")]);
  assert.equal(top.email, "a");
  assert.equal(top.total, 3);
  assert.deepEqual(top.children.map((c) => c.email), ["b", "d"]);
  assert.equal(top.children[0].children[0].email, "c");
  assert.equal(next.email, "x");
});

test("people outside any referral are left out", () => {
  assert.deepEqual(referralTree([pay("loner")]), []);
});

test("a referrer with no payment still shows", () => {
  const [top] = referralTree([pay("b", "ghost")]);
  assert.equal(top.email, "ghost");
  assert.equal(top.payment, null);
});

test("a loop or a self-referral can't hang it or repeat anyone", () => {
  const [top] = referralTree([pay("a", "b"), pay("b", "a")]);
  assert.equal(top.total, 1);
  assert.deepEqual(referralTree([pay("a", "a")]), []);
});

test("buying again lists a person once, by their latest payment", () => {
  const [top] = referralTree([pay("a"), pay("b", "a", "2026-11-01", "refunded"), pay("b", "a", "2026-11-02")]);
  assert.equal(top.total, 1);
  assert.equal(top.children[0].payment?.status, "paid");
});
