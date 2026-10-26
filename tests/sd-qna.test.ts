import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { QNA_MAX, ago, cleanBody, displayName, isUuid, toFeed, type QnaRow } from "../src/lib/sd-qna";

const row = (id: string, at: string, parent: string | null = null, email = "a@x.com", staff = false): QnaRow =>
  ({ id, created_at: at, parent_id: parent, email, name: id, staff, body: `body ${id}` });

test("questions come newest first, replies oldest first, under their own question", () => {
  const feed = toFeed([
    row("q1", "2026-10-01T10:00:00Z"),
    row("r2", "2026-10-01T12:00:00Z", "q1"),
    row("q2", "2026-10-02T10:00:00Z"),
    row("r1", "2026-10-01T11:00:00Z", "q1", "admin@klymb.ai", true),
    row("orphan", "2026-10-01T11:00:00Z", "gone"),
  ], null);
  assert.deepEqual(feed.map((q) => q.id), ["q2", "q1"]);
  assert.deepEqual(feed[1].replies.map((r) => r.id), ["r1", "r2"]);
  assert.equal(feed[1].replies[0].staff, true);
  assert.deepEqual(feed[0].replies, []);
});

test("emails never reach the feed; it says only whether a post is the viewer's", () => {
  const feed = toFeed([row("q1", "2026-10-01T10:00:00Z", null, "me@x.com"), row("r1", "2026-10-01T11:00:00Z", "q1", "you@x.com")], "me@x.com");
  assert.doesNotMatch(JSON.stringify(feed), /@/);
  assert.equal(feed[0].mine, true);
  assert.equal(feed[0].replies[0].mine, false);
  assert.equal(toFeed([row("q1", "2026-10-01T10:00:00Z")], null)[0].mine, false, "signed out owns nothing");
});

test("a post is trimmed and capped, and blank is nothing", () => {
  assert.equal(cleanBody("   \n "), "");
  assert.equal(cleanBody(42), "");
  assert.equal(cleanBody("  why\r\n\r\n\r\n\r\nnot?  "), "why\n\nnot?");
  assert.equal(cleanBody("x".repeat(QNA_MAX + 50)).length, QNA_MAX);
});

test("strangers see a first name and an initial, never the address", () => {
  assert.equal(displayName("Priya Sharma", "p@x.com"), "Priya S.");
  assert.equal(displayName("Priya", "p@x.com"), "Priya");
  assert.equal(displayName("  ", "rahul.k@x.com"), "rahul.k");
});

test("ids and times", () => {
  assert.ok(isUuid("3f2b8c1e-6a4d-4e2f-9b1a-0c5d7e8f9a0b"));
  assert.ok(!isUuid("1 or 1=1"));
  const now = Date.parse("2026-10-26T12:00:00Z");
  assert.equal(ago("2026-10-26T11:59:30Z", now), "now");
  assert.equal(ago("2026-10-26T11:55:00Z", now), "5m");
  assert.equal(ago("2026-10-26T09:00:00Z", now), "3h");
  assert.equal(ago("2026-10-24T12:00:00Z", now), "2d");
});

test("the table keeps removed posts, caps a post, and indexes what the feed reads", () => {
  const sql = readFileSync("db/migrations/0007_sd_qna.sql", "utf8");
  assert.match(sql, /create table if not exists course\.sd_qna/);
  assert.match(sql, /hidden_at timestamptz/);
  assert.ok(sql.includes(`char_length(body) between 1 and ${QNA_MAX}`));
  assert.match(sql, /on course\.sd_qna \(lesson, created_at desc\) where parent_id is null/);
  assert.match(sql, /on course\.sd_qna \(parent_id, created_at\) where parent_id is not null/);
});
