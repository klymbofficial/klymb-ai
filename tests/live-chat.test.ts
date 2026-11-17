import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  AWAY_MS, EMAIL_GAP_MS, chatAnonOf, chatBody, chatOwnerEmail, chatPage, chatTokenOf, hashChatToken, isChatOwner, newChatToken, shouldEmailReply, waitingTooLong,
} from "../src/lib/live-chat";

test("only the live-chat owner opens the chat, and it falls back to Sarthak", () => {
  assert.equal(chatOwnerEmail(undefined), "sarthakgupta.ksj@gmail.com");
  assert.equal(chatOwnerEmail("  Sarthak@Example.com "), "sarthak@example.com");
  assert.ok(isChatOwner("SARTHAK@example.com", "sarthak@example.com"));
  assert.ok(!isChatOwner("someone-else@example.com", "sarthak@example.com"));
  assert.ok(!isChatOwner(null, "sarthak@example.com"));
});

test("a chat token is random, checked by shape, and stored only as a hash", () => {
  const a = newChatToken();
  const b = newChatToken();
  assert.notEqual(a, b);
  assert.equal(chatTokenOf(a), a);
  assert.equal(chatTokenOf("short"), null);
  assert.equal(chatTokenOf("x".repeat(31) + "!"), null);
  assert.notEqual(hashChatToken(a), a);
  assert.equal(hashChatToken(a), hashChatToken(a));
  assert.notEqual(hashChatToken(a), hashChatToken(b));
});

test("messages are trimmed and capped; pages and browser ids are kept clean", () => {
  assert.equal(chatBody("  hi  "), "hi");
  assert.equal(chatBody("   "), null);
  assert.equal(chatBody(42), null);
  assert.equal(chatBody("x".repeat(3000))!.length, 2000);
  assert.equal(chatPage("/system-design?coupon=X#claim"), "/system-design");
  assert.equal(chatPage("https://evil.example/"), null);
  assert.equal(chatAnonOf("1b2c3d4e-aaaa-bbbb-cccc-1234567890ab"), "1b2c3d4e-aaaa-bbbb-cccc-1234567890ab");
  assert.equal(chatAnonOf("<script>"), null);
});

test("a reply is emailed only when the visitor has left, and at most once in a while", () => {
  const now = Date.parse("2026-11-17T10:00:00Z");
  const ago = (ms: number) => new Date(now - ms).toISOString();
  assert.ok(!shouldEmailReply({ visitor_seen_at: ago(30_000), emailed_at: null }, now), "still looking at the chat");
  assert.ok(shouldEmailReply({ visitor_seen_at: ago(AWAY_MS), emailed_at: null }, now), "away");
  assert.ok(shouldEmailReply({ visitor_seen_at: null, emailed_at: null }, now));
  assert.ok(!shouldEmailReply({ visitor_seen_at: ago(AWAY_MS * 2), emailed_at: ago(60_000) }, now), "just emailed");
  assert.ok(shouldEmailReply({ visitor_seen_at: ago(AWAY_MS * 2), emailed_at: ago(EMAIL_GAP_MS) }, now));
});

test("the bot says when to expect a reply once the visitor has waited a while", () => {
  const now = Date.parse("2026-11-17T10:00:00Z");
  const at = (ms: number) => new Date(now - ms).toISOString();
  assert.ok(!waitingTooLong([], now));
  assert.ok(!waitingTooLong([{ sender: "visitor", created_at: at(60_000) }], now));
  assert.ok(waitingTooLong([{ sender: "visitor", created_at: at(AWAY_MS) }], now));
  assert.ok(!waitingTooLong([{ sender: "visitor", created_at: at(AWAY_MS) }, { sender: "team", created_at: at(1000) }], now));
});

test("the visitor's side never sees who on the team replied", () => {
  const route = readFileSync("src/app/api/chat/route.ts", "utf8");
  assert.match(route, /const visible = \(m: .*\) => \(\{ id: m\.id, sender: m\.sender, body: m\.body, created_at: m\.created_at \}\)/);
  const ui = readFileSync("src/components/support/LiveChat.tsx", "utf8");
  assert.match(ui, /Klymb team/);
});

test("the live chat migration keeps emails lowercase and is safe to run twice", () => {
  const sql = readFileSync("db/migrations/0040_live_chat.sql", "utf8");
  assert.match(sql, /chat_threads_email_lowercase check \(email = lower\(email\)\)/);
  assert.match(sql, /chat_push_email_lowercase check \(email = lower\(email\)\)/);
  assert.doesNotMatch(sql, /create table (?!if not exists)/);
  assert.match(sql, /token_hash text not null unique/);
});

test("a chat started signed out counts both emails once they sign in", async () => {
  const { chatEmails } = await import("../src/lib/live-chat");
  assert.deepEqual(chatEmails({ email: "a@x.com", context: {} }), ["a@x.com"]);
  assert.deepEqual(chatEmails({ email: "account@gmail.com", context: { typedEmail: "Typed@X.com" } }), ["account@gmail.com", "typed@x.com"]);
  assert.deepEqual(chatEmails({ email: "same@x.com", context: { typedEmail: "same@x.com" } }), ["same@x.com"]);
});
