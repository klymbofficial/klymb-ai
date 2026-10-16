import { strict as assert } from "node:assert";
import { test } from "node:test";
import { checkAnswers, checkPace, checkReusedLink, checkWorkLink, MAX_NEW_DAYS_PER_DAY } from "../src/lib/learner/integrity";

test("a day needs a link to the work itself, not a profile or repo root", () => {
  assert.ok(checkWorkLink(null));
  assert.ok(checkWorkLink("https://github.com/asha"));
  assert.ok(checkWorkLink("https://github.com/asha/portfolio"));
  assert.ok(checkWorkLink("https://google.com/anything"));
  assert.equal(checkWorkLink("https://github.com/asha/portfolio/blob/main/day-05/README.md"), null);
  assert.equal(checkWorkLink("https://www.github.com/asha/portfolio/commit/abc123"), null);
  assert.equal(checkWorkLink("https://github.com/asha/portfolio/tree/main/day-06"), null);
});

test("the same link can't count for two days", () => {
  const prev = [{ day: 4, deliverable_url: "https://github.com/asha/p/blob/main/day-04/README.md" }];
  assert.ok(checkReusedLink("https://github.com/Asha/p/blob/main/day-04/README.md/#top", 5, prev));
  assert.equal(checkReusedLink("https://github.com/asha/p/blob/main/day-04/README.md", 4, prev), null); // re-saving Day 4
  assert.equal(checkReusedLink("https://github.com/asha/p/blob/main/day-05/README.md", 5, prev), null);
});

test("every question needs its own real answer", () => {
  const qs = ["Which defect mattered most and why?", "What would you test next?"];
  const good = ["The checkout rounding bug, because it charged real customers twice.", "Refund flows under a slow network, since retries double-post."];
  assert.equal(checkAnswers(qs, good), null);
  assert.equal(checkAnswers([], null), null);
  assert.ok(checkAnswers(qs, [good[0]]));
  assert.ok(checkAnswers(qs, [good[0], "idk"]));
  assert.ok(checkAnswers(qs, [good[0], "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]));
  assert.ok(checkAnswers(qs, [good[0], "What would you test next?"]));
  assert.ok(checkAnswers(qs, [good[0], good[0]]));
});

test("at most a few new days per day; re-saves always allowed", () => {
  const today = new Date().toISOString();
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const subs = Array.from({ length: MAX_NEW_DAYS_PER_DAY }, (_, i) => ({ day: i + 1, submitted_at: today }));
  assert.ok(checkPace(date, MAX_NEW_DAYS_PER_DAY + 1, subs));
  assert.equal(checkPace(date, 2, subs), null);
  assert.equal(checkPace(date, 3, subs.slice(0, 2)), null);
  assert.equal(checkPace("2020-01-01", MAX_NEW_DAYS_PER_DAY + 1, subs), null);
});
