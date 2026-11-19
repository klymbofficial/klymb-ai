import { strict as assert } from "node:assert";
import { test } from "node:test";
import { collapseLocationDupes, searchColleges, tokenize } from "../src/lib/colleges";

const row = (id: string, name: string, state: string | null, district: string | null = null, city: string | null = null) => ({ id, name, state, district, city });

test("typed text becomes up to six uppercase words, punctuation dropped", () => {
  assert.deepEqual(tokenize("  abes, eng. college "), ["ABES", "ENG", "COLLEGE"]);
  assert.deepEqual(tokenize("a b c d e f g h"), ["A", "B", "C", "D", "E", "F"]);
  assert.deepEqual(tokenize("--"), []);
});

test("a campus listed twice, once with its town after a comma, shows once", () => {
  const out = collapseLocationDupes([
    row("1", "ABES Engineering College", "Uttar Pradesh", "Ghaziabad", "Ghaziabad"),
    row("2", "ABES Engineering College, Ghaziabad", "Uttar Pradesh", "Ghaziabad", "Ghaziabad"),
  ]);
  assert.deepEqual(out.map((r) => r.id), ["1"]);
});

test("the same name in different states stays, in the same state it collapses", () => {
  const out = collapseLocationDupes([
    row("1", "Government Polytechnic", "Bihar"),
    row("2", "Government Polytechnic", "Kerala"),
    row("3", "Government Polytechnic", "Bihar"),
  ]);
  assert.deepEqual(out.map((r) => r.id), ["1", "2"]);
});

test("too little typed, or no database, means no query and no suggestions", async () => {
  assert.deepEqual(await searchColleges(null, "abes"), []);
  let asked = false;
  const fake = { rows: async () => { asked = true; return { data: [], error: null }; } } as never;
  assert.deepEqual(await searchColleges(fake, "a"), []);
  assert.equal(asked, false);
});

test("an unreadable catalogue (no table yet, or no grant) is just no suggestions", async () => {
  for (const code of ["42P01", "42501"]) {
    const fake = { rows: async () => ({ data: null, error: Object.assign(new Error("x"), { code }) }) } as never;
    assert.deepEqual(await searchColleges(fake, "abes"), []);
  }
});
