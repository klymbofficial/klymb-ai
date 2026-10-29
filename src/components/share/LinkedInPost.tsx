"use client";

import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import {
  disconnectLinkedIn, linkedInConnectHref, loadLinkedInAccount, markPendingPost, postToLinkedIn, setLinkedInAccount,
  shareOnLinkedIn, takePendingPost, type LinkedInAccount, type LinkedInShare, type PostFailure,
} from "@/lib/linkedin-share";
import { MAX_POST_TEXT } from "@/lib/linkedin/api";

type Lang = "en" | "hi";

const COPY = {
  en: {
    title: "Post to LinkedIn", as: (name: string) => `Posting as ${name}`, asYou: "Posting to your LinkedIn", disconnect: "Disconnect",
    text: "Your post", public: "Anyone on LinkedIn can see this post.", close: "Close",
    post: "Post", posting: "Posting…", retry: "Try again", other: "Share another way",
    posted: "Posted on LinkedIn.", view: "View your post", done: "Done",
    reconnect: "Your LinkedIn connection has expired. Connect again to post in one tap.", reconnectButton: "Connect LinkedIn",
    busy: "That's a lot of posts for one hour. Try again later, or share another way.",
    failed: "LinkedIn didn't take the post. Try again, or share another way.",
    connect: "Post in one tap: connect LinkedIn", notConnected: "LinkedIn wasn't connected. Try again, or share the usual way.",
  },
  hi: {
    title: "LinkedIn pe post karo", as: (name: string) => `${name} ke naam se post hoga`, asYou: "Tumhare LinkedIn pe post hoga", disconnect: "Disconnect karo",
    text: "Tumhara post", public: "LinkedIn pe sab yeh post dekh sakte hain.", close: "Band karo",
    post: "Post", posting: "Post ho raha hai…", retry: "Phir try karo", other: "Doosre tareeke se share karo",
    posted: "LinkedIn pe post ho gaya.", view: "Apna post dekho", done: "Done",
    reconnect: "LinkedIn connection expire ho gaya. Ek tap mein post karne ke liye phir se connect karo.", reconnectButton: "LinkedIn connect karo",
    busy: "Ek ghante mein bahut posts ho gaye. Thodi der baad try karo, ya doosre tareeke se share karo.",
    failed: "LinkedIn ne post nahi liya. Phir try karo, ya doosre tareeke se share karo.",
    connect: "Ek tap mein post: LinkedIn connect karo", notConnected: "LinkedIn connect nahi hua. Phir try karo, ya normal tareeke se share karo.",
  },
} satisfies Record<Lang, Record<string, unknown>>;

type Step = { at: "confirm" } | { at: "posting" } | { at: "posted"; url: string } | { at: "failed"; why: PostFailure };

const here = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;

/**
 * What a "Post on LinkedIn" button does. A learner who has connected LinkedIn
 * gets a confirm step showing the image and the text (which they can edit),
 * and one tap on Post publishes it. Everyone else gets the share sheet or the
 * prefilled post, as before, plus a link to connect.
 *
 * Returns `share` for the button's onClick, `connect` (the connect link, or
 * null) to place under the buttons, and `dialog` to render anywhere.
 */
export function useLinkedInPost({ text, image, alt, lang = "en", returnTo, onShared }: {
  text: string;
  /** useShareImage's getter: the ready File, or a promise of one. */
  image: () => File | Promise<File>;
  alt: string;
  lang?: Lang;
  /** Where LinkedIn's consent screen comes back to; this page as it is now, by default. */
  returnTo?: string;
  onShared: (how: LinkedInShare) => void;
}) {
  const t = COPY[lang];
  const ids = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const [account, setAccount] = useState<LinkedInAccount | null>(null);
  const [notConnected, setNotConnected] = useState(false);
  const [step, setStep] = useState<Step>({ at: "confirm" });
  const [draft, setDraft] = useState(text);
  const [shown, setShown] = useState<{ file: File; url: string } | null>(null);
  /** What closing the dialog reports; null when something else reports it. */
  const outcome = useRef<LinkedInShare | null>("cancelled");
  const previewUrl = useRef<string | null>(null);

  const open = () => {
    outcome.current = "cancelled";
    setDraft(text);
    setStep({ at: "confirm" });
    // The image may have changed since last time (a name typed on the badge).
    setShown(null);
    if (ref.current && !ref.current.open) ref.current.showModal();
    Promise.resolve(image()).then(
      (file) => {
        if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
        previewUrl.current = URL.createObjectURL(file);
        setShown({ file, url: previewUrl.current });
      },
      () => setStep({ at: "failed", why: "failed" }),
    );
  };

  // Back from LinkedIn's consent screen: carry on with the post that sent them there.
  const resume = useEffectEvent((a: LinkedInAccount) => {
    setAccount(a);
    if (!a.enabled || !takePendingPost(text)) return;
    if (a.connected) open();
    else setNotConnected(true);
  });
  useEffect(() => {
    let live = true;
    loadLinkedInAccount().then((a) => { if (live) resume(a); });
    return () => { live = false; };
  }, []);
  useEffect(() => () => { if (previewUrl.current) URL.revokeObjectURL(previewUrl.current); }, []);

  const close = (how: LinkedInShare | null) => {
    outcome.current = how;
    ref.current?.close();
  };
  const closed = () => {
    if (outcome.current) onShared(outcome.current);
    outcome.current = "cancelled";
  };

  const share = () => {
    if (account?.connected) return open();
    shareOnLinkedIn(text, image()).then(onShared);
  };

  const post = async () => {
    if (!shown) return;
    setStep({ at: "posting" });
    const res = await postToLinkedIn(draft.trim(), shown.file, alt);
    if (res.ok) {
      outcome.current = "posted";
      setStep({ at: "posted", url: res.url });
      return;
    }
    if (res.why === "reconnect") {
      const off = { enabled: true, connected: false, name: null };
      setLinkedInAccount(off);
      setAccount(off);
    }
    setStep({ at: "failed", why: res.why });
  };

  // From the tap itself, so a phone still opens its share sheet.
  const other = () => {
    const file = shown?.file ?? image();
    close(null);
    shareOnLinkedIn(draft.trim() || text, file).then(onShared);
  };

  const connectTo = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    markPendingPost(text);
    window.location.assign(linkedInConnectHref(returnTo ?? here()));
  };

  const disconnect = async () => {
    if (!(await disconnectLinkedIn())) return;
    const off = { enabled: true, connected: false, name: null };
    setLinkedInAccount(off);
    setAccount(off);
    close("cancelled");
  };

  const posting = step.at === "posting";
  const button = "inline-flex min-h-11 items-center justify-center rounded-full px-5 text-[15px] font-bold transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a66c2] disabled:cursor-not-allowed disabled:opacity-50";
  const primary = `${button} bg-[#0a66c2] text-white`;
  const secondary = `${button} border border-[#0a66c2] text-[#0a66c2]`;

  const connect = account?.enabled && !account.connected ? (
    <p className="m-0 mt-2 text-[13px]">
      {notConnected && <span role="status">{t.notConnected} </span>}
      <a href={linkedInConnectHref(returnTo ?? "/")} onClick={connectTo} className="font-bold underline underline-offset-2">{t.connect}</a>
    </p>
  ) : null;

  const dialog = (
    <dialog
      ref={ref}
      aria-labelledby={`${ids}-title`}
      onClose={closed}
      onCancel={(e) => { if (posting) e.preventDefault(); }}
      onClick={(e) => { if (e.target === ref.current && !posting) close(step.at === "posted" ? "posted" : "cancelled"); }}
      className="modal-pop m-auto max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl bg-white p-0 text-[#191919] shadow-2xl backdrop:bg-black/55"
    >
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={`${ids}-title`} className="m-0 text-lg font-extrabold">{t.title}</h2>
            {step.at !== "posted" && (
              <p className="m-0 text-[13px] text-[#5e5e5e]">
                {account?.name ? t.as(account.name) : t.asYou} ·{" "}
                <button type="button" onClick={disconnect} disabled={posting} className="underline underline-offset-2 disabled:opacity-50">{t.disconnect}</button>
              </p>
            )}
          </div>
          <button type="button" aria-label={t.close} onClick={() => close(step.at === "posted" ? "posted" : "cancelled")} disabled={posting} className="-mt-1 -mr-1 size-10 flex-none rounded-full text-2xl leading-none text-[#5e5e5e] hover:bg-[#f0f0f0] disabled:opacity-50">×</button>
        </div>

        {step.at === "posted" ? (
          <>
            <p role="status" className="m-0 text-base font-bold">✓ {t.posted}</p>
            <div className="flex flex-wrap gap-2">
              <a href={step.url} target="_blank" rel="noopener noreferrer" className={primary}>{t.view} <span aria-hidden="true">&nbsp;↗</span></a>
              <button type="button" onClick={() => close("posted")} className={secondary}>{t.done}</button>
            </div>
          </>
        ) : (
          <>
            <label htmlFor={`${ids}-text`} className="sr-only">{t.text}</label>
            <textarea
              id={`${ids}-text`} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={MAX_POST_TEXT} rows={6} disabled={posting}
              className="w-full resize-y rounded-lg border border-[#c8c8c8] bg-white p-3 text-[15px] leading-snug text-[#191919] disabled:opacity-70"
            />
            {shown
              // eslint-disable-next-line @next/next/no-img-element -- a blob URL of the exact file that will be posted
              ? <img src={shown.url} alt={alt} className="mx-auto max-h-[38dvh] w-auto max-w-full rounded-lg border border-[#e0e0e0] object-contain" />
              : <div aria-hidden="true" className="mx-auto aspect-[4/5] max-h-[38dvh] w-full animate-pulse rounded-lg bg-[#efefef]" />}
            <p className="m-0 text-xs text-[#5e5e5e]">{t.public}</p>
            {step.at === "failed" && <p role="alert" className="m-0 text-sm font-semibold text-[#b3261e]">{t[step.why]}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              {step.at === "failed" && <button type="button" onClick={other} className={secondary}>{t.other}</button>}
              {step.at === "failed" && step.why === "reconnect"
                ? <a href={linkedInConnectHref(returnTo ?? "/")} onClick={connectTo} className={primary}>{t.reconnectButton}</a>
                : <button type="button" onClick={post} disabled={!shown || posting || !draft.trim()} className={primary}>{posting ? t.posting : step.at === "failed" ? t.retry : t.post}</button>}
            </div>
          </>
        )}
      </div>
    </dialog>
  );

  return { share, connect, dialog };
}
