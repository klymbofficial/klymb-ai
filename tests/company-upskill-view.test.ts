import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { SYSTEM_DESIGN, nextLesson } from "../src/lib/company/upskill-course";
import { attentionReason, biggestDrop, courseFunnel, hardestLessons, isInactive, isOverdue, learnerStatus, lessonStats, peopleTags, type LearnerFacts } from "../src/lib/company/upskill-view";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const now = new Date("2026-11-26T06:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
const person = (over: Partial<LearnerFacts> = {}): LearnerFacts => ({ assigned: true, ownAccess: false, requirement: "recommended", dueOn: null, lessonsPassed: 0, finalBest: null, lastActive: null, assignedAt: daysAgo(1), ...over });

describe("Upskill course page (user, 26 Nov)", () => {
  test("status: not assigned, not started, in progress, completed", () => {
    assert.equal(learnerStatus(person({ assigned: false }), 21), "not_assigned");
    assert.equal(learnerStatus(person(), 21), "not_started");
    assert.equal(learnerStatus(person({ lessonsPassed: 3 }), 21), "in_progress");
    assert.equal(learnerStatus(person({ lessonsPassed: 21 }), 21), "completed");
  });

  test("overdue only when required, past the due date and unfinished; inactive after 7 quiet days", () => {
    assert.equal(isOverdue(person({ requirement: "required", dueOn: "2026-11-20" }), 21, now), true);
    assert.equal(isOverdue(person({ requirement: "required", dueOn: "2026-11-26" }), 21, now), false, "due today isn't late");
    assert.equal(isOverdue(person({ requirement: "required", dueOn: "2026-11-20", lessonsPassed: 21 }), 21, now), false);
    assert.equal(isInactive(person({ lessonsPassed: 2, lastActive: daysAgo(8) }), 21, now), true);
    assert.equal(isInactive(person({ lessonsPassed: 2, lastActive: daysAgo(2) }), 21, now), false);
    assert.deepEqual(peopleTags(person({ requirement: "required", dueOn: "2026-11-20", lessonsPassed: 2, lastActive: daysAgo(9) }), 21, now), ["all", "in_progress", "overdue", "inactive"]);
  });

  test("who needs a nudge, most urgent first, in plain words", () => {
    assert.match(attentionReason(person({ requirement: "required", dueOn: "2026-11-23" }), 21, now)!.reason, /^Overdue by 3 days$/);
    assert.match(attentionReason(person({ lessonsPassed: 1, lastActive: daysAgo(10) }), 21, now)!.reason, /^No activity for 10 days$/);
    assert.match(attentionReason(person({ assignedAt: daysAgo(5) }), 21, now)!.reason, /^Not started, assigned 5 days ago$/);
    assert.equal(attentionReason(person({ assignedAt: daysAgo(1) }), 21, now), null, "just assigned is fine");
  });

  test("funnel, lesson stats, hardest lessons and the biggest drop", () => {
    const rows = [person({ lessonsPassed: 21, finalBest: 80 }), person({ lessonsPassed: 11 }), person({ lessonsPassed: 2 }), person()];
    assert.deepEqual(courseFunnel(rows, 21, 70).map((s) => s.count), [4, 3, 2, 1, 1]);
    const checks = new Map([
      ["a", [{ lesson: "0-0", bestScore: 100, attempts: 1, passedAt: "x" }, { lesson: "0-1", bestScore: 40, attempts: 3, passedAt: null }]],
      ["b", [{ lesson: "0-0", bestScore: 80, attempts: 1, passedAt: "x" }, { lesson: "0-1", bestScore: 60, attempts: 2, passedAt: "x" }]],
    ]);
    const stats = lessonStats(["0-0", "0-1"], checks);
    assert.deepEqual(stats[1], { lesson: "0-1", tried: 2, passed: 1, avgScore: 50, avgAttempts: 2.5 });
    assert.equal(hardestLessons(stats)[0].lesson, "0-1");
    assert.deepEqual(biggestDrop(stats), { from: 0, to: 1, lost: 1 });
  });

  test("the course outline: lessons numbered in order, and the next lesson to pick up", () => {
    assert.equal(SYSTEM_DESIGN.lessons[0].no, 1);
    assert.equal(SYSTEM_DESIGN.finalMark, 70);
    assert.equal(nextLesson(SYSTEM_DESIGN, new Set(["0-0"]))?.id, "0-1");
  });

  test("reminders: one a day, recorded; a due-date change moves only that person", () => {
    const actions = read("src/app/org/[slug]/(workspace)/learning/actions.ts");
    assert.match(actions, /already reminded today/);
    assert.match(actions, /recordReminder\(sql/);
    const sql = read("db/migrations/0100_upskill_reminders.sql");
    assert.match(sql, /create table if not exists course\.upskill_reminders \(/);
    assert.match(sql, /p_scope_team is null or m\.team_id = p_scope_team/, "a lead only changes their own team");
  });
});
