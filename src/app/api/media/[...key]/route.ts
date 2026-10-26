import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { MEDIA_KEY } from "@/lib/media";
import { MAX_EXPIRES, presignGet, r2Config } from "@/lib/media-sign";

/**
 * Lesson videos, out of Cloudflare R2.
 *
 * The bucket is private, so nothing in it is addressable except through here:
 * this decides whether the request may have the file, then redirects to a URL
 * signed for the next hour. The browser follows the redirect and sends its own
 * Range requests straight to R2, so seeking costs us nothing after the first
 * hop.
 *
 * Right now the gate is open to everyone, and that is deliberate. Every
 * System Design lesson is free: tracks.ts prices all tracks at 0, the course
 * app has no payment gate, sign-in is offered only to save progress ("Save
 * progress with Google"), and /system-design/day-N are public pages. Putting
 * a sign-in check here would lock out the people the course is for.
 *
 * What the route buys while the gate is open is that it stays the only way in.
 * The files are not on the public domain and not in a CDN we do not control,
 * so when days 2-20 become paid, `allowed()` below is the single place that
 * has to learn about it and no already-public URL survives the change.
 */

const TYPES: Record<string, string> = { ".mp4": "video/mp4", ".jpg": "image/jpeg" };

/**
 * May this request have this file?
 *
 * Open, because the whole course is free — see the note above. When a day
 * costs money, this is where it is checked: take the key, read the learner
 * from currentEmail(), and ask lib/access.ts. Keep it here rather than in the
 * player, so the answer cannot be skipped by addressing the file directly.
 */
async function allowed() {
  return true;
}

export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  // Not an open proxy for the bucket: only keys shaped like the media we serve.
  if (!MEDIA_KEY.test(key) || key.includes("..")) return new NextResponse(null, { status: 404 });

  if (!(await allowed())) return new NextResponse(null, { status: 403 });

  const cfg = r2Config();
  if (cfg) {
    const res = NextResponse.redirect(presignGet(cfg, key, MAX_EXPIRES), 302);
    // The signature is short-lived and per-request; no shared cache may keep it.
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  }

  // No bucket configured. In development the files are already on disk in
  // media/, so serve them from there and a clone works without R2 at all.
  // In production an unconfigured bucket is a deployment fault, not a fallback.
  if (process.env.NODE_ENV === "production") {
    console.error("media: R2 is not configured; set R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY");
    return new NextResponse(null, { status: 503 });
  }
  return localFile(req, key);
}

/** The dev fallback: one file out of media/, with enough Range support for the player's scrubber. */
async function localFile(req: Request, key: string) {
  const file = path.join(process.cwd(), "media", key);
  const size = await stat(file).then((s) => s.size).catch(() => null);
  if (size === null) return new NextResponse(null, { status: 404 });

  const type = TYPES[path.extname(key)] ?? "application/octet-stream";
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (!range) {
    const body = createReadStream(file) as unknown as ReadableStream;
    return new NextResponse(body, { headers: { "Content-Type": type, "Content-Length": String(size), "Accept-Ranges": "bytes" } });
  }

  const start = range[1] ? Number(range[1]) : 0;
  const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
  if (start >= size || start > end) {
    return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }
  const body = createReadStream(file, { start, end }) as unknown as ReadableStream;
  return new NextResponse(body, {
    status: 206,
    headers: {
      "Content-Type": type,
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
    },
  });
}
