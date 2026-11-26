import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import type { CompanyMember } from "../src/lib/company/access";
import { settingsGroups } from "../src/lib/company/settings-nav";
import { isCompanySwitch, readCompanyDetails, readProfile, sessionAllowed, timeZones, zoneLabel } from "../src/lib/company/settings-rules";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const member = (roles: CompanyMember["roles"]) => ({ email: "x@acme.test", companyId: "c", companySlug: "acme", companyName: "Acme", roles, leadTeamId: null, teamId: null }) as unknown as CompanyMember;

describe("Settings (user, 26 Nov)", () => {
  test("the menu is HackerEarth's, without Team Management; Company and Billing are for admins", () => {
    const shape = (m: CompanyMember) => settingsGroups(m).map((g) => [g.label, g.links.map((l) => l.label)]);
    assert.deepEqual(shape(member(["admin"])), [
      ["Personal", ["Personal Information", "Email preference", "Security and sign in", "API details"]],
      ["Company", ["Company Information", "Diversity and Inclusion", "Terms of Use", "EEO compliance", "Integrations"]],
      ["Billing", ["Plan and usage"]],
    ]);
    assert.deepEqual(shape(member(["recruiter"])).map(([g]) => g), ["Personal"]);
  });

  test("personal details: a name is needed; phone, timezone and language are checked", () => {
    const ok = readProfile({ name: "  Asha   Rao ", jobTitle: "", phone: "+91 98765 43210", timeZone: "Asia/Kolkata", language: "en" });
    assert.deepEqual(ok, { ok: true, value: { name: "Asha Rao", jobTitle: null, phone: "+91 98765 43210", timeZone: "Asia/Kolkata", language: "en" } });
    assert.equal((readProfile({ name: "", timeZone: "UTC", language: "en" }) as { field: string }).field, "name");
    assert.equal((readProfile({ name: "A", phone: "call me", timeZone: "UTC", language: "en" }) as { field: string }).field, "phone");
    assert.equal((readProfile({ name: "A", timeZone: "Mars/Base", language: "en" }) as { field: string }).field, "timeZone");
    assert.equal((readProfile({ name: "A", timeZone: "UTC", language: "fr" }) as { field: string }).field, "language");
    assert.match(zoneLabel("Asia/Kolkata"), /^Asia\/Kolkata \(GMT\+05:30\)$/);
    assert.ok(timeZones().includes("Asia/Kolkata") && !timeZones().includes("Asia/Calcutta"), "today's name, not the old one");
    assert.ok(timeZones("Etc/GMT-3").includes("Etc/GMT-3"), "the saved zone is always in the list");
  });

  test("company details: a bare domain becomes https; nonsense is refused", () => {
    const ok = readCompanyDetails({ phone: "", website: "www.testcompany.com", address: " 1 Road \n\n Mumbai " });
    assert.deepEqual(ok, { ok: true, value: { phone: null, website: "https://www.testcompany.com/", address: "1 Road\nMumbai" } });
    assert.equal((readCompanyDetails({ website: "not a site" }) as { field: string }).field, "website");
  });

  test("only the two company switches can be saved; the column never comes from the form", () => {
    assert.ok(isCompanySwitch("hide_candidate_names") && isCompanySwitch("eeo_survey"));
    assert.ok(!isCompanySwitch("seat_count") && !isCompanySwitch("name"));
  });

  test("log out other sessions: older sessions are refused, the one that pressed it is kept", () => {
    const cutoff = { before: new Date(1_000_000), keepSid: "mine" };
    assert.equal(sessionAllowed(null, {}), true, "no cut-off, nothing changes");
    assert.equal(sessionAllowed(cutoff, { sid: "mine", authAt: 10 }), true);
    assert.equal(sessionAllowed(cutoff, { sid: "other", authAt: 999_999 }), false);
    assert.equal(sessionAllowed(cutoff, { sid: "other" }), false, "a session from before sign-in times were kept is signed out");
    assert.equal(sessionAllowed(cutoff, { sid: "new", authAt: 1_000_001 }), true, "signing in again afterwards works");
    const dal = read("src/lib/company/auth.ts");
    assert.match(dal, /sessionAllowed\(cutoff/);
    assert.match(dal, /if \(cutoff === undefined\) return null;/, "fails closed when the cut-off can't be read");
    assert.match(read("src/auth.ts"), /token\.authAt = Date\.now\(\);/);
  });

  test("admin sections send anyone else to their own details; Branding forwards into Settings", () => {
    for (const s of ["company", "diversity", "terms", "eeo", "integrations", "plan"]) {
      assert.match(read(`src/app/org/[slug]/(workspace)/settings/${s}/page.tsx`), /requireSettingsAdmin\(slug\)/, s);
    }
    assert.match(read("src/app/org/[slug]/(workspace)/branding/page.tsx"), /settings\/company/);
    assert.match(read("db/migrations/0098_company_settings.sql"), /create table if not exists course\.company_session_cutoffs \(/);
  });
});
