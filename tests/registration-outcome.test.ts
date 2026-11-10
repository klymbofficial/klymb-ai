import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { getTrack } from "../src/data/tracks";
import { successModel, type RegistrationOutcome } from "../src/lib/registration-outcome";
import { signInFailedPath } from "../src/lib/sd-offer";
import { orderedErrors, REGISTRATION_FIELD_ORDER, validateRegistration, emptyRegistration } from "../src/lib/validation";

const qa = getTrack("qa-engineer")!;
const pm = getTrack("project-manager")!;

const base: RegistrationOutcome = {
  enrolled: true, sameTrack: true, duplicate: false, track: qa, email: "a@b.co",
};

test("a new place: straight to Day 1", () => {
  const m = successModel(base);
  assert.equal(m.action, "start-day-1");
  assert.match(m.lead, /QA Engineer/);
});

test("a place already on another track is never reported as the new one", () => {
  const m = successModel({ ...base, sameTrack: false, placeTrack: pm });
  assert.equal(m.action, "open-course");
  assert.match(m.lead, /Project Manager/);
  assert.doesNotMatch(m.title + m.lead, /reserved/);
});

test("a registration saved without a place says so and offers a retry", () => {
  const m = successModel({ ...base, enrolled: false });
  assert.equal(m.tone, "saved");
  assert.equal(m.action, "retry");
  assert.doesNotMatch(m.title, /in\./);
});

test("a repeat registration is told nothing was duplicated", () => {
  assert.match(successModel({ ...base, duplicate: true }).repeatNote ?? "", /nothing was duplicated/);
});

test("the success copy promises no email, price or date it cannot keep", () => {
  for (const o of [base, { ...base, enrolled: false }, { ...base, sameTrack: false, placeTrack: pm }]) {
    const text = JSON.stringify(successModel(o));
    assert.doesNotMatch(text, /₹|free|refund|certificate|guarantee|welcome email/i);
  }
});

test("mistakes are listed in the order the form shows them", () => {
  const found = validateRegistration(emptyRegistration);
  const keys = orderedErrors(found).map(([k]) => k);
  assert.deepEqual(keys, REGISTRATION_FIELD_ORDER.filter((k) => found[k]));
  assert.equal(keys[0], "name");
  assert.ok(keys.indexOf("track") < keys.indexOf("github"));
});

test("backing out of Google returns to /register with only the track, never anything typed", () => {
  assert.equal(signInFailedPath("http://localhost:3112/register?track=qa-engineer"), "/register?track=qa-engineer&signin=failed");
  assert.equal(signInFailedPath("/register"), "/register?signin=failed");
  // Anything else that rode along (a name, an email) is dropped, and a track that is not a plain slug is too.
  assert.equal(signInFailedPath("/register?track=qa-engineer&name=Asha&email=a@b.co&phone=9"), "/register?track=qa-engineer&signin=failed");
  assert.equal(signInFailedPath("/register?track=<script>"), "/register?signin=failed");
  assert.equal(signInFailedPath("https://evil.example/register?track=x"), "/register?track=x&signin=failed", "only the path is ever used");
});

/**
 * The ownership rule, checked where it lives. Source-level on purpose: the
 * action needs a session and a database, and what matters is order: with no
 * verified session it must return before it reads or writes anything.
 */
test("registerInterest returns before any read or write when nobody is signed in", () => {
  const src = readFileSync(new URL("../src/app/(register)/register/actions.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const fn = src.slice(src.indexOf("export async function registerInterest"), src.indexOf("async function checkRepoExists"));
  const guard = fn.indexOf("if (!email) {");
  assert.ok(guard > 0, "there is a sign-in guard");
  for (const effect of ["checkRepoExists(", "checkRateLimit(", "db()", "sql.", "ensureLearner(", "sendWelcome(", "after("]) {
    const at = fn.indexOf(effect);
    assert.ok(at > guard, `${effect} comes after the guard`);
  }
  assert.doesNotMatch(fn, /input\.email/, "the address comes from the session, never from the browser");
  assert.match(fn, /const email = await currentEmail\(\);/);
});

test("the registration form has no email field and the page never sends details in an address", () => {
  const form = readFileSync(new URL("../src/components/home/RegistrationForm.tsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.doesNotMatch(form, /id="email"/);
  assert.match(form, /method="post"/);
  const signIn = readFileSync(new URL("../src/components/home/RegisterSignIn.tsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.doesNotMatch(signIn, /name="(name|email|phone|github|linkedin)"/);
});
