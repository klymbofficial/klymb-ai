import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { INTERNSHIP, internshipApplicationOf, internshipProblems } from "../src/lib/internship";

const good = { name: " Rohan  Sharma ", email: "Rohan@Gmail.com", dial: "91", phone: "98765 43210", role: "student", hours: "10to20", why: "I talk to people all day and love selling things I use.", linkedin: "", instagram: "@rohan", city: " Pune ", org: "DTU, 3rd year", experience: "" };

test("the internship starts on 1 Dec 2026, for 3 months, at 20% commission", () => {
  assert.equal(INTERNSHIP.startsLabel, "1 December 2026");
  assert.equal(INTERNSHIP.months, 3);
  assert.equal(INTERNSHIP.commissionPct, 20);
});

test("a full application becomes a clean row", () => {
  const r = internshipApplicationOf(good);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.row.name, "Rohan Sharma");
  assert.equal(r.row.email, "rohan@gmail.com");
  assert.equal(r.row.phone, "+919876543210");
  assert.equal(r.row.instagram, "rohan");
  assert.equal(r.row.city, "Pune");
  assert.equal(r.row.sales_experience, null);
  assert.equal(r.row.linkedin, null);
});

test("name, email, phone, role, time and a reason are needed; a bad LinkedIn link is caught", () => {
  const missing = internshipProblems({ name: "", email: "x", dial: "91", phone: "12", role: "", hours: "", why: "short", linkedin: "not a link" });
  assert.equal(missing.length, 7);
  const r = internshipApplicationOf({ ...good, hours: "lots" });
  assert.ok(!r.ok);
});

test("the applications table keeps emails lowercase, one per email per intake", () => {
  const sql = readFileSync("db/migrations/0044_internship_applications.sql", "utf8");
  assert.match(sql, /internship_applications_email_lowercase check \(email = lower\(email\)\)/);
  assert.match(sql, /unique \(batch, email\)/);
  assert.doesNotMatch(sql, /create table (?!if not exists)/);
});
