import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { Session } from "next-auth";
import { adminEmailFrom, companyEmailFrom, verifiedEmailFrom } from "../src/auth";

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

test("a code sign-in never counts as verified, even with the flag forced on", () => {
  assert.equal(verifiedEmailFrom(session({ email: "dev@acme.com", signInMethod: "email-code", emailIsVerified: true })), null);
});

// ── Klymb admin is Google-only ──────────────────────────────
// Admin access is granted by email, so the only identity it accepts is a
// Google-verified one. Being invited to a company must never open it.

test("admin accepts a Google sign-in, canonicalised", () => {
  assert.equal(adminEmailFrom(session({ email: "Owner@Klymb.ai", emailIsVerified: true, signInMethod: "google" })), "owner@klymb.ai");
});

test("admin keeps accepting Google sessions from before sign-in methods were recorded", () => {
  assert.equal(adminEmailFrom(session({ email: "owner@klymb.ai", emailIsVerified: true })), "owner@klymb.ai");
});

test("admin refuses a company email-code sign-in, whatever else the session claims", () => {
  for (const extra of [{}, { emailIsVerified: false }, { emailIsVerified: true }]) {
    assert.equal(adminEmailFrom(session({ email: "owner@klymb.ai", signInMethod: "email-code", ...extra })), null, JSON.stringify(extra));
  }
});

test("admin refuses any method it doesn't know", () => {
  for (const signInMethod of ["magic-link", "credentials", "Google", "", null]) {
    assert.equal(adminEmailFrom(session({ email: "owner@klymb.ai", emailIsVerified: true, signInMethod })), null, String(signInMethod));
  }
});

test("admin refuses an unverified Google address and empty sessions", () => {
  assert.equal(adminEmailFrom(session({ email: "owner@klymb.ai", emailIsVerified: false, signInMethod: "google" })), null);
  assert.equal(adminEmailFrom(session({ email: "owner@klymb.ai", signInMethod: "google" })), null);
  assert.equal(adminEmailFrom(session({ email: "not-an-email", emailIsVerified: true, signInMethod: "google" })), null);
  assert.equal(adminEmailFrom(session(null)), null);
  assert.equal(adminEmailFrom(null), null);
});

test("the same email is a company member by code but never an admin", () => {
  const codeSession = session({ email: "owner@klymb.ai", signInMethod: "email-code" });
  assert.equal(companyEmailFrom(codeSession), "owner@klymb.ai");
  assert.equal(adminEmailFrom(codeSession), null);
});

test("every admin check reads the Google-only identity", () => {
  // getAdmin is the one door: requireAdmin, requireOwner and every admin
  // data function and action go through it.
  const adminAuth = readFileSync("src/lib/admin/auth.ts", "utf8");
  assert.match(adminAuth, /resolveAdmin\(await currentAdminEmail\(\)/);
  assert.doesNotMatch(adminAuth, /currentEmail\b|verifiedEmailFrom|companyEmailFrom/);
  const loginPage = readFileSync("src/app/admin/login/page.tsx", "utf8");
  assert.doesNotMatch(loginPage, /currentEmail\b|companyEmailFrom/);
});

test("a code sign-in is explicitly marked unverified when the token is made", () => {
  const authSource = readFileSync("src/auth.ts", "utf8");
  assert.match(authSource, /token\.signInMethod = "email-code";\s*(\/\/.*\s*)*token\.emailIsVerified = false;/);
});
