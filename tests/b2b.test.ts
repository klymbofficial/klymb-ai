import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  attention, B2B_STAGES, cleanGstin, cleanUrl, daysBetween, dealValue, DEFAULT_DOCS, inr, pendingDocs, quarterOf, signBlocked, weighted, winChance,
} from "../src/lib/b2b";
import { b2bDigestEmail } from "../src/lib/b2b-digest";

test("the stages are the ones asked for, plus lost, with their win chance", () => {
  assert.deepEqual(B2B_STAGES.map((s) => s.key), ["lead", "in_progress", "in_discussion", "document_needed", "signed", "on_hold", "lost"]);
  assert.deepEqual(B2B_STAGES.map((s) => s.win), [10, 20, 40, 70, 100, 10, 0]);
  assert.equal(winChance("nope"), 0);
  assert.equal(weighted(200000, "in_discussion"), 80000);
});

test("deal value is seats × price − discount, or the typed amount without a per-seat price", () => {
  assert.equal(dealValue({ seats: 40, pricePerSeat: 5000, discount: 20000, typed: 999 }), 180000);
  assert.equal(dealValue({ seats: 2, pricePerSeat: 100, discount: 500, typed: 0 }), 0);
  assert.equal(dealValue({ seats: 40, pricePerSeat: null, discount: 0, typed: 150000 }), 150000);
});

test("signed needs every document signed or marked not needed", () => {
  const docs = Object.entries(DEFAULT_DOCS).map(([kind, status]) => ({ kind, status: status as string }));
  assert.deepEqual(pendingDocs(docs), ["proposal", "nda", "msa", "sow"]);
  assert.match(signBlocked(docs)!, /Proposal \/ quote, NDA, MSA, SOW/);
  const done = docs.map((d) => ({ ...d, status: d.kind === "po" ? "not_needed" : "signed" }));
  assert.equal(signBlocked(done), null);
  assert.match(signBlocked([{ kind: "sow", status: "client_review" }])!, /Sign SOW first, or mark it not needed/);
});

test("attention: overdue, missing next step, and quiet for 14 days", () => {
  const base = { stage: "in_discussion", next_step: "Call", next_step_date: "2026-11-20", last_activity_at: "2026-11-20T06:00:00Z", stage_changed_at: "2026-10-01T06:00:00Z", created_at: "2026-10-01T06:00:00Z" };
  assert.deepEqual(attention(base, "2026-11-25"), { overdue: true, noNextStep: false, stale: false });
  assert.equal(attention({ ...base, last_activity_at: "2026-11-10T06:00:00Z" }, "2026-11-25").stale, true);
  assert.equal(attention({ ...base, next_step: null }, "2026-11-25").noNextStep, true);
  // On hold isn't stale, and closed deals need nothing.
  assert.equal(attention({ ...base, stage: "on_hold", last_activity_at: null }, "2026-11-25").stale, false);
  assert.deepEqual(attention({ ...base, stage: "signed", next_step: null }, "2026-11-25"), { overdue: false, noNextStep: false, stale: false });
});

test("days, quarters and rupees", () => {
  assert.equal(daysBetween("2026-11-01", "2026-11-25"), 24);
  // 23:30 IST on the 24th is still the 24th.
  assert.equal(daysBetween("2026-11-24T18:00:00Z", "2026-11-25"), 1);
  assert.deepEqual(quarterOf("2026-11-25"), { start: "2026-10-01", end: "2027-01-01" });
  assert.deepEqual(quarterOf("2027-02-10"), { start: "2027-01-01", end: "2027-04-01" });
  assert.deepEqual(quarterOf("2026-04-01"), { start: "2026-04-01", end: "2026-07-01" });
  assert.equal(inr(1234567), "₹12,34,567");
  assert.equal(inr(1234567, true), "₹12 L");
  assert.equal(inr(450000, true), "₹4.5 L");
  assert.equal(inr(25000000, true), "₹2.5 Cr");
});

test("links and GSTINs are cleaned", () => {
  assert.equal(cleanUrl("acme.com"), "https://acme.com");
  assert.equal(cleanUrl("http://acme.com/x"), "https://acme.com/x");
  assert.equal(cleanUrl("not a url"), null);
  assert.equal(cleanGstin(" 09aaacm1234a1z5 "), "09AAACM1234A1Z5");
  assert.equal(cleanGstin("123"), false);
  assert.equal(cleanGstin(""), null);
});

test("the B2B morning email lists due deals and tasks, escaped", () => {
  const mail = b2bDigestEmail({
    name: "Anil", today: "2026-11-25", siteUrl: "https://k.test",
    deals: [{ id: "d1", company_name: "Acme <Pvt>", title: "Pilot", stage: "document_needed", value_inr: 200000, next_step: "Send SOW", next_step_date: "2026-11-24" }],
    tasks: [{ deal_id: "d1", company_name: "Acme <Pvt>", title: "Get PO", due: "2026-11-25" }],
  });
  assert.equal(mail.subject, "B2B: 1 deal to move today (1 overdue), 1 task");
  assert.match(mail.html, /Acme &lt;Pvt&gt;/);
  assert.match(mail.html, /https:\/\/k\.test\/admin\/sales\/b2b\/deals\/d1/);
  assert.match(mail.text, /Acme <Pvt>, Document needed, ₹2,00,000, overdue since 2026-11-24: Send SOW/);
  assert.match(mail.text, /Get PO \(Acme <Pvt>\), today/);
});

test("the migration keeps B2B in the course schema, with lost needing a reason", () => {
  const sql = readFileSync("db/migrations/0069_b2b_deals.sql", "utf8");
  for (const t of ["b2b_companies", "b2b_contacts", "b2b_deals", "b2b_deal_docs", "b2b_activities", "b2b_tasks", "b2b_stage_history"]) {
    assert.match(sql, new RegExp(`create table if not exists course\\.${t} \\(`));
  }
  assert.match(sql, /check \(\(stage = 'lost'\) = \(lost_reason is not null\)\)/);
  assert.match(sql, /'lead', 'in_progress', 'in_discussion', 'document_needed', 'signed', 'on_hold', 'lost'/);
});
