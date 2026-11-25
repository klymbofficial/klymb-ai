import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { hasRole, type CompanyMember } from "../src/lib/company/access";
import { DEFAULT_SETTINGS, proctorRules, proctored, readProctoring } from "../src/lib/company/test-settings";

/** 25 Nov follow-ups: proctoring, admin powers, the Questions tab, a way back, and click feedback. */

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

describe("proctoring settings", () => {
  test("off by default", () => {
    assert.deepEqual(DEFAULT_SETTINGS.proctor, { fullscreen: false, tabs: false, copy: false, webcam: false, limit: null });
    assert.equal(proctored(DEFAULT_SETTINGS.proctor), false);
  });

  test("switches and a warning limit from 1 to 20 that needs full screen or tab detection", () => {
    assert.deepEqual(readProctoring({ fullscreen: true, tabs: "on", copy: false, webcam: "true", limit: "3" }), { ok: true, value: { fullscreen: true, tabs: true, copy: false, webcam: true, limit: 3 } });
    assert.equal(readProctoring({ fullscreen: true, limit: "0" }).ok, false);
    assert.equal(readProctoring({ fullscreen: true, limit: "21" }).ok, false);
    assert.equal(readProctoring({ fullscreen: true, limit: "2.5" }).ok, false);
    assert.equal(readProctoring({ copy: true, limit: "3" }).ok, false, "copy alone never counts warnings");
    assert.deepEqual(readProctoring({ tabs: true, limit: "" }), { ok: true, value: { fullscreen: false, tabs: true, copy: false, webcam: false, limit: null } });
  });

  test("the candidate is told every rule before Start, the limit included", () => {
    const rules = proctorRules({ fullscreen: true, tabs: true, copy: true, webcam: true, limit: 3 });
    assert.equal(rules.length, 5);
    assert.match(rules.join(" "), /full screen/);
    assert.match(rules.join(" "), /After 3 warnings, your test is submitted automatically/);
  });

  test("the test window warns, blocks and snapshots; the server decides the limit", () => {
    const guard = read("src/components/company/ProctorGuard.tsx");
    assert.match(guard, /fullscreenchange/);
    assert.match(guard, /visibilitychange/);
    assert.match(guard, /"copy", onCopy/);
    assert.match(guard, /getUserMedia/);
    assert.match(guard, /out\.submitted\) \{ leaving\.current = true; window\.location\.assign\(home\)/);
    const mig = read("db/migrations/0070_proctoring.sql");
    assert.match(mig, /n >= lim/);
    assert.match(mig, /course\.submit_attempt\(p_attempt, 'candidate', p_candidate, p_generation, null, 30\)/);
    const start = read("src/app/assessment/[token]/actions.ts");
    assert.match(start, /settings\.proctor\.webcam && form\.get\("webcam_consent"\) !== "on"/, "webcam needs consent before Start");
  });

  test("recruiters edit proctoring in Settings", () => {
    const page = read("src/app/org/[slug]/(workspace)/assessments/[item]/page.tsx");
    assert.match(page, /proctoring: "Proctoring"/);
    assert.match(page, /<ProctorSettingsForm/);
    assert.match(read("src/app/org/[slug]/(workspace)/assessments/settings-actions.ts"), /export async function saveProctorSettings/);
  });
});

describe("a company admin holds every power", () => {
  const m = (roles: CompanyMember["roles"]) => ({ roles } as unknown as CompanyMember);
  test("admin counts as every role; others keep theirs", () => {
    for (const r of ["reviewer", "recruiter", "company_head", "team_lead", "employee"] as const) assert.equal(hasRole(m(["admin"]), [r]), true, r);
    assert.equal(hasRole(m(["recruiter"]), ["reviewer"]), false);
    assert.equal(hasRole(null, ["admin"]), false);
  });
  test("the database agrees: decisions and reviews accept an admin", () => {
    const mig = read("db/migrations/0069_admin_all_powers.sql");
    assert.match(mig, /r\.role in \('recruiter', 'company_head', 'admin'\)/);
    assert.match(mig, /r\.role in \('reviewer', 'admin'\)/);
  });
});

describe("fixes", () => {
  test("the Questions tab lists a test's questions", () => {
    const page = read("src/app/org/[slug]/(workspace)/assessments/[item]/page.tsx");
    assert.match(page, /if \(tab === "questions" && shown\.questions\?\.length\)/);
  });
  test("an employee has a way back after a test", () => {
    const page = read("src/app/assessment/[token]/page.tsx");
    assert.match(page, /label: "Back to My assessments"/);
    assert.match(read("src/components/company/CandidateShell.tsx"), /back\.label/);
  });
  test("every click shows something at once", () => {
    assert.match(read("src/app/org/[slug]/(workspace)/layout.tsx"), /<NavProgress \/>/);
    assert.match(read("src/components/company/NavFeedback.tsx"), /useLinkStatus/);
    assert.match(read("src/app/globals.css"), /@keyframes nav-progress/);
  });
});
