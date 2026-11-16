import assert from "node:assert/strict";
import { test } from "node:test";
import { currencyOf, localEstimate } from "../src/lib/local-price";

test("only visitors outside India, from a country we know, get a local figure", () => {
  assert.equal(currencyOf("IN"), null);
  assert.equal(currencyOf(null), null);
  assert.equal(currencyOf("pk"), "PKR");
  assert.equal(currencyOf("ZZ"), null);
});

test("the local figure is rounded and marked as approximate", () => {
  assert.equal(localEstimate(1999, { currency: "PKR", rate: 3.3567 }), "≈ PKR 6,710");
  assert.equal(localEstimate(499, { currency: "USD", rate: 0.01186 }), "≈ USD 6");
  assert.equal(localEstimate(1999, { currency: "USD", rate: 0.01186 }), "≈ USD 23.5");
});
