import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { seededOrder, shuffleForAttempt } from "../src/lib/company/shuffle";
import { integrityIndex, proctorRules, readProctoring, DEFAULT_SETTINGS } from "../src/lib/company/test-settings";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const q = (no: number, section = "", options: string[] = []) => ({ no, section, options });

describe("proctoring and plagiarism options (0099, user 26 Nov)", () => {
  test("shuffling: the same attempt always gets the same order; another attempt usually differs", () => {
    assert.deepEqual(seededOrder(8, "a1"), seededOrder(8, "a1"));
    assert.deepEqual([...seededOrder(8, "a1")].sort(), [0, 1, 2, 3, 4, 5, 6, 7]);
    const orders = new Set(["a1", "a2", "a3", "a4", "a5"].map((id) => seededOrder(8, id).join()));
    assert.ok(orders.size > 1);
  });

  test("shuffling keeps sections in place and every question once; options keep their original indexes", () => {
    const qs = [q(1, "A"), q(2, "A"), q(3, "A"), q(4, "B", ["w", "x", "y", "z"]), q(5, "B")];
    const out = shuffleForAttempt(qs, "attempt-7");
    assert.deepEqual(out.map((x) => x.section), ["A", "A", "A", "B", "B"]);
    assert.deepEqual(out.map((x) => x.no).sort(), [1, 2, 3, 4, 5]);
    const mcq = out.find((x) => x.no === 4)!;
    assert.deepEqual([...mcq.order!].sort(), [0, 1, 2, 3], "picks are still saved by original index");
  });

  test("integrity index: 100 less 10 per warning, never below 0, said in words", () => {
    assert.deepEqual(integrityIndex(0), { score: 100, label: "High" });
    assert.deepEqual(integrityIndex(2), { score: 80, label: "High" });
    assert.deepEqual(integrityIndex(4), { score: 60, label: "Medium" });
    assert.deepEqual(integrityIndex(12), { score: 0, label: "Low" });
  });

  test("the new switches are read, off by default, and the candidate is told about shuffling and the watermark", () => {
    assert.deepEqual(readProctoring({ shuffle: true, watermark: "on", integrity: "true" }), { ok: true, value: { fullscreen: false, tabs: false, copy: false, webcam: false, limit: null, shuffle: true, watermark: true, integrity: true } });
    const rules = proctorRules({ ...DEFAULT_SETTINGS.proctor, shuffle: true, watermark: true, integrity: true });
    assert.equal(rules.length, 2);
  });

  test("the running test shuffles and watermarks only when the test says so", () => {
    const page = read("src/app/assessment/[token]/attempt/page.tsx");
    assert.match(page, /proctor\.shuffle \? shuffleForAttempt\(task\.questions, attempt\.id\) : task\.questions/);
    assert.match(page, /\{proctor\.watermark && <Watermark text=\{found\.candidate\.email\} \/>\}/);
    assert.match(read("src/lib/company/round-data.ts"), /settings\?\.proctor\.integrity \? integrityIndex\(/);
  });
});
