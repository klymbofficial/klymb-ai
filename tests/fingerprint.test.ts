import { strict as assert } from "node:assert";
import { test } from "node:test";
import { callerFingerprint } from "../src/lib/fingerprint";

const salt = "test-salt";

test("same caller yields the same fingerprint", () => {
  assert.equal(callerFingerprint("203.0.113.5", null, salt), callerFingerprint("203.0.113.5", null, salt));
});

test("different callers differ", () => {
  assert.notEqual(callerFingerprint("203.0.113.5", null, salt), callerFingerprint("203.0.113.6", null, salt));
});

test("uses the first entry of a forwarded chain", () => {
  assert.equal(
    callerFingerprint("203.0.113.5, 70.41.3.18, 150.172.238.178", null, salt),
    callerFingerprint("203.0.113.5", null, salt),
  );
});

test("never returns the raw address", () => {
  const fp = callerFingerprint("203.0.113.5", null, salt);
  assert.ok(!fp.includes("203.0.113.5"));
  assert.match(fp, /^[0-9a-f]{32}$/);
});

test("a different salt gives a different value", () => {
  assert.notEqual(callerFingerprint("203.0.113.5", null, "a"), callerFingerprint("203.0.113.5", null, "b"));
});

test("falls back safely when no address is present", () => {
  assert.match(callerFingerprint(null, null, salt), /^[0-9a-f]{32}$/);
});
