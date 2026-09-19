import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { Session } from "next-auth";
import { verifiedEmailFrom } from "../src/auth";

const session = (user: Record<string, unknown> | null): Session =>
  ({ user, expires: "2099-01-01" }) as unknown as Session;

test("accepts a provider-verified address, canonicalised", () => {
  assert.equal(verifiedEmailFrom(session({ email: "Sarthak@Klymb.ai", emailIsVerified: true })), "sarthak@klymb.ai");
});

test("refuses an unverified address", () => {
  assert.equal(verifiedEmailFrom(session({ email: "attacker@klymb.ai", emailIsVerified: false })), null);
});

test("refuses when the claim is missing entirely", () => {
  assert.equal(verifiedEmailFrom(session({ email: "attacker@klymb.ai" })), null);
});

test("refuses empty sessions", () => {
  assert.equal(verifiedEmailFrom(null), null);
  assert.equal(verifiedEmailFrom(session(null)), null);
});

test("refuses a verified flag with no usable address", () => {
  assert.equal(verifiedEmailFrom(session({ email: "not-an-email", emailIsVerified: true })), null);
});
