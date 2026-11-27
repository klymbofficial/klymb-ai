import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { plannedMix } from "../src/lib/company/auto-test";
import { jdFileKind, jdSchema, readJdReply } from "../src/lib/company/jd-rules";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const TAGS = ["Java", "Spring", "SQL", "RAG", "Prompt engineering"];
const ROLES = [{ slug: "backend-developer", label: "Backend developer", skills: ["Java", "SQL"] }, { slug: "ai-engineer", label: "AI engineer", skills: ["RAG"] }];

describe("Assessment from a job description (user, 26 Nov)", () => {
  test("the reply schema only allows the Library's tags and Klymb's roles", () => {
    const s = jdSchema(TAGS, ROLES) as { properties: { skills: { items: { properties: { skill: { enum: string[] } } } }; role: { enum: string[] } } };
    assert.deepEqual(s.properties.skills.items.properties.skill.enum, TAGS);
    assert.deepEqual(s.properties.role.enum, ["backend-developer", "ai-engineer", "none"]);
  });

  test("a reply is tidied: unknown skills and roles dropped, duplicates removed, known skills not listed as missing", () => {
    const r = readJdReply({
      is_job_description: true, title: "  Backend  screen ", role: "made-up", level: "senior", years: 6,
      skills: [{ skill: "java", evidence: "5+ years of Java" }, { skill: "Java", evidence: "again" }, { skill: "Kotlin", evidence: "x" }, { skill: "SQL", evidence: "Postgres" }],
      missing: ["Kotlin", "SQL", "Kafka"], summary: "Builds payment services.",
    }, TAGS, ROLES);
    assert.ok(r.ok);
    assert.deepEqual(r.value.skills.map((s) => s.skill), ["Java", "SQL"]);
    assert.equal(r.value.role, null);
    assert.equal(r.value.level, "senior");
    assert.equal(r.value.years, 6);
    assert.equal(r.value.title, "Backend screen");
    assert.deepEqual(r.value.missing, ["Kotlin", "Kafka"]);
  });

  test("not a job description, or nothing we have questions for, is said plainly", () => {
    const no = readJdReply({ is_job_description: false, skills: [], missing: [] }, TAGS, ROLES);
    assert.ok(!no.ok && /doesn't look like a job description/.test(no.message));
    const none = readJdReply({ is_job_description: true, level: "mid", skills: [], missing: ["Rust"] }, TAGS, ROLES);
    assert.ok(!none.ok && /Rust/.test(none.message));
  });

  test("experience level shifts the mix; mid-level stays the long-standing 3 / 5 / 2", () => {
    assert.deepEqual(plannedMix(10), { easy: 3, medium: 5, hard: 2 });
    assert.deepEqual(plannedMix(10, "junior"), { easy: 5, medium: 4, hard: 1 });
    assert.deepEqual(plannedMix(10, "senior"), { easy: 2, medium: 4, hard: 4 });
  });

  test("files: PDF, Word and text by name or type, nothing else", () => {
    assert.equal(jdFileKind("Role.PDF", ""), "pdf");
    assert.equal(jdFileKind("jd", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), "docx");
    assert.equal(jdFileKind("notes.txt", "text/plain"), "txt");
    assert.equal(jdFileKind("photo.png", "image/png"), null);
  });

  test("the server only proposes: nothing is created until the recruiter confirms, and the description isn't stored", () => {
    const actions = read("src/app/org/[slug]/(workspace)/assessments/jd-actions.ts");
    assert.doesNotMatch(actions, /createTest|saveOwnDraft|insert into/);
    assert.match(actions, /canWriteTests\(member\)/);
    assert.match(read("src/lib/ai/openai-json.ts"), /store: false/);
    assert.match(read("src/app/org/[slug]/(workspace)/assessments/test-actions.ts"), /pickQuestions\(\[\.\.\.klymb, \.\.\.mine\], skills, count, Math\.random, level\)/);
  });
});
