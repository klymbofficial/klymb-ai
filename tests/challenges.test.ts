import { strict as assert } from "node:assert";
import { test } from "node:test";
import { challengeContent } from "../src/data/challenges";
import { curricula } from "../src/data/curricula";
import { challenges, tracks } from "../src/data/tracks";
import { scoreQuiz } from "../src/lib/quiz-score";

test("there are four challenges, kept out of the career-track list", () => {
  assert.deepEqual(challenges.map((c) => c.slug).sort(), ["artificial-intelligence", "claude", "data-science", "software-engineering"]);
  for (const c of challenges) assert.ok(!tracks.includes(c), `${c.slug} is listed as a career track`);
});

test("every challenge has 60 days, each in a known week, with https resources", () => {
  for (const c of challenges) {
    const course = curricula[c.slug];
    assert.deepEqual(course.days.map((d) => d.day), Array.from({ length: 60 }, (_, i) => i + 1), `${c.slug} days are not 1..60`);
    for (const d of course.days) {
      assert.ok(course.modules.some((m) => m.week === d.week), `${c.slug} day ${d.day} is in an unknown week`);
      assert.ok(d.title, `${c.slug} day ${d.day} has no title`);
      assert.ok(d.brief || d.steps.length, `${c.slug} day ${d.day} has no task`);
      for (const r of d.resources) assert.match(r.url, /^https:\/\//, `${c.slug} day ${d.day} has a non-https resource`);
      // The day page renders the deliverable as HTML, so converted text must carry no tags.
      assert.ok(!/<[a-z]/i.test(d.deliverable), `${c.slug} day ${d.day} deliverable has raw HTML`);
    }
  }
});

test("no other brand is left in the challenge content", () => {
  const text = JSON.stringify(challengeContent);
  assert.ok(!/abtalks|app\.klymb/i.test(text), "the content still names ABTalks or app.klymb.ai");
});

test("every quiz question has four options and a right answer among them", () => {
  for (const [slug, c] of Object.entries(challengeContent)) {
    for (const q of c.quizzes) {
      assert.ok(q.week >= 1 && q.week <= 9, `${slug} quiz week ${q.week}`);
      for (const x of q.questions) {
        assert.equal(x.options.length, 4, `${slug} week ${q.week}: ${x.question}`);
        assert.ok(x.answer >= 0 && x.answer < 4, `${slug} week ${q.week}: answer out of range`);
      }
    }
  }
});

test("a quiz is scored against the key, with every answer marked", () => {
  const quiz = { questions: [
    { question: "a", options: ["1", "2", "3", "4"], answer: 1, explanation: "b is right" },
    { question: "b", options: ["1", "2", "3", "4"], answer: 3, explanation: "d is right" },
  ] };
  const r = scoreQuiz(quiz, [1, 0]);
  assert.equal(r.score, 1);
  assert.equal(r.total, 2);
  assert.deepEqual(r.marks.map((m) => [m.chosen, m.answer]), [[1, 1], [0, 3]]);
});
