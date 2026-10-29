import { strict as assert } from "node:assert";
import { afterEach, test } from "node:test";
import { linkedInComposeUrl, shareOnLinkedIn } from "../src/lib/linkedin-share";

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
