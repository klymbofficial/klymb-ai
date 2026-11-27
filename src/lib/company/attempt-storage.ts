import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AwsClient } from "aws4fetch";
import { ATTEMPT_FILE_TYPES, parseAttemptFileKey } from "@/lib/company/attempt-files";
import { brandStorageMode } from "@/lib/company/brand-storage-mode";

/**
 * Candidates' attached files. Private: never served from a public address,
 * only through routes that check who is asking. Kept where company brand
 * files are (brand-storage.ts): in R2 under attempt-files/ on Vercel, or in
 * .data/ on a developer's machine, so trying it locally never writes to the
 * real bucket. Writing needs R2_WRITE_ACCESS_KEY_ID and
 * R2_WRITE_SECRET_ACCESS_KEY.
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

/** Only well-formed attempt file keys are ever read or written, so a key can't reach a video, a logo or a path outside .data/. */
function checked(key: string) {
  const parsed = parseAttemptFileKey(key);
  if (!parsed) throw new Error("not an attempt file key");
  return parsed;
}

/** Saves a file. False when storage isn't available here. */
export async function putAttemptFile(key: string, bytes: Uint8Array): Promise<boolean> {
  const { kind } = checked(key);
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
    headers: { "content-type": ATTEMPT_FILE_TYPES[kind], "cache-control": "private, no-store" },
  });
  if (!res.ok) console.error("attempt file upload failed:", res.status);
  return res.ok;
}

/** Reads a file, or null when it isn't there or storage isn't available. (Reviewers' downloads, H09.) */
export async function getAttemptFile(key: string): Promise<{ bytes: Uint8Array; type: string } | null> {
  const { kind } = checked(key);
  const type = ATTEMPT_FILE_TYPES[kind];
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
