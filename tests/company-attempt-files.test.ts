import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { ATTEMPT_FILE_LIMITS, attemptFileKey, parseAttemptFileKey, safeFileName, sizeText, sniffAttemptFile, tooBigText } from "../src/lib/company/attempt-files";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const bytes = (...b: number[]) => new Uint8Array(b);
const text = (s: string) => new TextEncoder().encode(s);

describe("which files a candidate can attach (decision A: 3 × 4 MB)", () => {
  test("the limits", () => {
    assert.deepEqual([ATTEMPT_FILE_LIMITS.count, ATTEMPT_FILE_LIMITS.bytes], [3, 4 * 1024 * 1024]);
  });

  test("the type comes from the bytes, not the name", () => {
    assert.equal(sniffAttemptFile(text("%PDF-1.7 …"), "answer.txt"), "pdf", "a PDF named .txt is a PDF");
    assert.equal(sniffAttemptFile(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0), "diagram.jpg"), "png");
    assert.equal(sniffAttemptFile(bytes(0xff, 0xd8, 0xff, 0xe0), "photo"), "jpg");
    assert.equal(sniffAttemptFile(text("<svg onload=alert(1)>"), "diagram.png"), null, "an SVG pretending to be a PNG");
    assert.equal(sniffAttemptFile(text("<html><script>"), "notes.pdf"), null);
    assert.equal(sniffAttemptFile(bytes(0x50, 0x4b, 0x03, 0x04), "code.zip"), null, "no archives");
    assert.equal(sniffAttemptFile(new Uint8Array(), "empty.txt"), null);
  });

  test("text counts only as .txt or .md, valid UTF-8, without control characters", () => {
    assert.equal(sniffAttemptFile(text("# Design\n\n- API\twith tabs\r\n"), "notes.md"), "md");
    assert.equal(sniffAttemptFile(text("plain words, ünïcödé"), "Notes.TXT"), "txt");
    assert.equal(sniffAttemptFile(text("plain words"), "notes.html"), null);
    assert.equal(sniffAttemptFile(bytes(0x68, 0x00, 0x69), "nul.txt"), null, "a NUL byte");
    assert.equal(sniffAttemptFile(bytes(0xc3, 0x28), "bad.txt"), null, "invalid UTF-8");
  });

  test("names lose folders and control characters, and are capped", () => {
    assert.equal(safeFileName("C:\\Users\\asha\\design final.pdf"), "design final.pdf");
    assert.equal(safeFileName("../../etc/passwd"), "passwd");
    assert.equal(safeFileName("a\u0000b\nc.txt"), "abc.txt");
    assert.equal(safeFileName(""), "file");
    assert.equal(safeFileName("x".repeat(500)).length, 200);
  });

  test("storage keys are only ever the well-formed private kind", () => {
    const co = "0b3c1f6e-2d4a-4c5b-9e8f-1a2b3c4d5e6f";
    const at = "1b3c1f6e-2d4a-4c5b-9e8f-1a2b3c4d5e6f";
    const sha = "a".repeat(64);
    const key = attemptFileKey(co, at, sha, "pdf");
    assert.equal(key, `attempt-files/${co}/${at}/${sha}.pdf`);
    assert.deepEqual(parseAttemptFileKey(key), { companyId: co, attemptId: at, sha256: sha, kind: "pdf" });
    assert.equal(parseAttemptFileKey("company-brand/x.png"), null);
    assert.equal(parseAttemptFileKey(`attempt-files/${co}/${at}/../${sha}.pdf`), null);
    assert.throws(() => attemptFileKey("nope", at, sha, "pdf"));
    assert.equal(sizeText(4 * 1024 * 1024), "4 MB");
    assert.equal(sizeText(3.45 * 1024 * 1024), "3.5 MB");
    assert.equal(tooBigText(4 * 1024 * 1024 + 10), "Files can be up to 4 MB, and this one is just over.");
    assert.equal(tooBigText(9 * 1024 * 1024), "Files can be up to 4 MB. This one is 9 MB.");
    assert.equal(sizeText(300), "1 KB");
  });
});

describe("the upload route, as written", () => {
  const route = read("src/app/api/assessment/[token]/files/route.ts");
  test("checks the link, then the declared size before reading the body, then the real size and type", () => {
    const at = (s: string) => route.indexOf(s);
    assert.ok(at("readCandidateLink(token)") < at("content-length"));
    assert.ok(at("content-length") < at("await req.formData()"), "a huge body is refused before it is read");
    assert.ok(at("file.size > ATTEMPT_FILE_LIMITS.bytes") < at("sniffAttemptFile(bytes, name)"));
    assert.ok(at("sniffAttemptFile(bytes, name)") < at("putAttemptFile("), "nothing unchecked is stored");
    assert.ok(at("fileSlot(sql, who)") < at("putAttemptFile("), "nothing is stored for a closed or full attempt");
  });
  test("storage stays private", () => {
    const storage = read("src/lib/company/attempt-storage.ts");
    assert.match(storage, /"cache-control": "private, no-store"/);
    assert.doesNotMatch(storage, /"cache-control": "public/, "never cacheable as public, unlike logos");
    assert.match(storage, /parseAttemptFileKey\(key\)/, "only attempt keys");
  });
  test("files appear only for written_file tests", () => {
    const page = read("src/app/assessment/[token]/attempt/page.tsx");
    assert.match(page, /task\?\.submission === "written_file" &&/);
  });
});
