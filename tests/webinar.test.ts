import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { WEBINAR, googleCalendarLink, webinarCountdown, webinarDayWord, webinarOpen, webinarProblems, webinarRegistrationOf } from "../src/lib/webinar";

const good = { name: "  Aarav   Sharma ", email: " Aarav@Example.com ", dial: "91", phone: "98765 43210", role: "student" };

test("the webinar is Saturday 21 Nov 2026, 7 to 8 PM IST", () => {
  assert.equal(new Date(WEBINAR.startsAt).toISOString(), "2026-11-21T13:30:00.000Z");
  assert.equal(new Date(WEBINAR.endsAt).getTime() - new Date(WEBINAR.startsAt).getTime(), 60 * 60 * 1000);
  assert.match(googleCalendarLink(), /dates=20261121T133000Z%2F20261121T143000Z/);
});

test("registration stays open until the webinar ends", () => {
  assert.equal(webinarOpen(new Date("2026-11-21T19:30:00+05:30").getTime()), true);
  assert.equal(webinarOpen(new Date("2026-11-21T20:00:00+05:30").getTime()), false);
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

test("the countdown counts down to 7 PM IST, then goes live, then ends", () => {
  const at = (iso: string) => webinarCountdown(new Date(iso).getTime());
  assert.deepEqual(at("2026-11-20T17:58:55+05:30"), { phase: "before", days: 1, hours: 1, minutes: 1, seconds: 5 });
  assert.equal(at("2026-11-21T19:00:00+05:30").phase, "live");
  assert.equal(at("2026-11-21T19:59:59+05:30").phase, "live");
  assert.deepEqual(at("2026-11-21T20:00:00+05:30"), { phase: "over", days: 0, hours: 0, minutes: 0, seconds: 0 });
});

test("the day word follows the calendar day in India", () => {
  const word = (iso: string) => webinarDayWord(new Date(iso).getTime());
  assert.equal(word("2026-11-20T23:30:00+05:30"), "Tomorrow");
  assert.equal(word("2026-11-21T00:10:00+05:30"), "Today");
  assert.equal(word("2026-11-19T12:00:00+05:30"), "");
});
