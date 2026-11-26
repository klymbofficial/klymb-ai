import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import * as mod from "../src/lib/company/test-settings";
import { readBasic, readEmail, renderTemplate, roundBlocked, startBlocked, unknownVars } from "../src/lib/company/test-settings";

const now = new Date("2026-11-25T06:00:00Z");

describe("U06a: basic settings", () => {
  test("access, an end date typed in the zone, and tidy tags", () => {
    const r = readBasic({ accessOpen: true, endsOn: "2026-12-01T18:00", tags: " Campus 2026, data team ,campus 2026" }, "Asia/Kolkata", now);
    assert.ok(r.ok);
    assert.equal(r.value.accessOpen, true);
    assert.equal(r.value.endsOn, "2026-12-01T12:30:00.000Z");
    assert.deepEqual(r.value.tags, ["Campus 2026", "data team"]);
    const off = readBasic({ accessOpen: false, endsOn: "", tags: [] }, "Asia/Kolkata", now);
    assert.ok(off.ok && off.value.accessOpen === false && off.value.endsOn === null);
  });
  test("refuses a past end date, too many tags and long ones", () => {
    const past = readBasic({ accessOpen: true, endsOn: "2026-11-01T10:00" }, "Asia/Kolkata", now);
    assert.ok(!past.ok && /future/.test(past.message));
    assert.ok(!readBasic({ tags: Array.from({ length: 11 }, (_, i) => `t${i}`) }, "UTC", now).ok);
    assert.ok(!readBasic({ tags: ["x".repeat(41)] }, "UTC", now).ok);
  });
});

describe("U06a: the invitation template", () => {
  test("both empty is the standard email; one alone is refused", () => {
    assert.deepEqual(readEmail({ autoRemind: true, inviteSubject: " ", inviteBody: "" }), { ok: true, value: { autoRemind: true, invite: null } });
    assert.ok(!readEmail({ inviteSubject: "Hi", inviteBody: "" }).ok);
    assert.ok(!readEmail({ inviteSubject: "", inviteBody: "Hello" }).ok);
  });
  test("only known variables; filled in per person; unknown braces kept as typed", () => {
    const bad = readEmail({ inviteSubject: "{{company}} test", inviteBody: "Dear {{first_name}}" });
    assert.ok(!bad.ok && /first_name/.test(bad.message));
    const ok = readEmail({ autoRemind: false, inviteSubject: "  {{company}}:   {{ test_name }} ", inviteBody: "Dear {{candidate_name}},\nStart by {{start_by}}." });
    assert.ok(ok.ok);
    assert.deepEqual(ok.value, { autoRemind: false, invite: { subject: "{{company}}: {{ test_name }}", body: "Dear {{candidate_name}},\nStart by {{start_by}}." } });
    const vars = { candidate_name: "Asha", test_name: "SQL", company: "Test Company", start_by: "Fri", time_allowed: "45 minutes" };
    assert.equal(renderTemplate(ok.value.invite!.subject, vars), "Test Company: SQL");
    assert.equal(renderTemplate("{{candidate_name}} {{other}}", vars), "Asha {{other}}");
    assert.deepEqual(unknownVars("{{company}} {{x}} {{x}}"), ["x"]);
  });
});

describe("U06a: who may start, and which rounds may go", () => {
  test("access off or past the end date stops starts; an end date ahead doesn't", () => {
    assert.equal(startBlocked({ accessOpen: false, endsOn: null }, now), "closed");
    assert.equal(startBlocked({ accessOpen: true, endsOn: "2026-11-25T05:00:00Z" }, now), "ended");
    assert.equal(startBlocked({ accessOpen: true, endsOn: "2026-11-26T05:00:00Z" }, now), null);
  });
  test("a round can't close after the test ends", () => {
    const s = { accessOpen: true, endsOn: "2026-11-30T00:00:00Z" };
    assert.equal(roundBlocked(s, "2026-11-29T00:00:00Z", now), null);
    assert.match(roundBlocked(s, "2026-12-02T00:00:00Z", now)!, /closes after the test ends/);
    assert.match(roundBlocked({ accessOpen: false, endsOn: null }, "2026-11-29T00:00:00Z", now)!, /access is off/);
  });
});

describe("U06b: cut-off and details before Start", () => {
  test("cut-off is a whole percent or none; only known fields, in a fixed order", () => {
    const { readCandidate } = mod;
    assert.deepEqual(readCandidate({ cutoffPercent: "", collect: [] }), { ok: true, value: { cutoffPercent: null, collect: [] } });
    assert.deepEqual(readCandidate({ cutoffPercent: "65", collect: ["college", "phone", "shoe_size"] }), { ok: true, value: { cutoffPercent: 65, collect: ["phone", "college"] } });
    assert.ok(!readCandidate({ cutoffPercent: "101" }).ok);
    assert.ok(!readCandidate({ cutoffPercent: "62.5" }).ok);
  });
  test("asked details are all required, shaped, and unasked ones dropped", () => {
    const { readDetails } = mod;
    const all = ["phone", "linkedin", "experience", "company", "notice", "college", "graduation"] as const;
    const good = { phone: "+91 98765 43210", linkedin: "linkedin.com/in/asha", experience: "4.5", company: "Acme", notice: "30 days", college: "IIT Delhi", graduation: "2022", extra: "x" };
    const r = readDetails(good, [...all], now);
    assert.ok(r.ok);
    assert.equal(Object.keys(r.value).length, 7);
    assert.ok(!("extra" in r.value));
    assert.deepEqual(readDetails(good, ["phone"], now), { ok: true, value: { phone: "+91 98765 43210" } });
    const msg = (o: Record<string, string>, k: (typeof all)[number]) => { const x = readDetails(o, [k], now); return x.ok ? "ok" : x.message; };
    assert.match(msg({}, "company"), /Fill in current company/);
    assert.match(msg({ phone: "call me" }, "phone"), /phone number/);
    assert.match(msg({ linkedin: "https://example.com/me" }, "linkedin"), /LinkedIn/);
    assert.match(msg({ experience: "lots" }, "experience"), /Years of experience/);
    assert.match(msg({ graduation: "1850" }, "graduation"), /graduation year/);
    assert.equal(msg({ linkedin: "https://www.linkedin.com/in/asha-rao" }, "linkedin"), "ok");
  });
  test("cleared or below, and a median suggestion from 5 reviewed", () => {
    const { cutoffResult, suggestCutoff } = mod;
    assert.equal(cutoffResult(7, 10, 70), "cleared");
    assert.equal(cutoffResult(6, 10, 70), "below");
    assert.equal(cutoffResult(6, 10, null), null);
    assert.equal(suggestCutoff([50, 60, 70, 80]), null, "too few");
    assert.equal(suggestCutoff([90, 50, 70, 60, 80]), 70);
    assert.equal(suggestCutoff([50, 60, 70, 80, 90, 100]), 75);
  });
});
