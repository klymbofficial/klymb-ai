import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { Session } from "next-auth";
import { companyEmailFrom, verifiedEmailFrom } from "../src/auth";

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

// ── Company sign-in codes ───────────────────────────────────
// A code sign-in proves the mailbox, but only company pages accept it:
// admin and the learner course keep requiring Google.

test("a code sign-in is not a verified email for the rest of the site", () => {
  assert.equal(verifiedEmailFrom(session({ email: "dev@acme.com", signInMethod: "email-code" })), null);
  assert.equal(verifiedEmailFrom(session({ email: "dev@acme.com", signInMethod: "email-code", emailIsVerified: false })), null);
});

test("company pages accept a code sign-in, canonicalised", () => {
  assert.equal(companyEmailFrom(session({ email: " Dev@Acme.com ", signInMethod: "email-code" })), "dev@acme.com");
});

test("company pages still accept a Google-verified email, old sessions included", () => {
  assert.equal(companyEmailFrom(session({ email: "hr@acme.com", emailIsVerified: true, signInMethod: "google" })), "hr@acme.com");
  assert.equal(companyEmailFrom(session({ email: "hr@acme.com", emailIsVerified: true })), "hr@acme.com");
});

test("company pages refuse unverified Google, unknown methods and empty sessions", () => {
  assert.equal(companyEmailFrom(session({ email: "x@acme.com", emailIsVerified: false, signInMethod: "google" })), null);
  assert.equal(companyEmailFrom(session({ email: "x@acme.com" })), null);
  assert.equal(companyEmailFrom(session({ email: "x@acme.com", signInMethod: "magic" })), null);
  assert.equal(companyEmailFrom(session({ email: "not-an-email", signInMethod: "email-code" })), null);
  assert.equal(companyEmailFrom(session(null)), null);
  assert.equal(companyEmailFrom(null), null);
});
