import { strict as assert } from "node:assert";
import { test } from "node:test";
import { LESSON_DAYS } from "../src/data/system-design/course-app";
import {
  CHECK_SIZE, START_SCREENS, badges, checkAverage, checkPct, commit, deepLink, defaultState, flowDone, fromStored, isLocked, markRewatched,
  openLesson, previewState, submitCheck, toStored, updateLesson, type CourseState,
} from "../src/lib/course-app";

const NOW = new Date(2026, 9, 24, 9, 0, 0).getTime();
const home = (): CourseState => ({ ...defaultState(NOW), screen: "home", onboarded: true });
const qs = LESSON_DAYS["0-0"].copy.en.post;
const best = qs.map((q) => q.choices.findIndex((c) => c.best));
/** The best picks, with the first `wrong` of them swapped for a wrong choice. */
const picks = (wrong: number) => best.map((b, i) => (i < wrong ? (b + 1) % 3 : b));

test("every built lesson has a 5-question check, the same questions in both languages", () => {
  for (const [id, d] of Object.entries(LESSON_DAYS)) {
    const en = d.copy.en.post, hi = d.copy.hi.post;
    assert.equal(en.length, CHECK_SIZE, `${id} en`);
    assert.deepEqual(hi.map((q) => q.id), en.map((q) => q.id), `${id} ids`);
    for (const [k, q] of en.entries()) {
      assert.equal(q.choices.filter((c) => c.best).length, 1, `${id} ${q.id} has one best answer`);
      assert.equal(hi[k].choices.findIndex((c) => c.best), q.choices.findIndex((c) => c.best), `${id} ${q.id} best answer matches across languages`);
    }
  }
});

test("scores: 3 of 5 passes, 2 of 5 doesn't", () => {
  assert.equal(checkPct(qs, picks(0)), 100);
  assert.equal(checkPct(qs, picks(2)), 60);
  assert.equal(checkPct(qs, picks(3)), 40);
  assert.equal(checkPct(qs, []), 0, "skipped questions count as wrong");
});

test("a pass saves Prove it, keeps the best score, and opens the streak pop-up once a day", () => {
  let s = submitCheck(home(), "0-0", qs, picks(1), NOW);
  assert.deepEqual(s.lessons["0-0"].post, picks(1));
  assert.equal(s.lessons["0-0"].check, 80);
  assert.equal(s.lessons["0-0"].failed, false);
  assert.equal(s.streakPop, true);
  s = submitCheck({ ...s, streakPop: false }, "1-0", LESSON_DAYS["1-0"].copy.en.post, [0, 0, 0, 0, 0], NOW + 60_000);
  assert.equal(s.streakPop, false, "already shown today");
  const tomorrow = submitCheck(s, "0-0", qs, picks(0), NOW + 86_400_000);
  assert.equal(tomorrow.streakPop, true);
  assert.equal(tomorrow.lessons["0-0"].check, 100);
  assert.equal(tomorrow.lessons["0-0"].tries, 2);
});

test("a miss asks for a rewatch before the retake, and doesn't open the next lesson", () => {
  let s = submitCheck(home(), "0-0", qs, picks(3), NOW);
  const p = s.lessons["0-0"];
  assert.equal(p.post, undefined);
  assert.equal(p.failed, true);
  assert.equal(p.rewatched, false);
  assert.equal(p.check, 40);
  assert.equal(s.streakPop, false);
  assert.equal(isLocked(s, "1-0"), true);
  s = markRewatched(s, "0-0");
  assert.equal(s.lessons["0-0"].rewatched, true);
  s = submitCheck(s, "0-0", qs, picks(2), NOW);
  assert.equal(s.lessons["0-0"].failed, false);
  assert.ok(s.lessons["0-0"].post);
  assert.equal(isLocked(s, "1-0"), false);
});

test("rewatching only counts after a miss", () => {
  const s = updateLesson(home(), "0-0", { watched: true }, NOW);
  assert.equal(markRewatched(s, "0-0"), s);
});

test("a locked lesson won't open from the course list, but a shared link still does", () => {
  const s = home();
  assert.equal(isLocked(s, "0-0"), false, "the first lesson is always open");
  const blocked = openLesson(s, "1-0", NOW);
  assert.equal(blocked.screen, "home");
  assert.match(blocked.toast ?? "", /unlock/);
  assert.equal(deepLink(s, "1-0", NOW).screen, "player");
});

test("the lesson isn't finished until the check is passed", () => {
  const steps = { pre: [0, 0, 0], watched: true, est: [1200, 12, 700], built: 0, follow: [true, true, true, true] };
  const failed = submitCheck(updateLesson(home(), "0-0", steps, NOW), "0-0", qs, picks(3), NOW);
  assert.equal(flowDone(failed, "0-0"), false);
  assert.equal(flowDone(submitCheck(failed, "0-0", qs, picks(0), NOW), "0-0"), true);
});

test("check badges and the average", () => {
  const s = submitCheck(home(), "0-0", qs, picks(0), NOW);
  const on = (name: string) => badges(s, NOW).find((b) => b.name === name)!.on;
  assert.equal(on("First pass"), true);
  assert.equal(on("Perfect score"), true);
  assert.equal(checkAverage(home()), "—");
  assert.equal(checkAverage(s), "100%");
});

test("the commitment is signed, dated and kept", () => {
  const s = commit(home(), "  Priya Sharma ", NOW);
  assert.deepEqual(s.commitment, { name: "Priya Sharma", date: "2026-10-24" });
  const back = fromStored(JSON.parse(JSON.stringify(toStored({ ...s, popDay: "2026-10-24", streakPop: true }))), NOW);
  assert.deepEqual(back.commitment, s.commitment);
  assert.equal(back.popDay, "2026-10-24");
  assert.equal(back.streakPop, false, "the pop-up never reopens on load");
});

test("every design-review screen builds", () => {
  for (const st of START_SCREENS) assert.ok(previewState(st, {}, NOW).screen, st);
  assert.equal(previewState("commit", {}, NOW).commitment, null);
  assert.equal(previewState("lessonfail", {}, NOW).lessons["1-0"].failed, true);
});
