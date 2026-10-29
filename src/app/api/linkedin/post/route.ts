import { NextResponse } from "next/server";
import { auth, verifiedEmailFrom } from "@/auth";
import { LinkedInError, MAX_IMAGE_BYTES, cleanPostText, isPng, publishImagePost } from "@/lib/linkedin/api";
import { linkedInApp, sameOrigin } from "@/lib/linkedin/oauth";
import { deleteConnection, loadConnection } from "@/lib/linkedin/store";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Publishes a share image and its text to the learner's own LinkedIn feed.
 *
 * The learner has seen both and tapped Post: this is that tap, nothing runs it
 * on its own. A multipart body (`image`, a PNG; `text`; `alt`) because the
 * badge image is drawn in the browser with the learner's name on it.
 *
 * Answers 409 with `reconnect` when there is no usable connection, so the
 * page can offer to connect again or share the usual way.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req.url, req.headers.get("origin"), req.headers.get("sec-fetch-site"))) {
    return NextResponse.json({ error: "Not from this site." }, { status: 403 });
  }
  const app = linkedInApp();
  if (!app) return NextResponse.json({ error: "LinkedIn posting isn't switched on." }, { status: 503 });
  const email = verifiedEmailFrom(await auth());
  if (!email) return NextResponse.json({ error: "Sign in to post." }, { status: 401 });

  // A learner posts once a lesson; this only stops a loop from spamming their feed.
  const limit = await checkRateLimit("linkedin-post", { limit: 10, windowMinutes: 60, identity: email });
  if (!limit.allowed) return NextResponse.json({ error: "That's a lot of posts for one hour. Try again later." }, { status: 429 });

  if (Number(req.headers.get("content-length") ?? 0) > MAX_IMAGE_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "That image is too large." }, { status: 413 });
  }
  const form = await req.formData().catch(() => null);
  const text = cleanPostText(form?.get("text"));
  const image = form?.get("image");
  const alt = form?.get("alt");
  if (!text || !(image instanceof Blob) || image.size === 0 || image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "The post needs its image and some text." }, { status: 400 });
  }
  if (!isPng(new Uint8Array(await image.slice(0, 16).arrayBuffer()))) {
    return NextResponse.json({ error: "The image must be a PNG." }, { status: 400 });
  }

  const connection = await loadConnection(email, app.secret);
  if (!connection) return NextResponse.json({ error: "Connect LinkedIn first.", reconnect: true }, { status: 409 });

  try {
    const post = await publishImagePost({
      accessToken: connection.accessToken,
      author: connection.memberUrn,
      text,
      image: new Blob([await image.arrayBuffer()], { type: "image/png" }),
      altText: typeof alt === "string" ? alt.trim() : "",
      version: app.version,
    });
    return NextResponse.json({ ok: true, url: post.url });
  } catch (e) {
    console.error("linkedin post failed:", e instanceof Error ? e.message : String(e));
    if (e instanceof LinkedInError && e.reconnect) {
      // The token can't post any more; keeping it would only fail again.
      await deleteConnection(email);
      return NextResponse.json({ error: "Your LinkedIn connection has expired.", reconnect: true }, { status: 409 });
    }
    if (e instanceof LinkedInError && e.status === 429) return NextResponse.json({ error: "LinkedIn is busy. Try again in a bit." }, { status: 429 });
    return NextResponse.json({ error: "LinkedIn didn't take the post." }, { status: 502 });
  }
}
