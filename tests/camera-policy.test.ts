import assert from "node:assert/strict";
import { test } from "node:test";
import nextConfig from "../next.config";

/** The camera is allowed on candidate tests only (webcam proctoring); everywhere else it stays off. */
test("the camera policy: open on /assessment pages, closed elsewhere, one header each", async () => {
  const rules = (await nextConfig.headers!()) as { source: string; headers: { key: string; value: string }[] }[];
  const policy = (source: string) => rules.filter((r) => r.source === source).flatMap((r) => r.headers).filter((h) => h.key === "Permissions-Policy").map((h) => h.value);
  const global = policy("/:path*");
  const tests = policy("/assessment/:path*");
  assert.equal(global.length, 1);
  assert.match(global[0], /(^|, )camera=\(\)/);
  assert.equal(tests.length, 1);
  assert.match(tests[0], /(^|, )camera=\(self\)/);
  assert.equal(tests[0].replace("camera=(self)", "camera=()"), global[0], "nothing else differs");
  const order = rules.map((r) => r.source);
  assert.ok(order.indexOf("/assessment/:path*") > order.indexOf("/:path*"), "the test pages' rule comes last, so it wins");
});
