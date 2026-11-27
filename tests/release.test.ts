import { strict as assert } from "node:assert";
import { test } from "node:test";
import { opensLater, releaseDay, startDateFor } from "../src/lib/release";

const at = (iso: string) => Date.parse(iso);

test("the Claude Challenge opens at midnight India time on 5 December", () => {
  assert.equal(opensLater("claude", at("2026-11-27T12:00:00+05:30")), "2026-12-05");
  assert.equal(opensLater("claude", at("2026-12-04T23:59:59+05:30")), "2026-12-05");
  assert.equal(opensLater("claude", at("2026-12-05T00:00:00+05:30")), null);
  assert.equal(releaseDay("2026-12-05"), "5 December");
});

test("a track with no release date never waits", () => {
  assert.equal(opensLater("data-science", at("2026-11-27T12:00:00+05:30")), null);
  assert.equal(opensLater("not-a-track"), null);
  assert.equal(startDateFor("data-science", "2026-11-27"), "2026-11-27");
});

test("Day 1 is the release day for early enrolments, and the day they join afterwards", () => {
  assert.equal(startDateFor("claude", "2026-11-27"), "2026-12-05");
  assert.equal(startDateFor("claude", "2026-12-20"), "2026-12-20");
});
