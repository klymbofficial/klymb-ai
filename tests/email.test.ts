import { strict as assert } from "node:assert";
import { test } from "node:test";
import { normaliseEmail, sameEmail } from "../src/lib/email";

test("normalises case and surrounding space", () => {
  assert.equal(normaliseEmail("  Sarthak@Klymb.AI "), "sarthak@klymb.ai");
});

test("rejects values that are not addresses", () => {
  for (const bad of ["", "   ", "nope", "a@b", "a b@c.com", null, undefined, 42, "x".repeat(250) + "@y.com"]) {
    assert.equal(normaliseEmail(bad as unknown), null, `expected null for ${String(bad)}`);
  }
});

test("identity comparison is exact, not a pattern", () => {
  assert.equal(sameEmail("Admin@klymb.ai", "admin@klymb.ai"), true);
  // The ILIKE bug: '_' and '%' must never behave as wildcards.
  assert.equal(sameEmail("a_min@klymb.ai", "admin@klymb.ai"), false);
  assert.equal(sameEmail("%@klymb.ai", "admin@klymb.ai"), false);
  assert.equal(sameEmail("admin@klymb.ai", "admin@klymb.ai.evil.com"), false);
});
