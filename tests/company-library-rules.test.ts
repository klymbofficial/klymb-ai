import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
  filterQuestions, isMulti, libraryHref, pageOf, readLibraryFilters, readQuestion, readTags, tagOptions, typeCounts, type LibraryQuestion,
} from "../src/lib/company/library-rules";

const mcqRaw = () => ({
  type: "mcq", title: "  Left   join ", statement: "Which join keeps every left row?", difficulty: "easy", tags: "SQL, sql, Joins", minutes: "1", points: "2",
  options: [{ text: "Inner", correct: false }, { text: "Left outer", correct: true }], partial: true,
});
const writtenRaw = () => ({
  type: "written", title: "Design", statement: "Design a cache.", difficulty: "hard", tags: [], minutes: 30, points: 99,
  rubric: [{ title: "Eviction", skill: "Design", points: 4, guide: "" }, { title: "Scale", skill: "", points: 6, guide: "" }],
});

describe("readQuestion", () => {
  test("a multiple-choice question: trimmed, tags deduplicated, partial only with several correct", () => {
    const r = readQuestion(mcqRaw());
    assert.ok(r.ok);
    assert.equal(r.value.title, "Left join");
    assert.deepEqual(r.value.tags, ["SQL", "Joins"]);
    assert.equal(r.value.points, 2);
    assert.equal(r.value.partial, false);
    assert.equal(r.value.rubric, null);
    assert.equal(isMulti(r.value), false);
    const two = readQuestion({ ...mcqRaw(), options: [{ text: "A", correct: true }, { text: "B", correct: true }, { text: "C", correct: false }] });
    assert.ok(two.ok && two.value.partial && isMulti(two.value));
  });

  test("refuses unfinished or impossible multiple choice", () => {
    const msg = (raw: Record<string, unknown>) => { const r = readQuestion(raw); return r.ok ? "ok" : r.message; };
    assert.match(msg({ ...mcqRaw(), options: [{ text: "A", correct: true }] }), /2 to 8 options/);
    assert.match(msg({ ...mcqRaw(), options: [{ text: "A", correct: false }, { text: "B", correct: false }] }), /at least one option as correct/);
    assert.match(msg({ ...mcqRaw(), options: [{ text: "A", correct: true }, { text: "B", correct: true }] }), /must be wrong/);
    assert.match(msg({ ...mcqRaw(), options: [{ text: "A", correct: true }, { text: "a", correct: false }] }), /same thing/);
    assert.match(msg({ ...mcqRaw(), options: [{ text: "A", correct: true }, { text: " ", correct: false }] }), /Option 2 is empty/);
    assert.match(msg({ ...mcqRaw(), points: "0" }), /Points/);
    assert.match(msg({ ...mcqRaw(), type: "code" }), /type/);
    assert.match(msg({ ...mcqRaw(), title: "" }), /title/);
    assert.match(msg({ ...mcqRaw(), minutes: "500" }), /Recommended time/);
    assert.match(msg({ ...mcqRaw(), difficulty: "expert" }), /difficulty/);
  });

  test("a written question is worth its rubric's total, and needs named areas", () => {
    const r = readQuestion(writtenRaw());
    assert.ok(r.ok);
    assert.equal(r.value.points, 10);
    assert.equal(r.value.options, null);
    const none = readQuestion({ ...writtenRaw(), rubric: [] });
    assert.ok(!none.ok && /scoring area/.test(none.message));
    const unnamed = readQuestion({ ...writtenRaw(), rubric: [{ title: "", skill: "", points: 2, guide: "" }] });
    assert.ok(!unnamed.ok && /Area 1/.test(unnamed.message));
  });

  test("tags: at most ten, each short", () => {
    assert.ok(!readTags(Array.from({ length: 11 }, (_, i) => `t${i}`)).ok);
    assert.ok(!readTags(["x".repeat(41)]).ok);
    assert.deepEqual(readTags(" a , ,b "), { ok: true, value: ["a", "b"] });
  });
});

const q = (over: Partial<LibraryQuestion>): LibraryQuestion => ({
  id: "1", own: false, type: "mcq", title: "T", statement: "S", difficulty: "easy", tags: [], points: 2, minutes: 1,
  options: [], partial: false, rubric: null, status: "published", revision: 1, updatedAt: "2026-11-24T00:00:00Z", ...over,
});

describe("Library filters", () => {
  const list = [
    q({ id: "a", type: "mcq", difficulty: "easy", tags: ["SQL"], title: "Left join" }),
    q({ id: "b", type: "written", difficulty: "hard", tags: ["Design", "sql"], statement: "Design a cache" }),
    q({ id: "c", type: "written_file", difficulty: "medium", tags: ["Python"] }),
  ];
  test("reads only known values from the URL", () => {
    const f = readLibraryFilters({ tab: "mine", type: ["mcq", "code"], difficulty: "hard", page: "3", q: "  a  b " });
    assert.deepEqual(f, { tab: "mine", types: ["mcq"], difficulties: ["hard"], tag: null, q: "a b", page: 3 });
    assert.deepEqual(readLibraryFilters({ tab: "x", page: "-1" }).tab, "klymb");
    assert.equal(readLibraryFilters({ page: "-1" }).page, 1);
  });
  test("narrows by type, difficulty, tag (any case) and words", () => {
    const ids = (f: Parameters<typeof filterQuestions>[1]) => filterQuestions(list, f).map((x) => x.id);
    const none = { types: [], difficulties: [], tag: null, q: null };
    assert.deepEqual(ids(none), ["a", "b", "c"]);
    assert.deepEqual(ids({ ...none, types: ["written", "written_file"] }), ["b", "c"]);
    assert.deepEqual(ids({ ...none, difficulties: ["hard"] }), ["b"]);
    assert.deepEqual(ids({ ...none, tag: "SQL" }), ["a", "b"]);
    assert.deepEqual(ids({ ...none, q: "design cache" }), ["b"]);
  });
  test("counts, tags, pages and links", () => {
    assert.deepEqual(typeCounts(list), { mcq: 1, written: 1, written_file: 1 });
    assert.deepEqual(tagOptions(list), ["Design", "Python", "SQL"]);
    const p = pageOf(Array.from({ length: 45 }, (_, i) => i), 9);
    assert.deepEqual([p.page, p.pages, p.items[0]], [3, 3, 40]);
    assert.equal(libraryHref("/l", { tab: "mine", types: ["mcq"], difficulties: [], tag: null, q: "x y", page: 1 }, { q: "id" }), "/l?tab=mine&type=mcq&q=id");
    assert.equal(libraryHref("/l", { tab: "klymb", types: [], difficulties: [], tag: null, q: null, page: 1 }), "/l");
  });
});
