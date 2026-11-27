import { strict as assert } from "node:assert";
import { test } from "node:test";
import { counselingNote, validateCounseling } from "../src/lib/counseling";

const full = { name: "  Rahul   Verma ", phone: "98765 43210", email: "Rahul@Gmail.COM", college: " AKTU ", year: "2026", role: "Backend", question: " How do I   get my first job? " };

test("a full request is cleaned: email lowercased, phone with country code, spaces squeezed", () => {
  const r = validateCounseling(full);
  assert.deepEqual(r, {
    ok: true,
    data: { name: "Rahul Verma", phone: "919876543210", role: "Backend", email: "rahul@gmail.com", college: "AKTU", year: "2026", question: "How do I get my first job?" },
  });
});

test("only name, WhatsApp and career interest are required", () => {
  const r = validateCounseling({});
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ["name", "phone", "role"]);
  assert.deepEqual(validateCounseling({ name: "Rahul", phone: "9876543210", role: "Not sure yet" }), {
    ok: true,
    data: { name: "Rahul", phone: "919876543210", role: "Not sure yet", email: "", college: "", year: "", question: "" },
  });
});

test("optional fields are still checked when given; a role not on the list is refused", () => {
  const r = validateCounseling({ ...full, email: "rahul@gmail", year: "1999", role: "Astronaut" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ["email", "role", "year"]);
});

test("the Sales note carries role, year and the question, and skips what was left out", () => {
  const r = validateCounseling(full);
  assert.ok(r.ok);
  if (r.ok) assert.equal(counselingNote(r.data, "2026-11-27"), "Free counseling request · Backend · passed out 2026 · 2026-11-27 · Wants to ask: How do I get my first job?");
  const bare = validateCounseling({ name: "Rahul", phone: "9876543210", role: "Backend" });
  assert.ok(bare.ok);
  if (bare.ok) assert.equal(counselingNote(bare.data, "2026-11-27"), "Free counseling request · Backend · 2026-11-27");
});
