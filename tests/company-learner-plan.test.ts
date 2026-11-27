import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { describe, test } from "node:test";
import { canTakeLesson, durationText, finalOpen, lessonStates, pacePlan } from "../src/lib/company/learner-plan";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const now = new Date("2026-11-26T06:00:00Z");
const order = ["0-0", "0-1", "0-2", "0-3"];
const out = { "0-0": "2026-11-01", "0-1": "2026-11-01", "0-2": "2026-11-01", "0-3": "2026-12-20" };

describe("Employee learning: self-paced, in order (user, 26 Nov)", () => {
  test("the first lesson not passed is open, the rest locked, with no wait for the next day", () => {
    const s = lessonStates(order, new Set(["0-0"]), out, "2026-11-26");
    assert.deepEqual([...s.values()], ["passed", "open", "locked", "locked"]);
    assert.ok(canTakeLesson(s, "0-0"), "a passed lesson can be retaken");
    assert.ok(canTakeLesson(s, "0-1"));
    assert.ok(!canTakeLesson(s, "0-2"));
  });

  test("a lesson that isn't released yet is coming soon, and a lesson passed out of order stays passed", () => {
    const s = lessonStates(order, new Set(["0-0", "0-1", "0-2"]), out, "2026-11-26");
    assert.equal(s.get("0-3"), "soon");
    const odd = lessonStates(order, new Set(["0-2"]), out, "2026-11-26");
    assert.deepEqual([...odd.values()], ["open", "locked", "passed", "locked"]);
  });

  test("the final opens only once every lesson is passed", () => {
    assert.ok(!finalOpen(order, new Set(["0-0", "0-1", "0-2"])));
    assert.ok(finalOpen(order, new Set(order)));
  });

  test("a suggested pace to the due date, orange when behind or late", () => {
    const fine = pacePlan({ total: 21, passed: 5, dueOn: "2026-12-24", assignedAt: "2026-11-20T06:00:00Z", now });
    assert.equal(fine.tone, "ok");
    assert.match(fine.line, /16 lessons left: about 4 a week to finish by 24 Dec/);

    const behind = pacePlan({ total: 21, passed: 0, dueOn: "2026-11-30", assignedAt: "2026-11-06T06:00:00Z", now });
    assert.equal(behind.tone, "warn");
    assert.ok(behind.behind >= 2);
    assert.match(behind.line, /behind/);
    assert.match(behind.line, /a day/, "under a week left, the pace is per day");

    const late = pacePlan({ total: 21, passed: 10, dueOn: "2026-11-20", assignedAt: null, now });
    assert.equal(late.tone, "warn");
    assert.match(late.line, /was due on 20 Nov/);

    assert.match(pacePlan({ total: 21, passed: 0, dueOn: null, assignedAt: null, now }).line, /No due date/);
    assert.equal(pacePlan({ total: 21, passed: 21, dueOn: null, assignedAt: null, now }).tone, "done");
  });

  test("durations read plainly", () => {
    assert.equal(durationText(45), "45 min");
    assert.equal(durationText(80), "1 h 20 min");
    assert.equal(durationText(120), "2 h");
  });

  test("the server keeps the same rules, and a personal refundable seat keeps one lesson a day", () => {
    const actions = read("src/app/org/[slug]/(workspace)/learning/[course]/actions.ts");
    assert.match(actions, /lessonStates\(/);
    assert.match(actions, /canTakeLesson\(/);
    assert.match(actions, /refundable/);
    assert.match(actions, /canTake\(paceOf/);
    assert.match(actions, /requireCompany\(/);
  });

  test("a workspace sign-in plays a company-assigned course's videos, and only that", () => {
    const video = read("src/app/api/video/[file]/route.ts");
    assert.match(video, /companyCourseEmail\(SD_COURSE\)/);
    const auth = read("src/lib/company/auth.ts");
    assert.match(auth, /export async function companyCourseEmail[\s\S]*hasCompanyAssignment/);
  });

  test("employees learn inside the workspace, not on the public course", () => {
    const page = read("src/app/org/[slug]/(workspace)/learning/page.tsx");
    assert.match(page, /<MyCourseCard /);
    for (const f of ["src/components/company/learn/LearnerCourse.tsx", "src/components/company/learn/LearnerParts.tsx"]) {
      assert.doesNotMatch(read(f), /\/learn\/system-design/, `${f} keeps assigned learners in the workspace`);
    }
    const actions = read("src/app/org/[slug]/(workspace)/learning/actions.ts");
    assert.match(actions, /courseUrl: `\$\{site\.url\}\/org\/\$\{slug\}\/learning\/\$\{SD_COURSE\}`/);
  });

  test("nothing the learner's browser loads holds answers or paid lessons (server actions excepted)", () => {
    const forbidden = /(data\/system-design\/(lessons|final|subtitles-en|day-\d|essentials-day-\d)|lib\/sd-lessons)\.ts$/;
    const importsOf = (file: string) => {
      const src = readFileSync(file, "utf8");
      // A server action's module stays on the server: the browser only gets a reference to call.
      if (/^"use server";/m.test(src)) return [];
      return [...src.matchAll(/^\s*(?:import|export)\s+(?!type\b)(?:[^"';]*?\sfrom\s+)?"([^"]+)"/gm)].map((m) => m[1]).flatMap((spec) => {
        const base = spec.startsWith("@/") ? join("src", spec.slice(2)) : spec.startsWith(".") ? join(dirname(file), spec) : null;
        if (!base) return [];
        return [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), base].filter((x) => existsSync(x) && statSync(x).isFile()).slice(0, 1).map(normalize);
      });
    };
    const roots = ["src/components/company/learn/LessonView.tsx", "src/components/company/learn/FinalAssessment.tsx", "src/components/company/learn/PrintButton.tsx"];
    const seen = new Set(roots);
    const queue = [...roots];
    while (queue.length) {
      const file = queue.pop()!;
      assert.equal(forbidden.test(file), false, `${file} would put answers or paid lessons in the browser`);
      for (const next of importsOf(file)) if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
    assert.ok(seen.size > 5, "the walk followed the imports");
  });
});
