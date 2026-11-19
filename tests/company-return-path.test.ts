import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { safeOrgNext, signInHref } from "../src/lib/company/return-path";

/**
 * After company sign-in, someone goes back to the workspace page they asked
 * for. The path arrives from the URL and the form, so every way it could lead
 * off the site, or out of /org, must fall back to /org.
 */

test("a workspace page, with or without a query, is followed as it is", () => {
  for (const path of [
    "/org/acme",
    "/org/acme/",
    "/org/acme/learning",
    "/org/dev-company-two/people",
    "/org/acme/learning?team=eng",
    "/org/acme/batches/2026-q4/review?attempt=3&tab=rubric",
    "/org/acme/people/dev%40acme.com",
  ]) {
    assert.equal(safeOrgNext(path), path, path);
  }
});

test("anything off the site is refused", () => {
  for (const path of [
    "https://evil.example/org/acme",
    "//evil.example/org/acme",
    "/\\evil.example",
    "\\\\evil.example",
    "javascript:alert(1)",
    "/org/acme@evil.example",
    " /org/acme",
    "/org/acme\n",
    "/org/acme#x",
  ]) {
    assert.equal(safeOrgNext(path), null, JSON.stringify(path));
  }
});

test("anything outside a workspace is refused, including a climb out of /org", () => {
  for (const path of [
    "/admin",
    "/learn",
    "/org",
    "/org/",
    "/organizations",
    "/org/sign-in",
    "/org/sign-in?next=/org/acme",
    "/org/acme/../../admin",
    "/org/acme/./x",
    "/org/acme/%2e%2e/%2e%2e/admin",
    "/org/acme/%2E%2E/admin",
    "/org/acme/%2fadmin",
    "/org/acme/%5cadmin",
    "/org/acme/%zz",
    "/org/Acme",
    "/org/acme//admin",
  ]) {
    assert.equal(safeOrgNext(path), null, path);
  }
});

test("only a string of sensible length counts", () => {
  for (const value of [undefined, null, "", 7, ["/org/acme"], { toString: () => "/org/acme" }]) {
    assert.equal(safeOrgNext(value), null, String(value));
  }
  assert.equal(safeOrgNext(`/org/acme/${"a".repeat(600)}`), null);
});

test("the sign-in link carries a safe path, encoded, and drops an unsafe one", () => {
  assert.equal(signInHref("/org/acme/learning?team=eng"), "/org/sign-in?next=%2Forg%2Facme%2Flearning%3Fteam%3Deng");
  assert.equal(signInHref("https://evil.example"), "/org/sign-in");
  assert.equal(signInHref(null), "/org/sign-in");
});

test("the layout, page and action all check the path before using it", () => {
  const layout = readFileSync("src/app/org/[slug]/layout.tsx", "utf8");
  assert.match(layout, /redirect\(signInHref\(/);
  const page = readFileSync("src/app/org/sign-in/page.tsx", "utf8");
  assert.match(page, /safeOrgNext\(\(await searchParams\)\.next\)/);
  const action = readFileSync("src/app/org/sign-in/actions.ts", "utf8");
  assert.match(action, /redirect\(safeOrgNext\(formData\.get\("next"\)\) \?\? "\/org"\)/);
  assert.doesNotMatch(action, /redirect\(formData/);
});
