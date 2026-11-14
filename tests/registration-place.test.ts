import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { lookupPlaces } from "../src/lib/registration-place";

/** A `rows` that answers with what a test hands it, and records the address it was asked about. */
function fakeSql(answer: { data: { track: string }[] | null; error: (Error & { code?: string }) | null }) {
  const asked: unknown[][] = [];
  return {
    asked,
    sql: {
      async rows<T>(_strings: TemplateStringsArray, ...values: unknown[]) {
        asked.push(values);
        return answer as unknown as { data: T[] | null; error: (Error & { code?: string }) | null };
      },
    },
  };
}

test("a place on a known track is found", async () => {
  const { sql, asked } = fakeSql({ data: [{ track: "qa-engineer" }], error: null });
  assert.deepEqual(await lookupPlaces(sql, "a@b.co"), { ok: true, tracks: ["qa-engineer"] });
  assert.deepEqual(asked, [["a@b.co"]]);
});

test("every place is found: a person can be on several tracks", async () => {
  const { sql } = fakeSql({ data: [{ track: "qa-engineer" }, { track: "project-manager" }], error: null });
  assert.deepEqual(await lookupPlaces(sql, "a@b.co"), { ok: true, tracks: ["qa-engineer", "project-manager"] });
});

test("no place is a successful answer: no tracks", async () => {
  assert.deepEqual(await lookupPlaces(fakeSql({ data: [], error: null }).sql, "a@b.co"), { ok: true, tracks: [] });
  assert.deepEqual(await lookupPlaces(fakeSql({ data: null, error: null }).sql, "a@b.co"), { ok: true, tracks: [] });
});

test("a failed lookup is NOT 'no place': it is its own answer, and logs only the code", async () => {
  const { sql } = fakeSql({ data: null, error: Object.assign(new Error("connection terminated for a@b.co"), { code: "57P01" }) });
  const logged: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { logged.push(args); };
  try {
    assert.deepEqual(await lookupPlaces(sql, "a@b.co"), { ok: false, reason: "error" });
  } finally {
    console.error = original;
  }
  assert.equal(logged.length, 1);
  assert.doesNotMatch(JSON.stringify(logged), /a@b\.co/, "the address is never logged");
});

test("a learner row on a retired or unknown track is NOT 'no place': it stops, and says why", async () => {
  for (const track of ["retired-track", "", "QA-ENGINEER", null as unknown as string]) {
    // Beside a known place too: one unknown row is enough to stop.
    const { sql } = fakeSql({ data: [{ track: "qa-engineer" }, { track }], error: null });
    const logged: unknown[][] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => { logged.push(args); };
    try {
      assert.deepEqual(await lookupPlaces(sql, "a@b.co"), { ok: false, reason: "unknown-track" }, JSON.stringify(track));
    } finally {
      console.error = original;
    }
    assert.doesNotMatch(JSON.stringify(logged), /a@b\.co/, "the address is never logged");
  }
});

test("the three answers stay distinct: no row, known track, and each way to stop", async () => {
  const none = await lookupPlaces(fakeSql({ data: [], error: null }).sql, "a@b.co");
  const known = await lookupPlaces(fakeSql({ data: [{ track: "project-manager" }], error: null }).sql, "a@b.co");
  const silence = console.error; console.error = () => {};
  try {
    const failed = await lookupPlaces(fakeSql({ data: null, error: Object.assign(new Error("x"), { code: "42703" }) }).sql, "a@b.co");
    const unknown = await lookupPlaces(fakeSql({ data: [{ track: "retired-track" }], error: null }).sql, "a@b.co");
    assert.notDeepEqual(none, unknown);
    assert.notDeepEqual(failed, unknown);
    assert.deepEqual([none.ok, known.ok, failed.ok, unknown.ok], [true, true, false, false]);
  } finally {
    console.error = silence;
  }
});

/**
 * The two orderings that matter, checked in the action's own source (it needs a
 * session and a database, so what can be pinned here is the order).
 */
function actionBody() {
  const src = readFileSync(new URL("../src/app/(register)/register/actions.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  return src.slice(src.indexOf("export async function registerInterest"), src.indexOf("async function checkRepoExists"));
}

test("the rate limit comes after local validation and before the GitHub request", () => {
  const fn = actionBody();
  const at = (needle: string) => { const i = fn.indexOf(needle); assert.ok(i > 0, `${needle} is in the action`); return i; };
  assert.ok(at("if (!email) {") < at("validateRegistration(data)"), "signed-in check first");
  assert.ok(at("validateRegistration(data)") < at("checkRateLimit("), "local validation before the throttle");
  assert.ok(at("checkRateLimit(") < at("checkRepoExists("), "the throttle before the GitHub request");
});

test("a failed place lookup stops the action before anything is written", () => {
  const fn = actionBody();
  const lookup = fn.indexOf("await lookupPlaces(");
  const stop = fn.indexOf("if (!place.ok) {");
  const firstWrite = fn.indexOf("await sql.run`");
  assert.ok(lookup > 0 && stop > lookup, "the result is checked right after the lookup");
  assert.ok(firstWrite > stop, "no write comes before the check");
  // The stop returns a failure the page can show, not a success: "unavailable" when the read failed,
  // and "support" (nothing changed, ask us) when a learner exists on a track we do not know.
  const stopBlock = fn.slice(stop, fn.indexOf("const alreadyOnTrack = place.tracks"));
  assert.match(stopBlock, /reason === "unknown-track"[\s\S]*ok: false, kind: "support"/);
  assert.match(stopBlock, /ok: false, kind: "unavailable"/);
  assert.doesNotMatch(stopBlock, /ok: true/);
  // The old shape, which ignored the error, is gone.
  assert.doesNotMatch(fn, /const \{ data: held \}/);
  // Nothing that writes or sends can come before the check: enrolment and the welcome email follow it.
  for (const effect of ["ensureLearner(", "sendWelcome(", "after("]) assert.ok(fn.indexOf(effect) > stop, `${effect} comes after the check`);
});
