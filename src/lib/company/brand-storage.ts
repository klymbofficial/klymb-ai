import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AwsClient } from "aws4fetch";
import { brandStorageMode } from "@/lib/company/brand-storage-mode";
import { LOGO_TYPES, parseLogoKey } from "@/lib/company/branding";

/**
 * Company brand files (logos). In R2, in the same bucket as the lesson videos
 * under company-brand/, when brandStorageMode() says so; otherwise, on a
 * developer's machine, in .data/ beside the app, so trying it locally never
 * writes to the real bucket. Files are named by their own hash, so a key
 * always means the same bytes and can be cached for good.
 *
 * Writing needs R2_WRITE_ACCESS_KEY_ID and R2_WRITE_SECRET_ACCESS_KEY: the
 * app's usual R2 keys only read.
 */

const BUCKET = process.env.R2_BUCKET || "klymb-videos";
const LOCAL_ROOT = path.join(process.cwd(), ".data");

function r2(write: boolean): AwsClient | null {
  const id = write ? process.env.R2_WRITE_ACCESS_KEY_ID : process.env.R2_ACCESS_KEY_ID || process.env.R2_WRITE_ACCESS_KEY_ID;
  const secret = write ? process.env.R2_WRITE_SECRET_ACCESS_KEY : process.env.R2_SECRET_ACCESS_KEY || process.env.R2_WRITE_SECRET_ACCESS_KEY;
  if (!id || !secret || !process.env.R2_ACCOUNT_ID) return null;
  return new AwsClient({ accessKeyId: id, secretAccessKey: secret, service: "s3", region: "auto" });
}

const objectUrl = (key: string) => `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/${key}`;

/** Only well-formed brand keys are ever read or written, so a key can't reach a lesson video or a path outside .data/. */
function checked(key: string) {
  const parsed = parseLogoKey(key);
  if (!parsed) throw new Error("not a brand file key");
  return parsed;
}

/** Saves a brand file. Returns false when storage isn't available here. */
export async function putBrandFile(key: string, bytes: Uint8Array): Promise<boolean> {
  const { ext } = checked(key);
  if (brandStorageMode() === "local") {
    const file = path.join(LOCAL_ROOT, key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
    return true;
  }
  const client = r2(true);
  if (!client) return false;
  const res = await client.fetch(objectUrl(key), {
    method: "PUT",
    body: bytes as BodyInit,
    headers: { "content-type": LOGO_TYPES[ext], "cache-control": "public, max-age=31536000, immutable" },
  });
  if (!res.ok) console.error("brand file upload failed:", res.status);
  return res.ok;
}

/** Reads a brand file, or null when it isn't there or storage isn't available. */
export async function getBrandFile(key: string): Promise<{ bytes: Uint8Array; type: string } | null> {
  const { ext } = checked(key);
  const type = LOGO_TYPES[ext];
  if (brandStorageMode() === "local") {
    try {
      return { bytes: new Uint8Array(await readFile(path.join(LOCAL_ROOT, key))), type };
    } catch {
      return null;
    }
  }
  const client = r2(false);
  if (!client) return null;
  const res = await client.fetch(objectUrl(key));
  if (!res.ok) return null;
  return { bytes: new Uint8Array(await res.arrayBuffer()), type };
}
