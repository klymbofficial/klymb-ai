import { useEffect, useEffectEvent, useState } from "react";

/**
 * Getting a post into LinkedIn with its image and text, so the learner only taps Post.
 *
 * LinkedIn's web link can fill in a post's text but never its image. So on a phone
 * both go through the share sheet into the LinkedIn app; on a computer the text
 * rides in the link and the image goes on the clipboard, one paste away.
 */

/** LinkedIn's new-post box with the text already in it. */
export const linkedInComposeUrl = (text: string) => `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;

/**
 * How the post reached LinkedIn: through the phone's share sheet ("app"), opened
 * with the text and the image on the clipboard ("pasted"), opened with the text
 * alone because the browser won't copy images ("text"), or not at all ("cancelled").
 */
export type LinkedInShare = "app" | "pasted" | "text" | "cancelled";

/** The paste shortcut on this computer, for telling the learner how to add the image. */
export const pasteKey = () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘V" : "Ctrl+V");

/**
 * Hands the post to LinkedIn. Call it straight from the tap: a phone opens its
 * share sheet only right after one, so pass a ready File when there is one.
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
