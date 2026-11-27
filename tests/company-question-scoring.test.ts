import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import type { McqPart, Question } from "../src/lib/company/assessment-rules";
import { autoMarks, byQuestion, candidateResult, mcqPoints, readReviewForm, readScores, reviewItems } from "../src/lib/company/review-rules";

/** L3: multiple choice marked on the server, reviewed per question, shared per question. */

const mcq = (correct: boolean[], points = 4, partial = true): McqPart => ({ options: correct.map((c, i) => ({ text: `o${i}`, correct: c })), points, partial });
const form = (m: Record<string, string>) => ({ get: (k: string) => m[k] ?? null });

describe("L3: automatic marks", () => {
  test("exactly the right options: full points; anything else on a one-answer question: 0", () => {
    const one = mcq([false, true, false], 3, false);
    assert.equal(mcqPoints(one, [1]), 3);
    assert.equal(mcqPoints(one, [1, 1]), 3, "a repeated pick counts once");
    assert.equal(mcqPoints(one, [0]), 0);
    assert.equal(mcqPoints(one, [0, 1]), 0);
    assert.equal(mcqPoints(one, []), 0);
  });

  test("several right with partial marks: points × (right − wrong) ÷ right, rounded down, never below 0", () => {
    const many = mcq([true, true, true, false], 4);
    assert.equal(mcqPoints(many, [0, 1, 2]), 4);
    assert.equal(mcqPoints(many, [0, 1]), 2, "4 × 2 ÷ 3 = 2.67 → 2");
    assert.equal(mcqPoints(many, [0]), 1);
    assert.equal(mcqPoints(many, [0, 1, 2, 3]), 2, "a wrong pick takes one right away");
    assert.equal(mcqPoints(many, [0, 3]), 0);
    assert.equal(mcqPoints(many, [3]), 0, "never negative");
    assert.equal(mcqPoints(many, [0, 9]), 0, "an option that doesn't exist is wrong");
    assert.equal(mcqPoints(mcq([true, true, false], 4, false), [0]), 0, "partial off: all or nothing");
  });

  test("review items: a multiple-choice question is one entry; a written one, its areas", () => {
    const qs: Question[] = [
      { section: "", title: "Pick", brief: "b", submission: "written", rubric: [], mcq: mcq([true, false], 2, false) },
      { section: "", title: "Explain", brief: "b", submission: "written", rubric: [{ title: "Clarity", skill: "SQL", points: 4, guide: "g" }, { title: "Depth", skill: "SQL", points: 2, guide: "g" }] },
    ];
    const items = reviewItems(qs);
    assert.deepEqual(items.map((i) => [i.questionNo, i.title, i.points, !!i.mcq]), [[1, "Pick", 2, true], [2, "Clarity", 4, false], [2, "Depth", 2, false]]);
    assert.deepEqual(autoMarks(qs, [{ questionNo: 1, picked: [0] }]), [2, null, null]);
    assert.deepEqual(autoMarks(qs, null), [0, null, null], "unanswered multiple choice scores 0");
  });

  test("a reviewer may change an automatic mark only with a reason", () => {
    const items = reviewItems([{ section: "", title: "Pick", brief: "b", submission: "written", rubric: [], mcq: mcq([true, false], 2, false) }]);
    assert.equal(readReviewForm(form({ "points-0": "2" }), items, [2]).ok, true, "confirmed as marked");
    const bad = readReviewForm(form({ "points-0": "0" }), items, [2]);
    assert.ok(!bad.ok && /why you changed the automatic mark/.test(bad.errors[0]));
    assert.equal(readReviewForm(form({ "points-0": "0", "note-0": "Ambiguous wording." }), items, [2]).ok, true);
    assert.equal(readReviewForm(form({ "points-0": "3", "note-0": "x" }), items, [2]).ok, false, "never above the question's points");
  });
});

describe("L3: results per question", () => {
  const stored = [
    { question_no: 1, question: "Pick", title: "Pick", points: 2, max: 2, note: "", auto: 2 },
    { question_no: 2, question: "Explain", title: "Clarity", points: 3, max: 4, note: "Private." },
    { question_no: 2, question: "Explain", title: "Depth", points: 1, max: 2, note: "" },
  ];

  test("stored scores read back with their question and automatic mark", () => {
    const s = readScores(stored);
    assert.deepEqual(s[0], { title: "Pick", points: 2, max: 2, note: "", questionNo: 1, question: "Pick", auto: 2 });
    assert.deepEqual(readScores([{ title: "API", points: 3, max: 4, note: "" }]), [{ title: "API", points: 3, max: 4, note: "" }], "a one-task review is unchanged");
    assert.deepEqual(readScores("nope"), []);
  });

  test("shared by area, a test with questions shows one line per question, never notes or automatic marks", () => {
    const seen = candidateResult({ policy: "by_area", sharedAt: "t" }, { total: 6, max: 8, scores: readScores(stored) });
    assert.deepEqual(seen.areas, [{ title: "Pick", points: 2, max: 2 }, { title: "Explain", points: 4, max: 6 }]);
    assert.doesNotMatch(JSON.stringify(seen), /Private|auto|Clarity/);
    assert.deepEqual(byQuestion([{ title: "API", points: 3, max: 4 }]), [{ title: "API", points: 3, max: 4 }]);
  });

  test("the review page no longer says scoring comes next", () => {
    const page = readFileSync(new URL("../src/app/org/[slug]/(workspace)/assessments/[item]/candidates/[candidate]/page.tsx", import.meta.url), "utf8");
    assert.doesNotMatch(page, /comes in the next step/);
    assert.match(page, /reviewItems\(questions\)/);
  });

  test("the database and the page use the same rule", () => {
    const sql = readFileSync(new URL("../db/migrations/0092_question_scoring.sql", import.meta.url), "utf8");
    assert.match(sql, /greatest\(0, floor\(s\.pts \* \(s\.right_n - s\.wrong_n\)::numeric \/ s\.correct\)\)/);
    assert.match(sql, /pts::int <> auto and note = ''/, "a changed mark needs a reason in the database too");
  });
});
