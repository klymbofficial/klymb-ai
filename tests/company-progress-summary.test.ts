import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { MemberProgress } from "../src/lib/company/progress-data";
import { NO_TEAM_LABEL, hasRecordedActivity, progressState, statusLabel, summariseProgress } from "../src/lib/company/progress-summary";
import { statusOf } from "../src/components/company/ProgressTable";

const TOTAL = 10;

/** A member who can open the course through an assignment, with nothing recorded. */
function person(over: Partial<MemberProgress> & { email: string }): MemberProgress {
  return {
    name: null,
    role: "employee",
    teamName: null,
    hasAccess: true,
    assigned: true,
    ownAccess: false,
    lessonsPassed: 0,
    finalBest: null,
    finalAttempts: 0,
    lastActive: null,
    ...over,
  };
}

const ACTIVE_AT = "2026-11-05T10:00:00.000Z";

test("failed attempts with no lesson passed are recorded activity, never 'not started'", () => {
  // loadProgress gives lastActive for any lesson attempt, passed or not.
  const failed = person({ email: "a@x.com", lessonsPassed: 0, finalAttempts: 0, lastActive: ACTIVE_AT });
  assert.equal(hasRecordedActivity(failed), true);
  assert.equal(progressState(failed, TOTAL), "activity-no-lessons");
  assert.equal(statusLabel(failed, TOTAL), "Activity recorded, no lessons passed");
  assert.equal(statusOf(failed, TOTAL), "Activity recorded, no lessons passed");
  assert.ok(!/not started/i.test(statusOf(failed, TOTAL)));
});

test("someone with nothing recorded is told so, without claiming they have not started", () => {
  const assigned = person({ email: "a@x.com" });
  const own = person({ email: "b@x.com", assigned: false, ownAccess: true });
  assert.equal(statusLabel(assigned, TOTAL), "Assigned, no activity recorded");
  assert.equal(statusLabel(own, TOTAL), "No activity recorded");
  assert.equal(progressState(assigned, TOTAL), "no-activity");
});

test("each state has one label, and the final is 'attempted', never passed or failed", () => {
  const none = person({ email: "n@x.com", hasAccess: false, assigned: false });
  const some = person({ email: "s@x.com", lessonsPassed: 3, lastActive: ACTIVE_AT });
  const all = person({ email: "l@x.com", lessonsPassed: TOTAL, lastActive: ACTIVE_AT });
  const lowFinal = person({ email: "f1@x.com", lessonsPassed: TOTAL, finalAttempts: 3, finalBest: 20, lastActive: ACTIVE_AT });
  const highFinal = person({ email: "f2@x.com", lessonsPassed: TOTAL, finalAttempts: 1, finalBest: 95, lastActive: ACTIVE_AT });
  assert.equal(statusLabel(none, TOTAL), "Not assigned");
  assert.equal(statusLabel(some, TOTAL), "In progress");
  assert.equal(statusLabel(all, TOTAL), "All lessons passed");
  assert.equal(statusLabel(lowFinal, TOTAL), "Final attempted");
  assert.equal(statusLabel(highFinal, TOTAL), "Final attempted");
});

test("no access is counted once, even when records exist under the email", () => {
  const before = person({ email: "p@x.com", hasAccess: false, assigned: false, lessonsPassed: 4, finalAttempts: 1, lastActive: ACTIVE_AT });
  assert.equal(progressState(before, TOTAL), "no-access");
  const { total } = summariseProgress([before], TOTAL);
  assert.equal(total.noAccess, 1);
  assert.equal(total.withAccess, 0);
  assert.equal(total.inProgress + total.activityNoLessons + total.allLessonsPassed + total.accessNoActivity, 0);
  assert.equal(total.finalAttempted, 0);
});

test("company-assigned access and a person's own paid access are counted apart", () => {
  const rows = [
    person({ email: "assigned@x.com" }),
    person({ email: "own@x.com", assigned: false, ownAccess: true }),
    person({ email: "both@x.com", assigned: true, ownAccess: true }),
    person({ email: "none@x.com", hasAccess: false, assigned: false }),
  ];
  const { total } = summariseProgress(rows, TOTAL);
  assert.equal(total.people, 4);
  assert.equal(total.assigned, 2);
  assert.equal(total.ownAccess, 2);
  assert.equal(total.withAccess, 3, "a person holding both is one person with access");
  assert.equal(total.noAccess, 1);
});

test("the counts of people with access add up, and the final attempt is counted on its own", () => {
  const rows = [
    person({ email: "1@x.com" }),
    person({ email: "2@x.com", lastActive: ACTIVE_AT }),
    person({ email: "3@x.com", lessonsPassed: 4, lastActive: ACTIVE_AT }),
    person({ email: "4@x.com", lessonsPassed: TOTAL, lastActive: ACTIVE_AT }),
    person({ email: "5@x.com", lessonsPassed: TOTAL, finalAttempts: 2, finalBest: 40, lastActive: ACTIVE_AT }),
    // A lesson released after they finished: a final on record, but not all lessons passed any more.
    person({ email: "6@x.com", lessonsPassed: TOTAL - 1, finalAttempts: 1, finalBest: 90, lastActive: ACTIVE_AT }),
    person({ email: "7@x.com", hasAccess: false, assigned: false }),
  ];
  const { total: t } = summariseProgress(rows, TOTAL);
  assert.deepEqual(
    { accessNoActivity: t.accessNoActivity, activityNoLessons: t.activityNoLessons, inProgress: t.inProgress, allLessonsPassed: t.allLessonsPassed, finalAttempted: t.finalAttempted, noAccess: t.noAccess },
    { accessNoActivity: 1, activityNoLessons: 1, inProgress: 2, allLessonsPassed: 2, finalAttempted: 2, noAccess: 1 },
  );
  assert.equal(t.accessNoActivity + t.activityNoLessons + t.inProgress + t.allLessonsPassed, t.withAccess);
  assert.equal(t.withAccess + t.noAccess, t.people);
});

test("with no lessons built, nobody counts as having passed them all", () => {
  const p = person({ email: "a@x.com", lessonsPassed: 0, lastActive: ACTIVE_AT });
  assert.equal(progressState(p, 0), "activity-no-lessons");
  const q = person({ email: "b@x.com", lessonsPassed: 2, lastActive: ACTIVE_AT });
  assert.equal(progressState(q, 0), "in-progress");
  assert.equal(progressState(q, Number.NaN), "in-progress");
});

test("teams are grouped A to Z, and people without a team come last as 'No team assigned'", () => {
  const rows = [
    person({ email: "1@x.com", teamName: "Support" }),
    person({ email: "2@x.com", teamName: null, lessonsPassed: 2, lastActive: ACTIVE_AT }),
    person({ email: "3@x.com", teamName: "engineering", lessonsPassed: TOTAL, lastActive: ACTIVE_AT }),
    person({ email: "4@x.com", teamName: "   " }),
    person({ email: "5@x.com", teamName: "Support", hasAccess: false, assigned: false }),
  ];
  const { total, byTeam } = summariseProgress(rows, TOTAL);
  assert.deepEqual(byTeam.map((t) => t.label), ["engineering", "Support", NO_TEAM_LABEL]);
  assert.equal(NO_TEAM_LABEL, "No team assigned");
  assert.deepEqual(byTeam.map((t) => t.team), ["engineering", "Support", null]);
  assert.deepEqual(byTeam.map((t) => t.counts.people), [1, 2, 2]);
  const support = byTeam[1].counts;
  assert.equal(support.withAccess, 1);
  assert.equal(support.noAccess, 1);
  const none = byTeam[2].counts;
  assert.equal(none.inProgress, 1);
  assert.equal(none.accessNoActivity, 1, "a blank team name is no team");
  // Every person is in exactly one group.
  for (const key of Object.keys(total) as (keyof typeof total)[]) {
    assert.equal(byTeam.reduce((n, t) => n + t.counts[key], 0), total[key], `team ${key} does not sum to the total`);
  }
});

test("a real team called 'No team assigned' stays apart from people with no team", () => {
  const rows = [person({ email: "1@x.com", teamName: NO_TEAM_LABEL }), person({ email: "2@x.com", teamName: null })];
  const { byTeam } = summariseProgress(rows, TOTAL);
  assert.equal(byTeam.length, 2);
  assert.deepEqual(byTeam.map((t) => t.team), [NO_TEAM_LABEL, null]);
});

test("no rows gives zeros and no teams", () => {
  const { total, byTeam } = summariseProgress([], TOTAL);
  assert.deepEqual(byTeam, []);
  assert.ok(Object.values(total).every((n) => n === 0));
});

test("it only counts: no percentages, averages, risk labels or question-level data, and it does not change its input", () => {
  const rows = Object.freeze([Object.freeze(person({ email: "a@x.com", teamName: "T", lessonsPassed: 1, lastActive: ACTIVE_AT }))]);
  const out = summariseProgress(rows, TOTAL);
  assert.deepEqual(Object.keys(out), ["total", "byTeam"]);
  assert.deepEqual(Object.keys(out.total).sort(), [
    "accessNoActivity", "activityNoLessons", "allLessonsPassed", "assigned", "finalAttempted",
    "inProgress", "noAccess", "ownAccess", "people", "withAccess",
  ]);
  assert.ok(Object.values(out.total).every((n) => Number.isInteger(n)));
  assert.deepEqual(Object.keys(out.byTeam[0]).sort(), ["counts", "label", "team"]);
});
