import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { Session } from "next-auth";
import { adminEmailFrom, companyEmailFrom, verifiedEmailFrom } from "../src/auth";
import { DEV_USERS, devLoginEnabled, devUserByEmail } from "../src/lib/dev-login";

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
