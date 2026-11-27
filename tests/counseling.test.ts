import { strict as assert } from "node:assert";
import { test } from "node:test";
import { counselingNote, indiaToday, slotDays, slotLabel, validateCounseling } from "../src/lib/counseling";

const TODAY = "2026-11-27";
const full = {
  day: "2026-11-30",
  hour: 18,
  name: "  Rahul   Verma ",
  phone: "98765 43210",
  email: "Rahul@Gmail.COM",
  college: " AKTU ",
  year: "2026",
  role: "Backend",
  question: " How do I   get my first job? ",
};

test("a full request is cleaned: email lowercased, phone with country code, spaces squeezed", () => {
  const r = validateCounseling(full, TODAY);
  assert.deepEqual(r, {
    ok: true,
    data: { day: "2026-11-30", hour: 18, name: "Rahul Verma", phone: "919876543210", email: "rahul@gmail.com", college: "AKTU", year: "2026", role: "Backend", question: "How do I get my first job?" },
  });
});

test("the question is optional; every other missing field gets its own message", () => {
  assert.equal(validateCounseling({ ...full, question: "" }, TODAY).ok, true);
  const r = validateCounseling({}, TODAY);
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ["college", "day", "email", "hour", "name", "phone", "role", "year"]);
});

test("a year or role not on the list is refused", () => {
  const r = validateCounseling({ ...full, year: "1999", role: "Astronaut" }, TODAY);
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ["role", "year"]);
});

test("slots are the next seven days, 5 to 8 PM starts; today, past days and other hours are refused", () => {
  assert.deepEqual(slotDays(TODAY), ["2026-11-28", "2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04"]);
  for (const day of ["2026-11-27", "2026-11-26", "2026-12-05", "soon"]) assert.equal(validateCounseling({ ...full, day }, TODAY).ok, false, day);
  for (const hour of [16, 21, "x"]) assert.equal(validateCounseling({ ...full, hour }, TODAY).ok, false, String(hour));
  assert.equal(validateCounseling({ ...full, hour: "20" }, TODAY).ok, true);
});

test("India's date rolls over at midnight IST, not UTC", () => {
  assert.equal(indiaToday(new Date("2026-11-27T18:29:00Z")), "2026-11-27");
  assert.equal(indiaToday(new Date("2026-11-27T18:31:00Z")), "2026-11-28");
});

test("the Sales note carries the preferred slot, role, year and the question", () => {
  assert.equal(slotLabel("2026-11-30", 18), "Mon 30 Nov, 6 PM");
  const r = validateCounseling(full, TODAY);
  assert.ok(r.ok);
  if (r.ok) assert.equal(counselingNote(r.data, TODAY), "Free counseling request · prefers Mon 30 Nov, 6 PM IST · Backend · passed out 2026 · 2026-11-27 · Wants to ask: How do I get my first job?");
});
