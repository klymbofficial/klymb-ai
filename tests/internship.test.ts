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
  const missing = internshipProblems({ name: "", email: "x", dial: "91", phone: "12", city: " ", role: "", hours: "", why: "short", linkedin: "not a link" });
  assert.equal(missing.length, 8);
  assert.ok(missing.includes("your city"));
  const r = internshipApplicationOf({ ...good, hours: "lots" });
  assert.ok(!r.ok);
});

test("the applications table keeps emails lowercase, one per email per intake", () => {
  const sql = readFileSync("db/migrations/0044_internship_applications.sql", "utf8");
  assert.match(sql, /internship_applications_email_lowercase check \(email = lower\(email\)\)/);
  assert.match(sql, /unique \(batch, email\)/);
  assert.doesNotMatch(sql, /create table (?!if not exists)/);
});

test("commission is 20% of what the buyer paid, rounded to the rupee", async () => {
  const { commissionOf } = await import("../src/lib/internship");
  assert.equal(commissionOf(49900), 10000); // ₹499 → ₹100
  assert.equal(commissionOf(199900), 40000); // ₹1,999 → ₹400
  assert.equal(commissionOf(29900), 6000); // ₹299 → ₹60
});

test("orders count in the India-time month they were made", async () => {
  const { monthOf, monthLabel } = await import("../src/lib/internship");
  assert.equal(monthOf("2026-11-30T19:00:00Z"), "2026-12"); // 00:30 IST on 1 Dec
  assert.equal(monthOf("2026-11-30T18:00:00Z"), "2026-11");
  assert.equal(monthLabel("2026-12"), "December 2026");
});

test("an intern's totals count paid and refunded sales, and subtract payouts", async () => {
  const { internTotals } = await import("../src/lib/internship");
  const sales = [
    { intern_code: "ROHAN27", amount: 49900, status: "paid", created_at: "2026-12-05T10:00:00Z", email: "a@x.com" },
    { intern_code: "ROHAN27", amount: 49900, status: "refunded", created_at: "2026-12-06T10:00:00Z", email: "b@x.com" },
    { intern_code: "ROHAN27", amount: 49900, status: "created", created_at: "2026-12-07T10:00:00Z", email: "c@x.com" },
    { intern_code: "ROHAN27", amount: 199900, status: "paid", created_at: "2027-01-02T10:00:00Z", email: "d@x.com" },
  ];
  const payouts = [{ email: "r@x.com", month: "2026-12-01", amount: 20000, paid_at: "2027-01-03T10:00:00Z", method: "upi", reference: null }];
  const dec = internTotals(sales, payouts, "2026-12");
  assert.equal(dec.monthSales, 2);
  assert.equal(dec.monthCommission, 20000);
  assert.equal(dec.monthPaid, 20000);
  assert.equal(dec.earned, 60000);
  assert.equal(dec.owed, 40000);
});

test("intern codes come from the first name and are checked by shape", async () => {
  const { makeInternCode, internCodeOf, internLink } = await import("../src/lib/internship");
  assert.equal(makeInternCode("Rohan Sharma", () => 0.2), "ROHAN28");
  assert.equal(makeInternCode("À", () => 0), "KLYMB10");
  assert.equal(internCodeOf(" rohan27 "), "ROHAN27");
  assert.equal(internCodeOf("x"), null);
  assert.equal(internLink("https://www.klymb.ai", "ROHAN27"), "https://www.klymb.ai/i/ROHAN27");
});

test("the commissions migration is safe to run twice and keeps emails lowercase", () => {
  const sql = readFileSync("db/migrations/0045_intern_commissions.sql", "utf8");
  assert.match(sql, /intern_codes_email_lowercase check \(email = lower\(email\)\)/);
  assert.match(sql, /add column if not exists intern_code/);
  assert.doesNotMatch(sql, /create table (?!if not exists)/);
});
