import { strict as assert } from "node:assert";
import { test } from "node:test";
import { counselingNote, validateCounseling } from "../src/lib/counseling";

const full = { name: "  Rahul   Verma ", phone: "98765 43210", email: "Rahul@Gmail.COM", college: " AKTU ", year: "2026", role: "Backend", question: " How do I   get my first job? " };

test("a full request is cleaned: email lowercased, phone with country code, spaces squeezed", () => {
  const r = validateCounseling(full);
  assert.deepEqual(r, {
    ok: true,
    data: { name: "Rahul Verma", phone: "919876543210", email: "rahul@gmail.com", college: "AKTU", year: "2026", role: "Backend", question: "How do I get my first job?" },
  });
});

test("the question is optional; every other missing field gets its own message", () => {
  assert.equal(validateCounseling({ ...full, question: "" }).ok, true);
  const r = validateCounseling({});
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ["college", "email", "name", "phone", "role", "year"]);
});

test("a year or role not on the list is refused", () => {
  const r = validateCounseling({ ...full, year: "1999", role: "Astronaut" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ["role", "year"]);
});

test("the Sales note carries role, year and the question", () => {
  const r = validateCounseling(full);
  assert.ok(r.ok);
  if (r.ok) assert.equal(counselingNote(r.data, "2026-11-27"), "Free counseling request · Backend · passed out 2026 · 2026-11-27 · Wants to ask: How do I get my first job?");
});
