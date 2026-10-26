import { createHash, createHmac } from "node:crypto";

/**
 * Presigned GET URLs for Cloudflare R2.
 *
 * R2 speaks S3, so this is AWS Signature Version 4 query signing: the whole
 * authorisation travels in the query string, which is what lets a bare
 * <video src> fetch a private object. Hand-rolled because the AWS SDK is
 * megabytes of dependency for this one function, and because range requests
 * (the player's scrubber and its ±10s buttons) need nothing more than a
 * signed URL the browser can re-fetch.
 *
 * The signature covers the method, the path, the query and the Host header.
 * It does not cover the body or the Range header, so one URL serves every
 * seek within its lifetime.
 *
 * Pure, apart from reading the credentials, so it is unit-tested — the same
 * split as day-lock.ts and access.ts. `signedQueryUrl` is the primitive and is
 * checked against AWS's own published example; `presignGet` is R2's host and
 * path-style bucket convention on top of it. Nothing here belongs in a client
 * component: the only callers are the /api/media route and
 * scripts/upload-media.ts. The secret never reaches the browser regardless,
 * since Next only inlines NEXT_PUBLIC_ variables.
 */

const ALGORITHM = "AWS4-HMAC-SHA256";

/** Longest a signature may live. A lesson is minutes long; an hour covers a sitting without leaving a durable link. */
export const MAX_EXPIRES = 3600;

export interface R2Config {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/** The R2 credentials, or null when they are not configured. */
export function r2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucket = process.env.R2_BUCKET;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) return null;
  return { accountId, bucket, accessKeyId, secretAccessKey };
}

/** RFC 3986. encodeURIComponent leaves !'()* alone and S3 wants them escaped. */
function uriEncode(s: string) {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function hmac(key: Buffer | string, data: string) {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256(data: string) {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

/** An ISO instant as SigV4's basic-format timestamp, e.g. 20261024T120000Z. */
export function amzDate(now: Date) {
  return `${now.toISOString().slice(0, 19).replace(/[-:]/g, "")}Z`;
}

/**
 * A SigV4 query-signed GET URL. `path` is already the canonical URI: the
 * caller decides virtual-hosted or path-style addressing, and encodes it.
 */
export function signedQueryUrl(opts: {
  host: string;
  path: string;
  region: string;
  service: string;
  accessKeyId: string;
  secretAccessKey: string;
  date: string;
  expires: number;
}) {
  const { host, path, region, service, accessKeyId, secretAccessKey, date, expires } = opts;
  const day = date.slice(0, 8);
  const scope = `${day}/${region}/${service}/aws4_request`;

  // Sorted by key, as the canonical query string requires.
  const query: [string, string][] = [
    ["X-Amz-Algorithm", ALGORITHM],
    ["X-Amz-Credential", `${accessKeyId}/${scope}`],
    ["X-Amz-Date", date],
    ["X-Amz-Expires", String(expires)],
    ["X-Amz-SignedHeaders", "host"],
  ];
  const canonicalQuery = query.map(([k, v]) => `${uriEncode(k)}=${uriEncode(v)}`).join("&");

  const canonicalRequest = ["GET", path, canonicalQuery, `host:${host}`, "", "host", "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = [ALGORITHM, date, scope, sha256(canonicalRequest)].join("\n");

  // The signing key is a chain of HMACs: secret → date → region → service.
  const dateKey = hmac(`AWS4${secretAccessKey}`, day);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, service);
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = hmac(signingKey, stringToSign).toString("hex");

  return `https://${host}${path}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/**
 * A signed URL for one object in the bucket, good for `expires` seconds.
 *
 * `now` is injectable so this is testable; it is the only impure input.
 */
export function presignGet(cfg: R2Config, key: string, expires: number, now: Date = new Date()) {
  // R2 addresses path-style, and each key segment is encoded but the separators kept.
  const path = `/${cfg.bucket}/${key.replace(/^\/+/, "").split("/").map(uriEncode).join("/")}`;
  return signedQueryUrl({
    host: `${cfg.accountId}.r2.cloudflarestorage.com`,
    path,
    region: "auto",
    service: "s3",
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    date: amzDate(now),
    expires: Math.min(Math.max(Math.floor(expires), 1), MAX_EXPIRES),
  });
}
