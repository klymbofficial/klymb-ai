import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { aiReviewPrompt, aiReviewSchema, readAiReview, suggestTargets } from "../src/lib/company/ai-review-rules";
import type { RubricItem } from "../src/lib/company/review-rules";
import { COMPANY_SWITCHES } from "../src/lib/company/settings-rules";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const items: RubricItem[] = [
  { title: "Pick", skill: "", points: 2, guide: "", questionNo: 1, question: "MCQ", mcq: true },
  { title: "Retrieval", skill: "RAG", points: 3, guide: "3: hybrid search and filters.", questionNo: 2, question: "Design RAG" },
  { title: "Answers", skill: "RAG", points: 2, guide: "2: cites sources.", questionNo: 2, question: "Design RAG" },
  { title: "Empty", skill: "x", points: 4, guide: "", questionNo: 3, question: "Unanswered" },
];
const questions = [
  { section: "", title: "MCQ", brief: "", submission: "written" as const, rubric: [] },
  { section: "", title: "Design RAG", brief: "Design an HR assistant.", submission: "written" as const, rubric: [] },
  { section: "", title: "Unanswered", brief: "", submission: "written" as const, rubric: [] },
];
const answer = "I would chunk the policies and use hybrid search with BM25 and embeddings, filtered by country.\nEach answer cites the policy it came from.";
const sub = { answer: "", answers: [{ questionNo: 2, answer }, { questionNo: 3, answer: "   " }] };

describe("AI suggestions for written answers (user, 26 Nov)", () => {
  test("only written areas with an answer are sent; multiple choice and blank answers are left out", () => {
    const t = suggestTargets(items, questions, sub, { title: "T", brief: "" });
    assert.deepEqual(t.map((x) => x.index), [1, 2]);
    assert.equal(t[0].brief, "Design an HR assistant.");
    const prompt = aiReviewPrompt(t);
    assert.match(prompt, /<<<ANSWER[\s\S]*hybrid search[\s\S]*ANSWER>>>/);
    assert.equal((prompt.match(/Candidate's answer/g) ?? []).length, 1, "each answer appears once");
    const schema = aiReviewSchema(t) as { properties: { areas: { items: { properties: { index: { enum: number[] } } } } } };
    assert.deepEqual(schema.properties.areas.items.properties.index.enum, [1, 2]);
  });

  test("the reply is checked: points within range, unknown areas dropped, and only quotes really in the answer kept", () => {
    const t = suggestTargets(items, questions, sub, { title: "T", brief: "" });
    const out = readAiReview({ areas: [
      { index: 1, points: 9, evidence: ["use hybrid search with BM25 and embeddings", "uses a knowledge graph", "“filtered by country.”"], missing: ["reranking"], reasoning: "Good retrieval." },
      { index: 1, points: 0, evidence: [], missing: [], reasoning: "duplicate" },
      { index: 2, points: -3, evidence: ["Each answer cites the policy it came from."], missing: [], reasoning: "" },
      { index: 7, points: 2, evidence: [], missing: [], reasoning: "unknown" },
    ] }, t);
    assert.deepEqual(out.map((s) => [s.index, s.points, s.max]), [[1, 3, 3], [2, 0, 2]]);
    assert.deepEqual(out[0].evidence, ["use hybrid search with BM25 and embeddings", "filtered by country."], "invented quotes are dropped");
    assert.deepEqual(out[0].missing, ["reranking"]);
  });

  test("off by default, a company switch, and every suggestion kept on record", () => {
    assert.ok((COMPANY_SWITCHES as readonly string[]).includes("ai_review_suggestions"));
    const mig = read("db/migrations/0101_ai_review_suggestions.sql");
    assert.match(mig, /ai_review_suggestions boolean not null default false/);
    assert.match(mig, /create table if not exists course\.ai_review_suggestions/);
    const action = read("src/app/org/[slug]/(workspace)/assessments/[item]/candidates/[candidate]/actions.ts");
    assert.match(action, /aiReviewOn\(sql, member\.companyId\)/);
    assert.match(action, /insert into course\.ai_review_suggestions/);
    assert.match(action, /canScore\(member\)/);
    assert.doesNotMatch(action.slice(action.indexOf("suggestReviewScores")), /recordReview\(/, "a suggestion never records a review");
  });

  test("the candidate's name and email are never sent", () => {
    const rules = read("src/lib/company/ai-review-rules.ts");
    assert.doesNotMatch(rules, /candidate\.(name|email)/);
    const action = read("src/app/org/[slug]/(workspace)/assessments/[item]/candidates/[candidate]/actions.ts");
    const fn = action.slice(action.indexOf("export async function suggestReviewScores"));
    assert.doesNotMatch(fn, /view\.candidate/);
  });
});
