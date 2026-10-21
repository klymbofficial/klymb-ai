import { strict as assert } from "node:assert";
import { test } from "node:test";
import { QUESTIONS } from "../src/data/system-design/course-app";
import {
  ALL_IDS, addNote, closeQuickCheck, closeQuiz, completeNext, defaultState, fmt, fromStored, grade, isAnswered, localDate,
  nextQuestion, openNotification, pickOption, previewState, quickCheckAt, scoreDelta, setAnswer, tick, toStored, togglePlay,
  type CourseState,
} from "../src/lib/course-app";

const NOW = new Date(2026, 9, 21, 9, 0, 0).getTime();
const home = (): CourseState => ({ ...defaultState(NOW), screen: "home", onboarded: true });

test("fmt pads minutes and seconds and never goes negative", () => {
  assert.equal(fmt(0), "00:00");
  assert.equal(fmt(754.9), "12:34");
  assert.equal(fmt(-5), "00:00");
});

test("grading each question type", () => {
  const [mcq, multi, diagram, order, text, timed] = QUESTIONS;
  assert.equal(grade(mcq, 0), 1);
  assert.equal(grade(mcq, 1), 0);
  assert.equal(grade(multi, [2, 0]), 1);
  assert.equal(grade(multi, [0]), 0);
  assert.equal(grade(diagram, 1), 1);
  assert.equal(grade(order, undefined), 0, "the shuffled starting order is wrong");
  assert.equal(grade(order, [0, 1, 2, 3, 4]), 1);
  assert.equal(grade(text, "Consistency or availability"), 1);
  assert.equal(grade(text, "latency"), 0);
  assert.equal(grade(timed, 1), 1);
});

test("Next needs an answer, except for ordering", () => {
  const [mcq, multi, , order, text] = QUESTIONS;
  assert.equal(isAnswered(mcq, undefined), false);
  assert.equal(isAnswered(multi, []), false);
  assert.equal(isAnswered(order, undefined), true);
  assert.equal(isAnswered(text, "ok"), false);
  assert.equal(isAnswered(text, "both"), true);
});

test("multi-select toggles options on and off", () => {
  let s = previewState("q", { q: 1 }, NOW);
  s = pickOption(s, 2);
  assert.deepEqual(s.quiz.answers[1], [0, 2]);
  s = pickOption(s, 0);
  assert.deepEqual(s.quiz.answers[1], [2]);
});

test("finishing the post-assessment grades it and opens the comparison", () => {
  let s: CourseState = { ...home(), screen: "quiz", quiz: { kind: "post", stage: "q", idx: 0, answers: {} } };
  const right: Record<number, Parameters<typeof setAnswer>[1]> = { 0: 0, 1: [0, 2], 2: 1, 3: [0, 1, 2, 3, 4], 4: "consistency vs availability", 5: 1 };
  for (let i = 0; i < QUESTIONS.length; i++) s = nextQuestion(setAnswer(s, right[i]));
  assert.equal(s.screen, "results");
  assert.equal(s.lastKind, "post");
  assert.deepEqual(s.post, [1, 1, 1, 1, 1, 1]);
  assert.equal(scoreDelta(s), 67);
});

test("the timed question moves on by itself when time runs out", () => {
  let s: CourseState = { ...home(), screen: "quiz", quiz: { kind: "pre", stage: "q", idx: 5, answers: {} }, timeLeft: 1 };
  s = tick(s, NOW);
  assert.equal(s.screen, "results");
});

test("closing a started assessment asks first", () => {
  const started: CourseState = { ...home(), screen: "quiz", quiz: { kind: "post", stage: "q", idx: 1, answers: { 0: 0 } } };
  assert.equal(closeQuiz(started).confirmExit, true);
  const unstarted: CourseState = { ...started, quiz: { ...started.quiz, answers: {} } };
  assert.equal(closeQuiz(unstarted).screen, "home");
});

test("playback stops at the quick check, once per lesson", () => {
  const cp = quickCheckAt("2-1");
  let s: CourseState = { ...home(), screen: "player", visited: true, playing: true, t: cp - 1 };
  s = tick(s, NOW);
  assert.equal(s.qcOpen, true);
  assert.equal(s.playing, false);
  assert.equal(s.t, cp);
  s = closeQuickCheck(s, "continue", NOW);
  assert.equal(s.playing, true);
  assert.ok(s.qcDone.includes("2-1"));
  s = tick({ ...s, t: cp - 1 }, NOW);
  assert.equal(s.qcOpen, false, "already answered");
});

test("rewatch goes back a minute from the quick check", () => {
  const s = closeQuickCheck({ ...home(), screen: "player", qcOpen: true, t: quickCheckAt("2-1") }, "rewatch", NOW);
  assert.equal(s.t, quickCheckAt("2-1") - 60);
});

test("the mini player keeps a lesson playing on the tabs", () => {
  const s = tick({ ...home(), visited: true, playing: true, t: 10 }, NOW);
  assert.equal(s.t, 11);
  assert.equal(s.todaySec, defaultState(NOW).todaySec + 1);
});

test("offline without a download, the lesson won't play", () => {
  const s: CourseState = { ...home(), screen: "player", cur: "4-0", offline: true };
  assert.equal(togglePlay(s).playing, false);
  assert.equal(togglePlay({ ...s, cur: "2-1" }).playing, true, "2-1 is downloaded");
});

test("finishing a module's last lesson opens the recap", () => {
  const s = completeNext({ ...home(), screen: "player", cur: "2-2", done: [...home().done, "2-1"] }, false, NOW);
  assert.equal(s.screen, "recap");
  assert.equal(s.recapMod, 2);
  assert.equal(s.cur, "3-0");
});

test("completing a lesson mid-module moves to the next one", () => {
  const s = completeNext({ ...home(), screen: "player", cur: "2-1" }, false, NOW);
  assert.equal(s.cur, "2-2");
  assert.ok(s.done.includes("2-1"));
  assert.match(s.toast ?? "", /Lesson complete/);
});

test("the last lesson of the course stays put", () => {
  const last = ALL_IDS[ALL_IDS.length - 1];
  const s = completeNext({ ...home(), screen: "player", cur: last, done: ALL_IDS.slice(0, -1) }, false, NOW);
  assert.equal(s.screen, "recap");
  assert.equal(s.cur, last);
});

test("notes are pinned to the current lesson and moment", () => {
  const s = addNote({ ...home(), cur: "3-1", t: 42, draft: "  replicas lag  " }, NOW);
  assert.deepEqual(s.notes["3-1"], [{ t: 42, text: "replicas lag" }]);
  assert.equal(s.draft, "");
});

test("opening the instructor reply goes to the Q&A thread and marks it read", () => {
  const s = home();
  const n = s.notifs.find((x) => x.go === "discuss")!;
  const next = openNotification(s, n);
  assert.equal(next.screen, "player");
  assert.equal(next.ptab, "discuss");
  assert.equal(next.openThread, "t3");
  assert.equal(next.notifs.find((x) => x.id === n.id)!.unread, false);
});

test("saved progress round-trips, and today's minutes reset on a new day", () => {
  const s = { ...home(), done: ["0-0"], todaySec: 600 };
  const raw = JSON.parse(JSON.stringify(toStored(s)));
  const same = fromStored(raw, NOW);
  assert.deepEqual(same.done, ["0-0"]);
  assert.equal(same.todaySec, 600);
  assert.equal(same.screen, "home");
  const tomorrow = fromStored(raw, NOW + 86_400_000);
  assert.equal(tomorrow.todaySec, 0);
  assert.equal(tomorrow.today, localDate(new Date(NOW + 86_400_000)));
});

test("a first visit starts on the splash screen", () => {
  assert.equal(fromStored(null, NOW).screen, "splash");
  assert.equal(fromStored({ onboarded: false }, NOW).screen, "splash");
});
