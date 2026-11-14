import assert from "node:assert/strict";
import { test } from "node:test";
import { joinDetail, joinSource, joinSummary, validateJoin } from "../src/lib/join";

const good = { name: "  Rohan   Sharma ", phone: "098765 43210", email: "Rohan@Gmail.com", status: "student", org: "VIT", level: "3rd year" };

test("join: a good form is cleaned up", () => {
  const r = validateJoin(good);
  assert.ok(r.ok);
  assert.deepEqual(r.data, { name: "Rohan Sharma", phone: "919876543210", email: "rohan@gmail.com", status: "student", org: "VIT", level: "3rd year" });
});

test("join: every field is checked", () => {
  const r = validateJoin({});
  assert.ok(!r.ok);
  assert.deepEqual(Object.keys(r.errors).sort(), ["email", "name", "phone", "status"]);
  const s = validateJoin({ ...good, org: "", level: "" });
  assert.ok(!s.ok);
  assert.deepEqual(Object.keys(s.errors).sort(), ["level", "org"]);
});

test("join: the level must match student or working", () => {
  assert.ok(!validateJoin({ ...good, status: "working", level: "3rd year" }).ok);
  assert.ok(validateJoin({ ...good, status: "working", level: "1–3 years" }).ok);
  assert.ok(!validateJoin({ ...good, status: "robot" }).ok);
});

test("join: ?from= picks the source", () => {
  assert.deepEqual(joinSource("ig"), { source: "socials", tag: "ig" });
  assert.equal(joinSource("IG-Story-14Nov").source, "socials");
  assert.equal(joinSource("webinar-21nov").source, "webinar");
  assert.equal(joinSource("hackathon-dec").source, "hackathon");
  assert.equal(joinSource("college-vit").source, "college");
  assert.equal(joinSource("ref-rohan").source, "referral");
  assert.deepEqual(joinSource(undefined), { source: "website", tag: "" });
  assert.equal(joinSource("<script>").tag, "script");
});

test("join: summary and detail read well", () => {
  assert.equal(joinSummary({ status: "student", level: "3rd year", org: "VIT" }), "Student · 3rd year · VIT");
  assert.equal(joinSummary({ status: "working", level: "1–3 years", org: "TCS" }), "Working · 1–3 years · TCS");
  assert.equal(joinDetail("ig"), "Join form · ig");
  assert.equal(joinDetail(""), "Join form");
});
