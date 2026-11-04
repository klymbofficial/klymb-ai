import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parsePlatformSummary } from "../src/lib/platform-summary";

test("no app.klymb.ai account", () => {
  assert.deepEqual(parsePlatformSummary({ hasUser: false }), { hasUser: false });
});

test("anything that isn't a summary is refused", () => {
  assert.equal(parsePlatformSummary(null), null);
  assert.equal(parsePlatformSummary("ok"), null);
  assert.equal(parsePlatformSummary({ hasUser: "yes" }), null);
});

test("a full summary comes through", () => {
  const s = parsePlatformSummary({
    hasUser: true,
    profile: { score: 62, ready: false, missing: ["Phone number", "Current city"] },
    challenges: [{ domain: "CLAUDE", title: "Claude Challenge", daysCompleted: 11, currentDay: 12, totalDays: 60, currentStreak: 5, lifecycle: "active" }],
    hackathon: { registered: true, submitted: false, live: false, registrationOpen: true },
  });
  assert.ok(s?.hasUser);
  if (!s?.hasUser) return;
  assert.equal(s.profile.score, 62);
  assert.deepEqual(s.profile.missing, ["Phone number", "Current city"]);
  assert.equal(s.challenges[0].currentDay, 12);
  assert.equal(s.hackathon.registered, true);
});

test("malformed fields are dropped or clamped, never trusted", () => {
  const s = parsePlatformSummary({
    hasUser: true,
    profile: { score: 140, missing: ["<b>x</b>".repeat(20), 7] },
    challenges: [
      { domain: "HACK", title: "x", lifecycle: "active" },
      { domain: "AI", title: "Artificial Intelligence", daysCompleted: 999, totalDays: 60, lifecycle: "active" },
      "nonsense",
    ],
  });
  assert.ok(s?.hasUser);
  if (!s?.hasUser) return;
  assert.equal(s.profile.score, 100);
  assert.equal(s.profile.missing.length, 1);
  assert.ok(s.profile.missing[0].length <= 60);
  assert.equal(s.challenges.length, 1);
  assert.equal(s.challenges[0].daysCompleted, 60);
  assert.equal(s.hackathon.registered, false);
});
