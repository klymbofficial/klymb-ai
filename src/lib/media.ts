/**
 * Where lesson media lives.
 *
 * Videos are not in this repo. Git cannot delta-compress mp4, so every
 * re-encode of a lesson left a whole new multi-megabyte blob in history
 * forever; a 21-day course of portrait and wide cuts is a third of a
 * gigabyte that every clone pays for. They live in Cloudflare R2 instead.
 *
 * Two kinds of URL, because the two kinds of file need different things:
 *
 *   videoUrl()   The lesson itself, through this app at /api/media. That
 *                route authorises the request and redirects to a signed,
 *                expiring R2 URL, so the file is never addressable without
 *                passing the check. Lessons are free today, which is why
 *                the check is only sign-in — see the route.
 *   posterUrl()  Thumbnails, straight off the bucket's public domain. A
 *                poster is not the product, and sending it through a
 *                redirect would cost a round trip on every card.
 *
 * Both are pure string builders so the client components that hold day data
 * (DayLesson, the course app's Player) can call them. Signing is server-only
 * and lives in media-sign.ts.
 */

/** The bucket's public domain, for files that need no authorisation. */
const PUBLIC_BASE = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/+$/, "") ?? "";

/** The route that decides whether a request may have a file, and redirects to a signed URL. */
function routeUrl(key: string) {
  return `/api/media/${key.replace(/^\/+/, "")}`;
}

/** A lesson video, via the route that gates it. Key is the path inside the bucket. */
export const videoUrl = routeUrl;

/**
 * A poster, straight off the public bucket domain. With no bucket configured
 * it falls back to the route, which serves media/ from disk in development —
 * so a clone with the files on hand needs no R2 credentials to see a lesson.
 */
export function posterUrl(key: string) {
  return PUBLIC_BASE ? `${PUBLIC_BASE}/${key.replace(/^\/+/, "")}` : routeUrl(key);
}

/** Keys we will serve. Anything else is a 404, so the route is not an open proxy for the bucket. */
export const MEDIA_KEY = /^[a-z0-9][a-z0-9/-]*\.(mp4|jpg)$/;
