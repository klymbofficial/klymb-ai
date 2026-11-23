import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { WEBINAR, googleCalendarLink, webinarCountdown, webinarDayWord, webinarFee, webinarOpen, webinarProblems, webinarRegistrationOf } from "../src/lib/webinar";

const good = { name: "  Aarav   Sharma ", email: " Aarav@Example.com ", dial: "91", phone: "98765 43210", role: "student" };

test("the webinar is Saturday 5 Dec 2026, 9 to 10 AM Central (8:30 PM IST)", () => {
  assert.equal(new Date(WEBINAR.startsAt).toISOString(), "2026-12-05T15:00:00.000Z");
  assert.equal(new Date(WEBINAR.endsAt).getTime() - new Date(WEBINAR.startsAt).getTime(), 60 * 60 * 1000);
  assert.match(googleCalendarLink(), /dates=20261205T150000Z%2F20261205T160000Z/);
  assert.equal(new Date(WEBINAR.startsAt).getUTCDay(), 6, "a Saturday");
});

test("a seat costs $1, charged in USD cents", () => {
  assert.deepEqual(WEBINAR.price, { amount: 100, currency: "USD", label: "$1" });
  assert.equal(webinarFee(), "$1");
  assert.equal(WEBINAR.defaultDial, "1");
});

test("registration stays open until the webinar ends", () => {
  assert.equal(webinarOpen(new Date("2026-12-05T09:30:00-06:00").getTime()), true);
  assert.equal(webinarOpen(new Date("2026-12-05T10:00:00-06:00").getTime()), false);
});

test("a complete form becomes a clean row", () => {
  const out = webinarRegistrationOf({ ...good, org: "  IIT Delhi ", question: "  How do I start with Claude Code? " });
  assert.ok(out.ok);
  assert.deepEqual(out.row, { name: "Aarav Sharma", email: "aarav@example.com", phone: "+919876543210", role: "student", org: "IIT Delhi", question: "How do I start with Claude Code?" });
});

test("optional fields left blank are saved as null", () => {
  const out = webinarRegistrationOf(good);
  assert.ok(out.ok);
  assert.equal(out.row.org, null);
  assert.equal(out.row.question, null);
});

test("other countries use the country picker's rules", () => {
  const out = webinarRegistrationOf({ ...good, dial: "44", phone: "07700 900123", role: "working" });
  assert.ok(out.ok);
  assert.equal(out.row.phone, "+447700900123");
});

test("missing or wrong answers are named", () => {
  assert.deepEqual(webinarProblems({ name: "A", email: "nope", dial: "91", phone: "12345", role: "" }), [
    "your name", "a valid email", "a 10-digit mobile number", "student or working professional",
  ]);
  const out = webinarRegistrationOf({ ...good, role: "teacher" });
  assert.equal(out.ok, false);
  assert.equal(webinarRegistrationOf(null).ok, false);
});

test("long answers are cut to what the table allows", () => {
  const out = webinarRegistrationOf({ ...good, org: "x".repeat(500), question: "y".repeat(2000) });
  assert.ok(out.ok);
  assert.equal(out.row.org?.length, 120);
  assert.equal(out.row.question?.length, 500);
});

test("the migration keeps one row per email per webinar", () => {
  const sql = readFileSync("db/migrations/0042_webinar_registrations.sql", "utf8");
  assert.match(sql, /create table if not exists course\.webinar_registrations \(/);
  assert.match(sql, /unique \(webinar, email\)/);
  assert.match(sql, /email = lower\(email\)/);
});

test("paid seats are kept on the sign-up row, apart from course payments", () => {
  const sql = readFileSync("db/migrations/0049_webinar_payments.sql", "utf8");
  for (const col of ["amount", "currency", "razorpay_order_id", "razorpay_payment_id", "paid_at"]) {
    assert.match(sql, new RegExp(`add column if not exists ${col} `));
  }
  assert.match(sql, /unique index if not exists webinar_registrations_order_idx/);
  assert.doesNotMatch(sql.replace(/--.*$/gm, ""), /course\.payments/);
});

test("the countdown counts down to 9 AM Central, then goes live, then ends", () => {
  const at = (iso: string) => webinarCountdown(new Date(iso).getTime());
  assert.deepEqual(at("2026-12-04T07:58:55-06:00"), { phase: "before", days: 1, hours: 1, minutes: 1, seconds: 5 });
  assert.equal(at("2026-12-05T09:00:00-06:00").phase, "live");
  assert.equal(at("2026-12-05T09:59:59-06:00").phase, "live");
  assert.deepEqual(at("2026-12-05T10:00:00-06:00"), { phase: "over", days: 0, hours: 0, minutes: 0, seconds: 0 });
});

test("the day word follows the calendar day in US Central time", () => {
  const word = (iso: string) => webinarDayWord(new Date(iso).getTime());
  assert.equal(word("2026-12-04T23:30:00-06:00"), "Tomorrow");
  assert.equal(word("2026-12-05T00:10:00-06:00"), "Today");
  // Already Saturday in India, still Friday in the US.
  assert.equal(word("2026-12-05T08:00:00+05:30"), "Tomorrow");
  assert.equal(word("2026-12-03T12:00:00-06:00"), "");
});
