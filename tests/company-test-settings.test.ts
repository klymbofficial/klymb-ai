import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
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
    const vars = { candidate_name: "Asha", test_name: "SQL", company: "EXL", start_by: "Fri", time_allowed: "45 minutes" };
    assert.equal(renderTemplate(ok.value.invite!.subject, vars), "EXL: SQL");
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
