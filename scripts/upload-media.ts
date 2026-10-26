/**
 * Uploads lesson media to Cloudflare R2.
 *
 *   npm run media:upload                       # everything under media/
 *   npm run media:upload system-design/day-2   # just the keys that start with this
 *
 * Source of truth is the local `media/` directory, which is gitignored: the
 * files are large binaries and git keeps every version of them forever (see
 * src/lib/media.ts). Put a new day's cuts in media/system-design/, run this,
 * and the deployed app picks them up — no commit, no redeploy.
 *
 * Videos go up private; posters go up with a public-read cache header, since
 * they are served straight off the bucket's public domain. Both are signed
 * with SigV4 the same way reads are, so this needs no AWS SDK either.
 */
import { createHash, createHmac } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { r2Config, type R2Config } from "../src/lib/media-sign";

loadEnvConfig(process.cwd());

const DIR = path.join(process.cwd(), "media");
const TYPES: Record<string, string> = { ".mp4": "video/mp4", ".jpg": "image/jpeg" };

/** Every file under media/, as bucket keys (posix separators, relative to media/). */
function keys(dir = DIR, prefix = ""): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    const key = prefix ? `${prefix}/${name}` : name;
    if (statSync(full).isDirectory()) return keys(full, key);
    return TYPES[path.extname(name)] ? [key] : [];
  });
}

function hmac(key: Buffer | string, data: string) {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

/** A signed PUT, with the payload hash in the signature as S3 requires for writes. */
function signedPut(cfg: R2Config, key: string, body: Buffer, contentType: string, cacheControl?: string) {
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${cfg.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
  const amzDate = `${new Date().toISOString().slice(0, 19).replace(/[-:]/g, "")}Z`;
  const date = amzDate.slice(0, 8);
  const scope = `${date}/auto/s3/aws4_request`;
  const payloadHash = createHash("sha256").update(body).digest("hex");

  const headers: [string, string][] = [
    ["host", host],
    ...(cacheControl ? ([["cache-control", cacheControl]] as [string, string][]) : []),
    ["content-type", contentType],
    ["x-amz-content-sha256", payloadHash],
    ["x-amz-date", amzDate],
  ];
  const signed = headers.map(([k]) => k).join(";");
  const canonicalHeaders = headers.map(([k, v]) => `${k}:${v}\n`).join("");

  const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signed, payloadHash].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, createHash("sha256").update(canonicalRequest).digest("hex")].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${cfg.secretAccessKey}`, date), "auto"), "s3"), "aws4_request");
  const signature = hmac(signingKey, stringToSign).toString("hex");

  return {
    url: `https://${host}${canonicalUri}`,
    headers: {
      ...Object.fromEntries(headers.filter(([k]) => k !== "host")),
      Authorization: `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signed}, Signature=${signature}`,
    },
  };
}

async function main() {
  const cfg = r2Config();
  if (!cfg) {
    console.error("R2 is not configured. Set R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in .env.local.");
    process.exit(1);
  }
  const only = process.argv.slice(2);
  const all = keys().filter((k) => !only.length || only.some((p) => k.startsWith(p)));
  if (!all.length) {
    console.error(only.length ? `Nothing under media/ matches ${only.join(", ")}` : "Nothing to upload: media/ is empty.");
    process.exit(1);
  }

  for (const key of all) {
    const body = readFileSync(path.join(DIR, key));
    const type = TYPES[path.extname(key)];
    // Posters are public and immutable; a new cut gets a new name.
    const isPoster = key.endsWith(".jpg");
    const { url, headers } = signedPut(cfg, key, body, type, isPoster ? "public, max-age=31536000, immutable" : undefined);
    const res = await fetch(url, { method: "PUT", body, headers });
    if (!res.ok) {
      console.error(`✗ ${key}: ${res.status} ${await res.text()}`);
      process.exit(1);
    }
    console.log(`✓ ${key} (${(body.length / 1e6).toFixed(1)} MB)`);
  }
  console.log(`\n${all.length} file(s) uploaded.`);
}

void main();
