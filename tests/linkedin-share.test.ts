import { strict as assert } from "node:assert";
import { afterEach, test } from "node:test";
import { linkedInComposeUrl, linkedInConnectHref, markPendingPost, postToLinkedIn, shareOnLinkedIn, takePendingPost } from "../src/lib/linkedin-share";

const text = "Day 1 done: how a URL loads 🚀\n\nCache → DNS → TCP & TLS\n\n#SystemDesign #Klymb";
const image = new File([new Uint8Array([137, 80, 78, 71])], "day-1.png", { type: "image/png" });

/** A browser, enough of one for the share: a phone (coarse pointer, share sheet) or a computer. */
function browser({ phone = false, canShareFiles = true, shareError = "", imageCopy = true } = {}) {
  const calls = { shared: [] as ShareData[], copiedText: [] as string[], copiedImages: [] as unknown[], opened: [] as string[] };
  const g = globalThis as Record<string, unknown>;
  g.matchMedia = (q: string) => ({ matches: phone && q === "(pointer: coarse)" });
  g.ClipboardItem = class { constructor(public items: Record<string, unknown>) {} };
  g.window = { open: (url: string) => { calls.opened.push(url); return null; } };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      userAgent: "test",
      ...(phone && {
        canShare: (d: ShareData) => canShareFiles || !d.files,
        share: async (d: ShareData) => { if (shareError) throw new DOMException("no", shareError); calls.shared.push(d); },
      }),
      clipboard: {
        writeText: async (t: string) => { calls.copiedText.push(t); },
        write: async (items: { items: Record<string, unknown> }[]) => {
          if (!imageCopy) throw new DOMException("no", "NotAllowedError");
          calls.copiedImages.push(await items[0].items["image/png"]);
        },
      },
    },
  });
  return calls;
}

const real = Object.getOwnPropertyDescriptor(globalThis, "navigator")!;
afterEach(() => Object.defineProperty(globalThis, "navigator", real));

test("the LinkedIn link carries the whole post text, line breaks, emoji and hashtags", () => {
  const url = new URL(linkedInComposeUrl(text));
  assert.equal(url.origin + url.pathname, "https://www.linkedin.com/feed/");
  assert.equal(url.searchParams.get("shareActive"), "true");
  assert.equal(url.searchParams.get("text"), text);
});

test("on a phone, image and text go to the LinkedIn app together through the share sheet", async () => {
  const calls = browser({ phone: true });
  assert.equal(await shareOnLinkedIn(text, image), "app");
  assert.equal(calls.shared.length, 1);
  assert.equal(calls.shared[0].text, text);
  assert.deepEqual(calls.shared[0].files, [image]);
  assert.deepEqual(calls.copiedText, [text], "the text is also copied, in case the app drops it");
  assert.deepEqual(calls.opened, [], "no LinkedIn tab on top of the share sheet");
});

test("closing the share sheet does nothing more", async () => {
  const calls = browser({ phone: true, shareError: "AbortError" });
  assert.equal(await shareOnLinkedIn(text, image), "cancelled");
  assert.deepEqual(calls.opened, []);
});

test("an image still being made is awaited before the share sheet opens", async () => {
  const calls = browser({ phone: true });
  assert.equal(await shareOnLinkedIn(text, Promise.resolve(image)), "app");
  assert.deepEqual(calls.shared[0].files, [image]);
});

test("on a computer, LinkedIn opens with the text and the image waits on the clipboard", async () => {
  const calls = browser();
  assert.equal(await shareOnLinkedIn(text, image), "pasted");
  assert.deepEqual(calls.copiedImages, [image]);
  assert.deepEqual(calls.opened, [linkedInComposeUrl(text)]);
});

test("a phone that can't share files, or a failed share, falls back to the computer way", async () => {
  let calls = browser({ phone: true, canShareFiles: false });
  assert.equal(await shareOnLinkedIn(text, image), "pasted");
  assert.deepEqual(calls.opened, [linkedInComposeUrl(text)]);

  calls = browser({ phone: true, shareError: "NotAllowedError" });
  assert.equal(await shareOnLinkedIn(text, image), "pasted");
  assert.deepEqual(calls.opened, [linkedInComposeUrl(text)]);
});

test("a browser that won't copy images still opens LinkedIn with the text", async () => {
  const calls = browser({ imageCopy: false });
  assert.equal(await shareOnLinkedIn(text, image), "text");
  assert.deepEqual(calls.opened, [linkedInComposeUrl(text)]);
});

// ── One tap, through LinkedIn's API ─────────────────────────

/** Answers the post endpoint with `status` and `body`, and keeps what it was sent. */
function postEndpoint(status: number, body: unknown) {
  const sent: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (async (url: RequestInfo | URL, init: RequestInit = {}) => {
    sent.push({ url: String(url), init });
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return sent;
}
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

test("Post sends the image, the text and its alt text to this site's post endpoint", async () => {
  const sent = postEndpoint(200, { ok: true, url: "https://www.linkedin.com/feed/update/urn:li:share:1/" });
  assert.deepEqual(await postToLinkedIn(text, image, "How a URL loads"), { ok: true, url: "https://www.linkedin.com/feed/update/urn:li:share:1/" });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, "/api/linkedin/post");
  assert.equal(sent[0].init.method, "POST");
  const form = sent[0].init.body as FormData;
  assert.equal(form.get("text"), text);
  assert.equal(form.get("alt"), "How a URL loads");
  const file = form.get("image") as File;
  assert.equal(file.name, "day-1.png");
  assert.equal(file.type, "image/png");
});

test("a failed one-tap post says whether to connect again, wait, or share another way", async () => {
  postEndpoint(409, { error: "Your LinkedIn connection has expired.", reconnect: true });
  assert.deepEqual(await postToLinkedIn(text, image, ""), { ok: false, why: "reconnect" });
  postEndpoint(429, { error: "busy" });
  assert.deepEqual(await postToLinkedIn(text, image, ""), { ok: false, why: "busy" });
  postEndpoint(502, { error: "LinkedIn didn't take the post." });
  assert.deepEqual(await postToLinkedIn(text, image, ""), { ok: false, why: "failed" });
  globalThis.fetch = (async () => { throw new TypeError("offline"); }) as typeof fetch;
  assert.deepEqual(await postToLinkedIn(text, image, ""), { ok: false, why: "failed" });
});

test("connecting comes back to the lesson, and reopens the post that started it, once", () => {
  assert.equal(linkedInConnectHref("/learn/system-design?lesson=d1"), "/api/linkedin/connect?returnTo=%2Flearn%2Fsystem-design%3Flesson%3Dd1");
  const store = new Map<string, string>();
  const g = globalThis as Record<string, unknown>;
  g.sessionStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) };
  try {
    markPendingPost(text);
    assert.equal(takePendingPost("another post"), false, "only the post that started connecting");
    assert.equal(takePendingPost(text), true);
    assert.equal(takePendingPost(text), false, "once");

    markPendingPost(text);
    const [[key, value]] = store;
    store.set(key, JSON.stringify({ ...JSON.parse(value), at: Date.now() - 11 * 60_000 }));
    assert.equal(takePendingPost(text), false, "not after ten minutes");
  } finally {
    delete g.sessionStorage;
  }
});
