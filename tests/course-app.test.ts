import { strict as assert } from "node:assert";
import { test } from "node:test";
import { QUESTIONS } from "../src/data/system-design/course-app";
import {
  ALL_IDS, addNote, closeQuiz, completeNext, deepLink, defaultState, flowDone, fmt, fromStored, grade, isAnswered, isSoon, localDate,
  migrateLegacy, miniActive, nextQuestion, openLesson, pickOption, previewState, scoreDelta, setAnswer, streak, tick, toStored, togglePlay,
  updateLesson, type CourseState,
} from "../src/lib/course-app";

const NOW = new Date(2026, 9, 21, 9, 0, 0).getTime();
const home = (): CourseState => ({ ...defaultState(NOW), screen: "home", onboarded: true });
/** Day 0 with every practice step done. */
const day0Done = (s: CourseState) => updateLesson(s, "0-0", { pre: [0, 0, 0], watched: true, built: 0, post: [0, 0, 0, 0], est: [1200, 12, 700], follow: [true, true, false, true] }, NOW);

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
  let s: CourseState = { ...home(), pre: [1, 0, 0, 1, 0, 0], screen: "quiz", quiz: { kind: "post", stage: "q", idx: 0, answers: {} } };
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

test("the video moves the playhead; tick only counts today's minutes", () => {
  const s = tick({ ...home(), screen: "player", visited: true, playing: true, t: 10 }, NOW);
  assert.equal(s.t, 10);
  assert.equal(s.todaySec, 1);
  assert.equal(s.qcOpen, false, "no lesson has a quick check yet");
});

test("leaving a lesson there's no mini player yet", () => {
  assert.equal(miniActive({ ...home(), visited: true, playing: true }), false);
});

test("offline, the lesson won't play", () => {
  const s: CourseState = { ...home(), screen: "player", cur: "0-0", offline: true };
  assert.equal(togglePlay(s).playing, false);
  assert.equal(togglePlay({ ...s, offline: false }).playing, true);
});

test("a lesson can't be completed until its practice is done", () => {
  const s: CourseState = { ...home(), screen: "player", cur: "0-0" };
  assert.equal(flowDone(s, "0-0"), false);
  const blocked = completeNext(s, false, NOW);
  assert.deepEqual(blocked.done, []);
  assert.match(blocked.toast ?? "", /practice/);
});

test("finishing Day 0 completes the Start here module and opens the recap", () => {
  const s = completeNext(day0Done({ ...home(), screen: "player", cur: "0-0" }), false, NOW);
  assert.equal(s.screen, "recap");
  assert.equal(s.recapMod, 0);
  assert.equal(s.cur, "1-0");
  assert.deepEqual(s.done, ["0-0"]);
});

test("finishing a lesson whose next day isn't out yet goes home", () => {
  const s0 = updateLesson({ ...home(), screen: "player", cur: "1-0" }, "1-0", { pre: [0, 0, 0], watched: true, post: [0, 0, 0, 0], est: [267, 30000, 267], built: 1, design: "Waiting room, atomic stock counter, queue payments.", follow: [true, true, true, true] }, NOW);
  const s = completeNext(s0, false, NOW);
  assert.ok(s.done.includes("1-0"));
  assert.equal(s.screen, "home");
  assert.match(s.toast ?? "", /coming soon/);
});

test("coming-soon lessons don't open", () => {
  assert.equal(isSoon("1-1"), true);
  const s = openLesson(home(), "1-1", NOW);
  assert.equal(s.screen, "home");
  assert.match(s.toast ?? "", /coming soon/);
});

test("the last lesson of the course stays put", () => {
  const last = ALL_IDS[ALL_IDS.length - 1];
  const s = completeNext({ ...home(), screen: "player", cur: last, done: ALL_IDS.slice(0, -1) }, false, NOW);
  assert.equal(s.screen, "recap");
  assert.equal(s.cur, last);
});

test("notes are pinned to the current lesson and moment", () => {
  const s = addNote({ ...home(), cur: "1-0", t: 42, draft: "  pre-scale before midnight  " }, NOW);
  assert.deepEqual(s.notes["1-0"], [{ t: 42, text: "pre-scale before midnight" }]);
  assert.equal(s.draft, "");
});

test("a first visit has no sample learner, notifications or Q&A", () => {
  const s = defaultState(NOW);
  assert.deepEqual(s.done, []);
  assert.deepEqual(s.pre, []);
  assert.deepEqual(s.notifs, []);
  assert.deepEqual(s.threads, {});
  assert.equal(s.cur, "0-0");
  assert.equal(streak(s, NOW).current, 0);
});

test("a finished step counts today; the streak runs back through consecutive days", () => {
  const s = updateLesson(home(), "0-0", { pre: [0, 0, 0] }, NOW);
  assert.deepEqual(s.activeDays, [localDate(new Date(NOW))]);
  const day = (n: number) => localDate(new Date(NOW - n * 86_400_000));
  assert.deepEqual(streak({ ...s, activeDays: [day(0), day(1), day(2), day(5)] }, NOW), { current: 3, longest: 3, today: true });
  assert.equal(streak({ ...s, activeDays: [day(1), day(2)] }, NOW).current, 2, "today not done yet keeps yesterday's run");
  assert.equal(streak({ ...s, activeDays: [day(2)] }, NOW).current, 0);
});

test("?lesson= opens straight into a lesson; unknown or coming-soon ids are ignored", () => {
  const s = deepLink(defaultState(NOW), "1-0", NOW);
  assert.equal(s.screen, "player");
  assert.equal(s.cur, "1-0");
  assert.equal(s.onboarded, true);
  assert.equal(deepLink(defaultState(NOW), "1-3", NOW).screen, "splash");
  assert.equal(deepLink(defaultState(NOW), "9-9", NOW).screen, "splash");
});

test("progress from the old Day pages carries over once", () => {
  const s = migrateLegacy(defaultState(NOW), { day0: { pre: [0, 1, 0], watched: true }, day1: null, lang: "hi" }, NOW);
  assert.deepEqual(s.lessons["0-0"], { pre: [0, 1, 0], watched: true });
  assert.equal(s.lessons["1-0"], undefined);
  assert.equal(s.lang, "hi");
  const again = migrateLegacy(s, { day0: { pre: [2, 2, 2] } }, NOW);
  assert.deepEqual(again.lessons["0-0"].pre, [0, 1, 0], "existing progress wins");
});

test("saved progress round-trips, and today's minutes reset on a new day", () => {
  const s = { ...day0Done(home()), done: ["0-0"], todaySec: 600, lang: "hi" as const };
  const raw = JSON.parse(JSON.stringify(toStored(s)));
  const same = fromStored(raw, NOW);
  assert.deepEqual(same.done, ["0-0"]);
  assert.equal(same.lang, "hi");
  assert.equal(flowDone(same, "0-0"), true, "lesson practice is saved");
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

test("a day with estimates and a design attempt isn't finished until both are done", () => {
  const base = { pre: [0, 0, 0], watched: true, post: [0, 0, 0, 0], built: 1, follow: [true, true, true, true] };
  const noEst = updateLesson(home(), "1-0", base, NOW);
  assert.equal(flowDone(noEst, "1-0"), false, "estimates still to do");
  const noDesign = updateLesson(home(), "1-0", { ...base, est: [267, 30000, 267] }, NOW);
  assert.equal(flowDone(noDesign, "1-0"), false, "design attempt still to write");
  const all = updateLesson(noDesign, "1-0", { design: "Waiting room and one atomic stock counter." }, NOW);
  assert.equal(flowDone(all, "1-0"), true);
});

test("course activity events are cut down to known names and short, flat values", async () => {
  const { cleanEvent, validAnon } = await import("../src/lib/sd-events");
  assert.equal(cleanEvent({ e: "drop_table" }), null);
  const e = cleanEvent({ e: "step_done", lesson: "0-0", step: "pre", props: { score: 2, qs: "a,b", "bad key": 1, nested: { x: 1 }, long: "x".repeat(500) } });
  assert.deepEqual(Object.keys(e!.props).sort(), ["long", "qs", "score"]);
  assert.equal((e!.props.long as string).length, 300);
  assert.equal(validAnon("abc"), false);
  assert.equal(validAnon("3f2a9c1e-77aa-4c1d-9a1b-0c2d3e4f5a6b"), true);
});

test("the admin summary counts each learner once per step and finds where they stopped", async () => {
  const { summarise } = await import("../src/lib/sd-summary");
  const { LESSON_DAYS } = await import("../src/data/system-design/course-app");
  const ev = (anon: string, event: string, step: string | null, props: Record<string, unknown> = {}, lesson = "0-0") =>
    ({ created_at: new Date(NOW).toISOString(), anon_id: anon, email: null, event, lesson, step, props, lang: "en", device: "phone" });
  const best = LESSON_DAYS["0-0"].copy.en.pre.map((q) => q.choices.findIndex((c) => c.best));
  const events = [
    ev("aaaaaaaa", "lesson_open", null), ev("aaaaaaaa", "lesson_open", null), ev("aaaaaaaa", "step_done", "started"),
    ev("aaaaaaaa", "step_done", "pre", { qs: LESSON_DAYS["0-0"].copy.en.pre.map((q) => q.id).join(","), picks: best.join(",") }),
    ev("aaaaaaaa", "ping", "watch"), ev("aaaaaaaa", "ping", "watch"),
    ev("bbbbbbbb", "lesson_open", null), ev("bbbbbbbb", "ping", "call"), ev("bbbbbbbb", "day_complete", null),
  ];
  const sum = summarise(events, [], LESSON_DAYS);
  const day0 = sum.lessons.find((l) => l.id === "0-0")!;
  assert.equal(day0.funnel[0].value, 2, "two people opened Day 0");
  assert.equal(day0.funnel[1].value, 1, "one pressed Start");
  assert.deepEqual(day0.stoppedAt, [{ label: "Watch", value: 1 }], "the finisher isn't counted as stuck");
  assert.equal(day0.answers[0].right, 1);
  assert.equal(sum.totals.visitors, 2);
  assert.equal(sum.totals.completedAny, 1);
});
