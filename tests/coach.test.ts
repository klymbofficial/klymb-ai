import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  ASSESSMENT_SECONDS,
  COACH_LIMITS,
  SKILL_LEVELS,
  parseSessionSummary,
  parseSkillEvidence,
} from "../src/lib/coach/assessment";
import { COACH_TOOLS, SESSION_TUNING, coachInstructions, realtimeSession } from "../src/lib/coach/prompt";
import { findTopic, nextTopic, topicIds, topicsFor } from "../src/lib/coach/topics";
import { trackSlugs } from "../src/data/tracks";

const topic = topicsFor("junior-developer")[0];
const ids = topicIds("junior-developer");

// ── Evidence the coach files while it talks ─────────────────
// It is a model's judgement relayed by the learner's own browser, so the
// point of these is that neither gets to decide what lands in the table.

test("evidence is refused for a topic that is not on the track", () => {
  const result = parseSkillEvidence(
    { topic: "sql-beyond-select", skill: "Joins", level: "solid", evidence: "Explained an inner join." },
    ids,
  );
  assert.equal(result.ok, false);
});

test("only the four levels are accepted", () => {
  for (const level of SKILL_LEVELS) {
    const ok = parseSkillEvidence({ topic: topic.id, skill: "Commit messages", level, evidence: "Said why, not what." }, ids);
    assert.equal(ok.ok, true, `${level} should be allowed`);
  }
  for (const level of ["excellent", "A+", 4, null, "SOLID"]) {
    const bad = parseSkillEvidence({ topic: topic.id, skill: "Commit messages", level, evidence: "x" }, ids);
    assert.equal(bad.ok, false, `${String(level)} should be refused`);
  }
});

test("a level with nothing behind it is not evidence", () => {
  const result = parseSkillEvidence({ topic: topic.id, skill: "Commit messages", level: "strong", evidence: "   " }, ids);
  assert.equal(result.ok, false);
});

test("free text is trimmed and capped, and an absent next step is null", () => {
  const result = parseSkillEvidence(
    {
      topic: topic.id,
      skill: `  ${"s".repeat(200)}  `,
      level: "shaky",
      evidence: "e".repeat(5000),
      nextStep: "",
    },
    ids,
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.skill.length, COACH_LIMITS.skill);
  assert.equal(result.value.evidence.length, COACH_LIMITS.evidence);
  assert.equal(result.value.nextStep, null);
});

test("a summary needs words, and an impossible reply time is dropped rather than averaged", () => {
  assert.equal(parseSessionSummary({ summary: "" }).ok, false);

  const kept = parseSessionSummary({ summary: "Strong on branching, vague on rebasing.", firstReplyMs: 1430.6 });
  assert.equal(kept.ok, true);
  if (kept.ok) assert.equal(kept.value.firstReplyMs, 1431);

  for (const bad of [0, -5, 90_000, "soon", null, NaN]) {
    const result = parseSessionSummary({ summary: "Fine.", firstReplyMs: bad });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.firstReplyMs, null, `${String(bad)} should not be stored`);
  }
});

// ── Topics ─────────────────────────────────────────────────

test("every track has topics a five-minute session can cover", () => {
  for (const slug of trackSlugs) {
    const topics = topicsFor(slug);
    assert.ok(topics.length >= 3, `${slug} has only ${topics.length} topics`);
    for (const t of topics) {
      assert.ok(t.skills.length >= 3 && t.skills.length <= 4, `${slug}/${t.id} has ${t.skills.length} skills`);
      // The instructions tell the coach to open with this verbatim, so it has
      // to be a question rather than a topic heading.
      assert.ok(t.opener.trim().endsWith("?"), `${slug}/${t.id} does not open with a question`);
      assert.ok(t.strongAnswer.length > 40, `${slug}/${t.id} does not say what a strong answer covers`);
    }
    const unique = new Set(topics.map((t) => t.id));
    assert.equal(unique.size, topics.length, `${slug} repeats a topic id`);
  }
});

test("a topic is only ever resolved from the learner's own track", () => {
  assert.equal(findTopic("junior-developer", "sql-beyond-select"), undefined);
  assert.equal(findTopic("junior-developer", null), undefined);
  assert.equal(findTopic("junior-developer", topic.id)?.label, topic.label);
  assert.deepEqual(topicsFor("not-a-track"), []);
});

test("the next topic is the first one not practised, and a full set starts again", () => {
  assert.equal(nextTopic("junior-developer", [])?.id, ids[0]);
  assert.equal(nextTopic("junior-developer", [ids[0]])?.id, ids[1]);
  // Everything covered: a second pass is a fair way to show it has improved.
  assert.equal(nextTopic("junior-developer", ids)?.id, ids[0]);
});

// ── What the coach is told ─────────────────────────────────

test("the opener is passed through verbatim, so every learner starts level", () => {
  const instructions = coachInstructions({
    firstName: "Asha",
    trackName: "Junior Developer",
    day: 4,
    topic,
    covered: [],
  });
  assert.ok(instructions.includes(topic.opener), "the opener is not in the instructions");
  assert.ok(instructions.includes(topic.label));
  assert.ok(instructions.includes("Asha") && instructions.includes("day 4"));
  // Spoken, not written: these two rules are the whole difference.
  assert.match(instructions, /Never two questions at once/);
  assert.match(instructions, /No lists, no headings/);
  // The levels must be named, or the tool call cannot be filled in.
  for (const level of SKILL_LEVELS) assert.ok(instructions.includes(level), `${level} is not named`);
});

test("a repeat session is told what was already answered, and a first one is not", () => {
  const context = { firstName: "Asha", trackName: "Junior Developer", day: 9, topic, covered: [] as string[] };
  assert.doesNotMatch(coachInstructions(context), /Already answered/);
  const again = coachInstructions({ ...context, covered: ["Commit messages"] });
  assert.match(again, /Already answered/);
  assert.ok(again.includes("Commit messages"));
});

test("the coach is given the time it has, from the one place that defines it", () => {
  const instructions = coachInstructions({ firstName: "A", trackName: "T", day: 1, topic, covered: [] });
  assert.ok(instructions.includes(`${ASSESSMENT_SECONDS / 60} minutes`));
});

// ── The session handed to the provider ─────────────────────

test("the session carries the instructions, the voice and both tools", () => {
  const session = realtimeSession({ model: "gpt-realtime-2.1", voice: "marin", instructions: "Be brief." });
  assert.equal(session.type, "realtime");
  assert.equal(session.model, "gpt-realtime-2.1");
  assert.equal(session.instructions, "Be brief.");
  // GA nests the voice under audio.output; it was a top-level field in the beta.
  assert.equal(session.audio.output.voice, "marin");
  assert.deepEqual(session.output_modalities, ["audio"]);
  assert.deepEqual(
    session.tools.map((tool) => tool.name),
    ["record_skill_evidence", "end_assessment"],
  );
});

test("turn detection is not set at creation but sent after, where a refusal is survivable", () => {
  const session = realtimeSession({ model: "m", voice: "v", instructions: "i" });
  assert.equal(JSON.stringify(session).includes("turn_detection"), false);
  assert.equal(SESSION_TUNING.type, "session.update");
  assert.equal(SESSION_TUNING.session.audio.input.turn_detection.type, "semantic_vad");
});

test("the recording tool takes the learner's own words, and the levels are the stored ones", () => {
  const record = COACH_TOOLS.find((tool) => tool.name === "record_skill_evidence");
  assert.ok(record);
  assert.deepEqual([...record.parameters.properties.level.enum], [...SKILL_LEVELS]);
  assert.deepEqual([...record.parameters.required], ["skill", "level", "evidence"]);
});

// ── The schema the evidence lands in ───────────────────────

const migration = readFileSync("db/migrations/0006_coach.sql", "utf8");
/**
 * Executable SQL only. The file explains in prose what is deliberately not
 * stored, naming the very words some of these assertions look for, so they
 * have to read past the commentary — as tests/course-schema.test.ts does.
 */
const migrationCode = migration.replace(/--.*$/gm, "");

test("both coach tables are created in the course schema", () => {
  for (const table of ["coach_sessions", "coach_skills"]) {
    assert.match(migration, new RegExp(`create table if not exists course\\.${table} \\(`));
  }
});

test("the stored levels are exactly the levels the code allows", () => {
  const allowed = migration.match(/coach_skills_level_check check \(level in \(([^)]*)\)\)/)?.[1];
  assert.ok(allowed, "coach_skills has no level allowlist");
  assert.deepEqual(
    allowed.split(",").map((value) => value.trim().replace(/'/g, "")),
    [...SKILL_LEVELS],
  );
});

test("evidence cannot outlive the session or the learner it belongs to", () => {
  assert.match(migration, /references course\.learners \(id\) on delete cascade/);
  assert.match(migration, /references course\.coach_sessions \(id\) on delete cascade/);
});

test("the track allowlist covers all six tracks", () => {
  const allowed = migration.match(/coach_sessions_track_check check \(track in \(([\s\S]*?)\)\)/)?.[1];
  assert.ok(allowed, "coach_sessions has no track allowlist");
  const listed = allowed.split(",").map((value) => value.trim().replace(/'/g, ""));
  assert.deepEqual([...listed].sort(), [...trackSlugs].sort());
});

test("the queries we run are indexed", () => {
  // src/lib/coach/history.ts: this learner's sessions, newest first; and the
  // evidence of one session.
  assert.match(migration, /create index if not exists coach_sessions_learner on course\.coach_sessions \(learner_id, created_at desc\)/);
  assert.match(migration, /create index if not exists coach_skills_session on course\.coach_skills \(session_id, created_at\)/);
});

test("no transcript column is added anywhere", () => {
  // The captions are on screen only. A recording of someone practising for
  // interviews is a liability with no reader.
  assert.doesNotMatch(migrationCode, /transcript|recording|audio_url/i);
});
