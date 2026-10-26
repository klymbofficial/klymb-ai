import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { MAX_EXPIRES, presignGet, signedQueryUrl, type R2Config } from "../src/lib/media-sign";
import { MEDIA_KEY, videoUrl } from "../src/lib/media";

const cfg: R2Config = {
  accountId: "acct123",
  bucket: "klymb-media",
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
};
const at = new Date("2026-10-24T12:00:00Z");

test("a signed URL carries everything R2 needs to authorise the read", () => {
  const url = new URL(presignGet(cfg, "system-design/day-2.mp4", 3600, at));
  assert.equal(url.host, "acct123.r2.cloudflarestorage.com");
  assert.equal(url.pathname, "/klymb-media/system-design/day-2.mp4");
  assert.equal(url.searchParams.get("X-Amz-Algorithm"), "AWS4-HMAC-SHA256");
  assert.equal(url.searchParams.get("X-Amz-Credential"), `${cfg.accessKeyId}/20261024/auto/s3/aws4_request`);
  assert.equal(url.searchParams.get("X-Amz-Date"), "20261024T120000Z");
  assert.equal(url.searchParams.get("X-Amz-Expires"), "3600");
  assert.equal(url.searchParams.get("X-Amz-SignedHeaders"), "host");
  assert.match(url.searchParams.get("X-Amz-Signature") ?? "", /^[0-9a-f]{64}$/);
});

test("the signature is stable for the same inputs and changes with any of them", () => {
  const sig = (key: string, expires = 3600, when = at) =>
    new URL(presignGet(cfg, key, expires, when)).searchParams.get("X-Amz-Signature");

  assert.equal(sig("a/b.mp4"), sig("a/b.mp4"));
  assert.notEqual(sig("a/b.mp4"), sig("a/c.mp4"));
  assert.notEqual(sig("a/b.mp4"), sig("a/b.mp4", 600));
  assert.notEqual(sig("a/b.mp4"), sig("a/b.mp4", 3600, new Date("2026-10-25T12:00:00Z")));
  assert.notEqual(sig("a/b.mp4"), new URL(presignGet({ ...cfg, secretAccessKey: "other" }, "a/b.mp4", 3600, at)).searchParams.get("X-Amz-Signature"));
});

test("expiry is clamped, so no URL outlives a sitting", () => {
  const expires = (n: number) => new URL(presignGet(cfg, "a.mp4", n, at)).searchParams.get("X-Amz-Expires");
  assert.equal(expires(MAX_EXPIRES + 86400), String(MAX_EXPIRES));
  assert.equal(expires(0), "1");
  assert.equal(expires(-5), "1");
  assert.equal(expires(900), "900");
});

/**
 * The real check on the signing code: AWS publishes a worked presigned-GET
 * example with its expected signature, and the primitive must reproduce it
 * exactly. A typo in the canonical request or the key chain would satisfy
 * every assertion above and still be rejected by R2.
 */
test("the primitive reproduces AWS's published SigV4 example", () => {
  const url = signedQueryUrl({
    host: "examplebucket.s3.amazonaws.com",
    path: "/test.txt",
    region: "us-east-1",
    service: "s3",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    date: "20130524T000000Z",
    expires: 86400,
  });
  assert.equal(
    new URL(url).searchParams.get("X-Amz-Signature"),
    "aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404",
  );
});

test("only media-shaped keys are served, so the route is not a proxy for the bucket", () => {
  assert.ok(MEDIA_KEY.test("system-design/day-0.mp4"));
  assert.ok(MEDIA_KEY.test("system-design/day-0-wide.mp4"));
  assert.ok(MEDIA_KEY.test("system-design/day-0-poster.jpg"));
  assert.equal(MEDIA_KEY.test("system-design/day-0.mp4?x=1"), false);
  assert.equal(MEDIA_KEY.test("../../etc/passwd"), false);
  assert.equal(MEDIA_KEY.test("secrets.env"), false);
  assert.equal(MEDIA_KEY.test("/system-design/day-0.mp4"), false);
  assert.equal(MEDIA_KEY.test("System-Design/Day-0.mp4"), false);
});

test("a lesson video is addressed through the route that authorises it, never the bucket", () => {
  assert.equal(videoUrl("system-design/day-0.mp4"), "/api/media/system-design/day-0.mp4");
  assert.equal(videoUrl("/system-design/day-0.mp4"), "/api/media/system-design/day-0.mp4");
});

/**
 * The reason all of the above exists. Git stores an mp4 whole and cannot
 * delta-compress it, so every re-encode of a lesson is a permanent new
 * multi-megabyte blob — a 21-day course of portrait and wide cuts is a third
 * of a gigabyte that every clone pays for, forever. Media belongs in R2 and
 * the local media/ directory is gitignored; this fails the build if one is
 * ever committed again.
 */
test("no lesson media is tracked in the repo", () => {
  const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: process.cwd() })
    .toString()
    .split("\0")
    .filter(Boolean);
  const media = tracked.filter((f) => /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(f));
  assert.deepEqual(media, [], `Video files are committed: ${media.join(", ")}. Put them in media/ and run npm run media:upload.`);
});
