import { AwsClient } from "aws4fetch";

/**
 * Course videos live in the private R2 bucket `klymb-videos`. The browser never
 * gets a lasting address: each play is sent a signed link that stops working
 * after a few hours, so a copied link goes dead.
 */
const BUCKET = process.env.R2_BUCKET || "klymb-videos";

/**
 * Long enough to watch, pause and seek through a lesson (every seek asks again
 * with the same link), short enough that a shared link is useless by tomorrow.
 */
export const LINK_SECONDS = 3 * 60 * 60;

let client: AwsClient | null | undefined;

function r2(): AwsClient | null {
  if (client !== undefined) return client;
  const { R2_ACCESS_KEY_ID: id, R2_SECRET_ACCESS_KEY: secret } = process.env;
  client = id && secret && process.env.R2_ACCOUNT_ID
    ? new AwsClient({ accessKeyId: id, secretAccessKey: secret, service: "s3", region: "auto" })
    : null;
  return client;
}

/** A signed, expiring link to one object, or null when R2 isn't set up here. */
export async function signedLink(key: string, seconds = LINK_SECONDS): Promise<string | null> {
  const c = r2();
  if (!c) return null;
  const url = new URL(`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/${key}`);
  url.searchParams.set("X-Amz-Expires", String(seconds));
  const signed = await c.sign(new Request(url, { method: "GET" }), { aws: { signQuery: true } });
  return signed.url;
}
