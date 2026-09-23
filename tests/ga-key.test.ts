import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseServiceAccount } from "../src/lib/ga-key";

const key = { type: "service_account", client_email: "ga@proj.iam.gserviceaccount.com", private_key: "-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n" };

test("parses a key pasted as plain one-line JSON", () => {
  assert.equal(parseServiceAccount(JSON.stringify(key))?.client_email, key.client_email);
});

test("parses a key whose \\n escapes the env loader turned into real newlines", () => {
  const mangled = JSON.stringify(key).replace(/\\n/g, "\n");
  const parsed = parseServiceAccount(mangled);
  assert.equal(parsed?.private_key, key.private_key);
});

test("parses a key pasted with its surrounding quotes kept (double-encoded)", () => {
  assert.equal(parseServiceAccount(JSON.stringify(JSON.stringify(key)))?.client_email, key.client_email);
});

test("rejects garbage and JSON that is not a service account", () => {
  assert.equal(parseServiceAccount("not json"), null);
  assert.equal(parseServiceAccount(JSON.stringify({ hello: "world" })), null);
});

test("parses a double-encoded key after the env loader expanded its newlines", () => {
  // What `KEY="<JSON.stringify(JSON.stringify(key))>"` in .env.local turns into.
  const inner = JSON.stringify(JSON.stringify(key)).slice(1, -1);
  const loaded = inner.replace(/\\n/g, "\n");
  assert.equal(parseServiceAccount(loaded)?.client_email, key.client_email);
});
