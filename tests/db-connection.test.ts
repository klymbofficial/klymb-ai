import { strict as assert } from "node:assert";
import { test } from "node:test";
import { connectionOptions } from "../src/lib/db/connection";

const NEON = "postgresql://user:pw@ep-square-fog-amp0xncz-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

test("a hosted database is always certificate-verified", () => {
  const { ssl } = connectionOptions(NEON);
  assert.deepEqual(ssl, { rejectUnauthorized: true });
});

test("sslmode is dropped, because node-postgres and libpq read it differently", () => {
  // Left in place it warns on every connection; we state the intent in `ssl`
  // instead, so a URL copied from the Neon dashboard works unedited.
  const { connectionString } = connectionOptions(NEON);
  assert.doesNotMatch(connectionString, /sslmode/);
});

test("nothing else about the connection string is disturbed", () => {
  const { connectionString } = connectionOptions(NEON);
  const url = new URL(connectionString);
  assert.equal(url.username, "user");
  assert.equal(url.hostname, "ep-square-fog-amp0xncz-pooler.c-5.us-east-1.aws.neon.tech");
  assert.equal(url.pathname, "/neondb");
  assert.equal(url.searchParams.get("channel_binding"), "require");
});

test("a local database needs no TLS", () => {
  for (const host of ["localhost", "127.0.0.1"]) {
    const { ssl, connectionString } = connectionOptions(`postgres://me@${host}:5432/klymb`);
    assert.equal(ssl, undefined, `${host} should not require TLS`);
    assert.match(connectionString, new RegExp(host.replace(/\./g, "\\.")));
  }
});

test("a host that merely mentions localhost is still treated as remote", () => {
  // Matching on the host, not anywhere in the string: a database named
  // "localhost" or a password containing it must not disable verification.
  const { ssl } = connectionOptions("postgresql://user:localhost@db.example.com/app");
  assert.deepEqual(ssl, { rejectUnauthorized: true });
});

test("an unparseable string is passed through rather than silently altered", () => {
  const weird = "not a url at all";
  const { connectionString, ssl } = connectionOptions(weird);
  assert.equal(connectionString, weird);
  assert.deepEqual(ssl, { rejectUnauthorized: true });
});
