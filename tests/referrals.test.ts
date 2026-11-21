import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { TAB_SCREENS, defaultState, fromStored, previewState, toStored } from "../src/lib/course-app";
import {
  REFERRAL_ALPHABET, REFERRAL_CODE_LENGTH, REFERRAL_KEPT_DAYS, SD_REFERRAL, keepRef, keptRef, refOf, referralCodeProblem, referralLink, referralPost, referralProblem, referralState,
} from "../src/lib/sd-offer";

const DAY = 864e5;
const LAUNCH = new Date("2026-11-03T00:00:00+05:30").getTime();

test("the offer is 3 friends, with no deadline", () => {
  assert.deepEqual(SD_REFERRAL, { friends: 3 });
});

test("a code is tidied up, and anything else is refused", () => {
  assert.equal(refOf("ABCD2345"), "ABCD2345");
  assert.equal(refOf(" abcd2345 "), "ABCD2345", "retyped from a phone");
  for (const bad of ["", "ABC", "ABCD23456", "ABCD234O", "ABCD2341", "ABCD 345", "<script>", null, undefined, 12345678]) {
    assert.equal(refOf(bad), null, String(bad));
  }
});

test("every code we can make is one we accept", () => {
  assert.equal(refOf(REFERRAL_ALPHABET.slice(0, REFERRAL_CODE_LENGTH)), REFERRAL_ALPHABET.slice(0, REFERRAL_CODE_LENGTH));
  assert.equal(refOf(REFERRAL_ALPHABET.slice(-REFERRAL_CODE_LENGTH)), REFERRAL_ALPHABET.slice(-REFERRAL_CODE_LENGTH));
});

test("the code field may be blank, but not wrong", () => {
  assert.equal(referralCodeProblem(""), null);
  assert.equal(referralCodeProblem("  "), null);
  assert.equal(referralCodeProblem("abcd2345"), null);
  assert.match(referralCodeProblem("nope") ?? "", /Check the referral code/);
});

test("a bad code, your own code and your own phone are all refused before paying", () => {
  const buyer = { email: "new@gmail.com", phone: "+919876543210" };
  assert.match(referralProblem(null, buyer) ?? "", /isn't valid/);
  assert.match(referralProblem({ email: "new@gmail.com", phone: "+919000000000" }, buyer) ?? "", /your own/);
  assert.match(referralProblem({ email: "other@gmail.com", phone: "98765 43210" }, buyer) ?? "", /your own/, "same phone, second account");
  assert.equal(referralProblem({ email: "other@gmail.com", phone: "+919000000000" }, buyer), null);
  assert.equal(referralProblem({ email: "other@gmail.com", phone: null }, buyer), null);
  assert.match(referralProblem({ email: "other@gmail.com", phone: "09876543210" }, buyer) ?? "", /your own/, "a leading 0 is the same phone");
  const abroad = { email: "new@gmail.com", phone: "+14155550123" };
  assert.match(referralProblem({ email: "other@gmail.com", phone: "14155550123" }, abroad) ?? "", /your own/, "same US phone");
  assert.equal(referralProblem({ email: "other@gmail.com", phone: "4155550123" }, abroad), null, "a bare 10 digits is Indian, so not the US number");
});

test("where someone stands", () => {
  assert.equal(referralState({ count: 0, refunded: false }), "open");
  assert.equal(referralState({ count: 2, refunded: false }), "open");
  assert.equal(referralState({ count: 3, refunded: false }), "earned", "a third friend counts however late they bought");
  assert.equal(referralState({ count: 5, refunded: false }), "earned");
  assert.equal(referralState({ count: 3, refunded: true }), "refunded");
  assert.equal(referralState({ count: 1, refunded: true }), "refunded", "a friend leaving later changes nothing");
});

test("the link is the offer page with the code on it", () => {
  assert.equal(referralLink("https://www.klymb.ai", "ABCD2345"), "https://www.klymb.ai/system-design?ref=ABCD2345");
});

test("a lesson post carries the link, in the lesson's language", () => {
  const link = "https://www.klymb.ai/system-design?ref=ABCD2345";
  assert.equal(referralPost("Day 1 done.", link, "en"), `Day 1 done.\n\nWant to learn this with me? Join here: ${link}`);
  assert.match(referralPost("Day 1 ho gaya.", link, "hi"), /^Day 1 ho gaya\.\n\nMere saath seekhna hai\? Yahan join karo: https/);
});

test("a browser keeps a code for 14 days", () => {
  const now = LAUNCH;
  const stored = keepRef("ABCD2345", now);
  assert.equal(REFERRAL_KEPT_DAYS, 14);
  assert.equal(keptRef(stored, now), "ABCD2345");
  assert.equal(keptRef(stored, now + 14 * DAY - 1), "ABCD2345");
  assert.equal(keptRef(stored, now + 14 * DAY), null, "ran out");
});

test("anything else in that storage is ignored", () => {
  for (const bad of [null, "", "not json", "null", "{}", '{"code":"ABCD2345"}', `{"code":"<script>","until":${LAUNCH + DAY}}`, `{"code":"ABCD2345","until":"soon"}`]) {
    assert.equal(keptRef(bad, LAUNCH), null, String(bad));
  }
});

test("Refer is a tab, and its preview shows made-up numbers and saves nothing", () => {
  assert.ok(TAB_SCREENS.includes("refer"));
  const preview = previewState("refer");
  assert.equal(preview.screen, "refer");
  assert.equal(preview.tab, "refer");
  assert.equal(preview.referralSample, true);
  assert.equal(defaultState().referralSample, false);
  assert.equal("referralSample" in toStored(preview), false);
});

test("the offer is shown once per device, and that survives a reload", () => {
  const seen = fromStored(toStored({ ...defaultState(), onboarded: true, referralSeen: true }));
  assert.equal(seen.referralSeen, true);
  assert.equal(defaultState().referralSeen, false);
  assert.equal(fromStored({ onboarded: true }).referralSeen, false, "someone from before this existed still sees it");
});

test("a refund earned by referring keeps the course", () => {
  const payments = readFileSync("src/lib/payments.ts", "utf8");
  assert.match(payments, /enrollments\.finished_at is null and enrollments\.referral_earned_at is null/);
});

test("the migration adds what the code reads", () => {
  const sql = readFileSync("db/migrations/0021_referrals.sql", "utf8");
  for (const column of ["referral_code", "referral_earned_at", "referrer_email"]) assert.match(sql, new RegExp(`add column if not exists ${column}`));
  assert.match(sql, /create unique index if not exists enrollments_referral_code_idx/);
});
