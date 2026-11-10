"use client";

import { useState } from "react";
import { trackOffer } from "@/lib/sd-offer-track";
import { externalBrowserUrl } from "@/lib/sd-offer";

/** Leaves the app's webview for a real browser, where Google sign-in works. False when this phone has no link for that. */
export function openInBrowser(campaign: string | null) {
  trackOffer("open_browser", { inApp: true, campaign });
  const url = externalBrowserUrl(window.location.href, navigator.userAgent);
  if (url) window.location.href = url;
  return !!url;
}

/**
 * Shown as soon as the offer opens inside Instagram or another app: Google
 * won't sign anyone in there, so they are sent to a real browser before they
 * fill in the form, not after.
 */
export function OpenInBrowser({ campaign }: { campaign: string | null }) {
  const [tried, setTried] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyLink = () => { void navigator.clipboard?.writeText(window.location.href).then(() => setCopied(true)); };

  return (
    <aside aria-label="Open in your browser" className="flex flex-col gap-2.5 rounded-2xl border border-[rgba(231,201,122,.45)] bg-[rgba(231,201,122,.12)] p-4 lg:col-span-2">
      <p className="m-0 text-[15px] leading-[1.4] text-pretty text-[#fbf6ee]"><b>Open this page in Chrome or Safari to buy.</b> Sign-in and payment don&apos;t work inside this app.</p>
      <button type="button" onClick={() => { openInBrowser(campaign); setTried(true); }} className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-0 bg-[#e7c97a] px-4 text-base font-extrabold text-[#2a1d05] transition-transform duration-150 active:scale-[.98]">Open in browser</button>
      {tried && (
        <p role="status" className="m-0 text-[13px] leading-[1.4] text-[#d9cfc2]">
          Didn&apos;t open? Tap the ⋯ menu at the top and choose Open in browser, or{" "}
          <button type="button" onClick={copyLink} className="cursor-pointer border-0 bg-transparent p-0 font-bold text-[#f3d48a] underline underline-offset-2">{copied ? "link copied" : "copy the link"}</button>.
        </p>
      )}
    </aside>
  );
}
