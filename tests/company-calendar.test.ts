import { test } from "node:test";
import assert from "node:assert/strict";
import { deadlineCalendarLink } from "../src/lib/company/calendar";

const input = {
  title: "Backend Developer", company: "Acme & Co", allowed: "60 minutes",
  startBy: new Date("2026-12-08T12:30:00Z"), startByText: "Tue 8 Dec 2026, 6:00 pm IST",
};

test("the calendar reminder ends at the last moment to start", () => {
  const link = new URL(deadlineCalendarLink({ ...input, now: new Date("2026-12-01T00:00:00Z") })!);
  assert.equal(link.origin + link.pathname, "https://calendar.google.com/calendar/render");
  assert.equal(link.searchParams.get("action"), "TEMPLATE");
  assert.equal(link.searchParams.get("dates"), "20261208T120000Z/20261208T123000Z");
  assert.equal(link.searchParams.get("text"), "Assessment deadline: Backend Developer (Acme & Co)");
  assert.doesNotMatch(link.searchParams.get("details")!, /https?:/, "the personal link never goes to Google");
});

test("no calendar link once the deadline has passed", () => {
  assert.equal(deadlineCalendarLink({ ...input, now: new Date("2026-12-08T12:30:00Z") }), null);
});
