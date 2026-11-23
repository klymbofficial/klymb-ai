import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { Session } from "next-auth";
import { adminEmailFrom, companyEmailFrom, verifiedEmailFrom } from "../src/auth";
import { DEV_COMPANY, DEV_COMPANY_TWO, DEV_TEAM, DEV_USERS, devLandingPath, devLoginEnabled, devUserByEmail } from "../src/lib/dev-login";

const session = (user: Record<string, unknown> | null): Session =>
  ({ user, expires: "2099-01-01" }) as unknown as Session;

/** Runs `fn` with these env vars set, then puts them back. */
function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) saved[k] = process.env[k];
  try {
    for (const [k, v] of Object.entries(vars)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

const ON_DEV = { AUTH_DEV_LOGIN: "true", NODE_ENV: "development", VERCEL_ENV: undefined };

test("dev sign-in is off unless AUTH_DEV_LOGIN is exactly true", () => {
  assert.equal(devLoginEnabled({ NODE_ENV: "development" }), false);
  assert.equal(devLoginEnabled({ AUTH_DEV_LOGIN: "1", NODE_ENV: "development" }), false);
  assert.equal(devLoginEnabled({ AUTH_DEV_LOGIN: "TRUE", NODE_ENV: "development" }), false);
});

test("dev sign-in runs on next dev and on a Vercel preview", () => {
  assert.equal(devLoginEnabled({ AUTH_DEV_LOGIN: "true", NODE_ENV: "development" }), true);
  assert.equal(devLoginEnabled({ AUTH_DEV_LOGIN: "true", NODE_ENV: "production", VERCEL_ENV: "preview" }), true);
});

test("dev sign-in never runs on Vercel production, whatever else is set", () => {
  assert.equal(devLoginEnabled({ AUTH_DEV_LOGIN: "true", NODE_ENV: "production", VERCEL_ENV: "production" }), false);
  assert.equal(devLoginEnabled({ AUTH_DEV_LOGIN: "true", NODE_ENV: "development", VERCEL_ENV: "production" }), false);
});

test("dev sign-in does not run on a bare production build", () => {
  assert.equal(devLoginEnabled({ AUTH_DEV_LOGIN: "true", NODE_ENV: "production" }), false);
});

test("every dev person is on the reserved .test domain", () => {
  for (const u of DEV_USERS) assert.ok(u.email.endsWith("@klymb.test"), u.email);
});

test("only listed dev people are recognised", () => {
  assert.ok(devUserByEmail("dev-admin@klymb.test"));
  assert.ok(devUserByEmail(" Dev-Admin@Klymb.test "));
  assert.equal(devUserByEmail("someone@gmail.com"), null);
  assert.equal(devUserByEmail(undefined), null);
});

test("a dev session counts as verified, admin and company while enabled", () => {
  withEnv(ON_DEV, () => {
    const s = session({ email: "dev-admin@klymb.test", emailIsVerified: true, signInMethod: "dev" });
    assert.equal(verifiedEmailFrom(s), "dev-admin@klymb.test");
    assert.equal(adminEmailFrom(s), "dev-admin@klymb.test");
    assert.equal(companyEmailFrom(s), "dev-admin@klymb.test");
  });
});

test("a dev session is nothing once the dev sign-in is off", () => {
  withEnv({ AUTH_DEV_LOGIN: undefined, NODE_ENV: "production", VERCEL_ENV: "production" }, () => {
    const s = session({ email: "dev-admin@klymb.test", emailIsVerified: true, signInMethod: "dev" });
    assert.equal(verifiedEmailFrom(s), null);
    assert.equal(adminEmailFrom(s), null);
    assert.equal(companyEmailFrom(s), null);
  });
});

test("a dev session for an address outside the list is nothing, even while enabled", () => {
  withEnv(ON_DEV, () => {
    const s = session({ email: "klymbofficial@gmail.com", emailIsVerified: true, signInMethod: "dev" });
    assert.equal(verifiedEmailFrom(s), null);
    assert.equal(adminEmailFrom(s), null);
  });
});

test("there are two dev companies, each with its own admin, and one person in both", () => {
  const company = DEV_USERS.filter((u) => u.role === "company");
  const slugs = (u: (typeof company)[number]) => (u.memberships ?? []).map((m) => m.company.slug);
  assert.notEqual(DEV_COMPANY.slug, DEV_COMPANY_TWO.slug);
  const admins = company.filter((u) => u.memberships?.length === 1 && u.memberships[0].roles.includes("admin"));
  assert.deepEqual(admins.map((u) => slugs(u)[0]).sort(), [DEV_COMPANY.slug, DEV_COMPANY_TWO.slug].sort());
  for (const u of admins) assert.equal(devLandingPath(u), `/org/${slugs(u)[0]}`, u.email);
  const both = company.find((u) => (u.memberships?.length ?? 0) > 1);
  assert.ok(both, "someone belongs to both companies");
  assert.deepEqual(slugs(both).sort(), [DEV_COMPANY.slug, DEV_COMPANY_TWO.slug].sort());
  assert.equal(both.ownCourse, true, "and keeps a course of their own");
  assert.equal(devLandingPath(both), "/org");
});

test("there is a plain test employee at Dev Company, who is not an admin of anything", () => {
  const employee = DEV_USERS.find((u) => u.email === "dev-employee@klymb.test");
  assert.ok(employee, "dev-employee@klymb.test exists");
  assert.equal(employee.role, "company");
  assert.deepEqual(employee.memberships, [{ company: DEV_COMPANY, roles: ["employee"], team: DEV_TEAM }]);
  assert.notEqual(employee.ownCourse, true, "no course of their own: HR assigns one in the workspace");
  assert.equal(devLandingPath(employee), `/org/${DEV_COMPANY.slug}`);
});

test("a dev team lead leads the employee's team at Dev Company, and holds no admin role", () => {
  const lead = DEV_USERS.find((u) => u.email === "dev-lead@klymb.test");
  assert.ok(lead?.memberships);
  assert.deepEqual(lead.memberships, [{ company: DEV_COMPANY, roles: ["employee"], team: DEV_TEAM, leads: true }]);
  const employee = DEV_USERS.find((u) => u.email === "dev-employee@klymb.test");
  assert.equal(employee?.memberships?.[0].team, DEV_TEAM, "on the team the lead leads");
  assert.equal(devLandingPath(lead), `/org/${DEV_COMPANY.slug}`);
});
