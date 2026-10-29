import { useEffect, useEffectEvent, useState } from "react";

/**
 * Getting a post into LinkedIn with its image and text, so the learner only taps Post.
 *
 * A learner who has connected LinkedIn posts through its API: they see the
 * image and text, tap Post, and it is on their feed (src/app/api/linkedin).
 * Everyone else, and anyone the API fails, gets the share below. LinkedIn's web
 * link can fill in a post's text but never its image, so on a phone both go
 * through the share sheet into the LinkedIn app; on a computer the text rides
 * in the link and the image goes on the clipboard, one paste away.
 */

/** LinkedIn's new-post box with the text already in it. */
export const linkedInComposeUrl = (text: string) => `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;

/**
 * How the post reached LinkedIn: published through the API ("posted"), through
 * the phone's share sheet ("app"), opened with the text and the image on the
 * clipboard ("pasted"), opened with the text alone because the browser won't
 * copy images ("text"), or not at all ("cancelled").
 */
export type LinkedInShare = "posted" | "app" | "pasted" | "text" | "cancelled";

/** Whether one-tap posting is on offer to this learner, and whether they've connected. */
export interface LinkedInAccount { enabled: boolean; connected: boolean; name: string | null }

const OFF: LinkedInAccount = { enabled: false, connected: false, name: null };
/** One status call per page, however many share buttons are on it. */
let account: Promise<LinkedInAccount> | null = null;

export function loadLinkedInAccount() {
  account ??= fetch("/api/linkedin", { cache: "no-store" })
    .then((res) => (res.ok ? (res.json() as Promise<LinkedInAccount>) : OFF))
    .catch(() => OFF);
  return account;
}

/** After connecting or disconnecting, so every button on the page agrees. */
export function setLinkedInAccount(next: LinkedInAccount) {
  account = Promise.resolve(next);
}

/** Why a one-tap post didn't go: the connection is gone, too many posts, or anything else. */
export type PostFailure = "reconnect" | "busy" | "failed";

/** Publishes through the API. Only ever called from the learner's tap on Post. */
export async function postToLinkedIn(text: string, image: File, alt: string): Promise<{ ok: true; url: string } | { ok: false; why: PostFailure }> {
  const body = new FormData();
  body.set("text", text);
  body.set("alt", alt);
  body.set("image", image);
  try {
    const res = await fetch("/api/linkedin/post", { method: "POST", body });
    const data = (await res.json().catch(() => ({}))) as { url?: unknown; reconnect?: unknown };
    if (res.ok && typeof data.url === "string") return { ok: true, url: data.url };
    return { ok: false, why: data.reconnect === true ? "reconnect" : res.status === 429 ? "busy" : "failed" };
  } catch {
    return { ok: false, why: "failed" };
  }
}

export const disconnectLinkedIn = () => fetch("/api/linkedin", { method: "DELETE" }).then((res) => res.ok, () => false);

/** Starts connecting; LinkedIn's consent screen sends the learner back to `returnTo`. */
export const linkedInConnectHref = (returnTo: string) => `/api/linkedin/connect?returnTo=${encodeURIComponent(returnTo)}`;

/**
 * Connecting is a round trip through LinkedIn. This remembers which post sent
 * the learner there, so the confirm step can open again when they're back.
 */
const PENDING = "klymb.linkedin.pending";
const PENDING_FOR = 10 * 60_000;

export function markPendingPost(key: string) {
  try { sessionStorage.setItem(PENDING, JSON.stringify({ key, at: Date.now() })); } catch { /* storage off: they tap Post again */ }
}

/** True once, for the post that started connecting, if they came back within ten minutes. */
export function takePendingPost(key: string) {
  try {
    const pending = JSON.parse(sessionStorage.getItem(PENDING) ?? "null") as { key?: string; at?: number } | null;
    if (pending?.key !== key) return false;
    sessionStorage.removeItem(PENDING);
    return Date.now() - (pending.at ?? 0) < PENDING_FOR;
  } catch {
    return false;
  }
}

/** The paste shortcut on this computer, for telling the learner how to add the image. */
export const pasteKey = () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘V" : "Ctrl+V");

/**
 * Hands the post to LinkedIn without the API. Call it straight from a tap: a
 * phone opens its share sheet only right after one, so pass a ready File when
 * there is one.
 */
export async function shareOnLinkedIn(text: string, image: File | Promise<File>): Promise<LinkedInShare> {
  if (matchMedia("(pointer: coarse)").matches && typeof navigator.share === "function") {
    const file = image instanceof File ? image : await image.catch(() => null);
    if (file && navigator.canShare?.({ files: [file], text })) {
      // In case the app drops the text beside the image, it's one paste away.
      navigator.clipboard?.writeText(text).catch(() => {});
      try {
        await navigator.share({ files: [file], text });
        return "app";
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return "cancelled";
      }
    }
  }
  let pasted = false;
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": Promise.resolve(image) })]);
    pasted = true;
  } catch { /* this browser can't copy images: the text still goes */ }
  window.open(linkedInComposeUrl(text), "_blank", "noopener,noreferrer");
  return pasted ? "pasted" : "text";
}

/**
 * The image to share, made ahead of the tap so the share sheet can open at once.
 * `key` names the image (its URL, or the artwork it's drawn from); a new key makes it again.
 * Returns how to get it: the ready File, or a promise of one if it isn't made yet.
 */
export function useShareImage(key: string, name: string, load: () => Promise<Blob>) {
  const [ready, setReady] = useState<{ key: string; file: File } | null>(null);
  const make = async () => new File([await load()], name, { type: "image/png" });
  const prepare = useEffectEvent(make);
  useEffect(() => {
    let live = true;
    // A moment's wait, so typing a name on the badge doesn't draw it on every key.
    const t = setTimeout(() => prepare().then((file) => { if (live) setReady({ key, file }); }, () => {}), 250);
    return () => { live = false; clearTimeout(t); };
  }, [key]);
  return (): File | Promise<File> => (ready?.key === key ? ready.file : make());
}

/** Fetches an image this site serves, for useShareImage. */
export async function fetchImage(src: string) {
  const res = await fetch(src);
  if (!res.ok) throw new Error("Image unavailable");
  return res.blob();
}
