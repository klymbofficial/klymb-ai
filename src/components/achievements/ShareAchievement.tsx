"use client";

import Image from "next/image";
import { useId, useState, type ReactNode } from "react";
import { achievementCaption, achievementPng, achievementSvg, type Achievement } from "@/lib/achievement";

export function ShareAchievement({ badge, course, courseUrl, initialName = "", imageSrc, variant = "default", posterIcon }: {
  badge: Achievement; course: string; courseUrl: string; initialName?: string; imageSrc?: string;
  /** "poster" is the course app's badge card: the artwork beside a download and share panel. */
  variant?: "default" | "poster"; posterIcon?: ReactNode;
}) {
  const id = useId();
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const svg = achievementSvg(badge, name, course);
  const caption = achievementCaption(badge, course, courseUrl);
  const button = "inline-flex min-h-11 items-center justify-center border border-current px-4 py-2 text-sm font-bold transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-wait disabled:opacity-60";

  async function download() {
    setBusy(true);
    setStatus("");
    try {
      let blob: Blob;
      if (imageSrc) {
        const response = await fetch(imageSrc);
        if (!response.ok) throw new Error("Badge image unavailable");
        blob = await response.blob();
      } else {
        blob = await achievementPng(svg);
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `klymb-${badge.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setStatus("Image downloaded. Attach it to your LinkedIn post and paste the caption below.");
    } catch {
      setStatus("The download did not finish. Please try again in your browser.");
    } finally {
      setBusy(false);
    }
  }

  if (variant === "poster") {
    const posterButton = "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-extrabold transition-opacity hover:opacity-85 disabled:cursor-wait disabled:opacity-60";
    return (
      <div className="grid min-w-0 items-start gap-5 rounded-xl border-2 border-current p-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))" }}>
        <div className="mx-auto flex aspect-[4/5] w-full max-w-[320px] flex-col justify-between gap-3 rounded-xl p-5 text-[#f3f2f2]" style={{ background: "var(--sd-accent)" }}>
          <span className="text-xs font-extrabold tracking-[.1em] uppercase">Klymb.ai · Badge earned</span>
          <div className="size-24 flex-none rounded-full p-[5px]" style={{ background: "conic-gradient(from 210deg, #fbdcdd, #f0868b, #fff2ef, #f3b3b6, #fbdcdd)" }}>
            <div className="flex size-full items-center justify-center rounded-full text-white" style={{ background: "radial-gradient(circle at 35% 30%, #c4454b, #5a0307 72%)", boxShadow: "inset 0 -6px 12px rgba(0,0,0,.3), inset 0 4px 8px rgba(255,255,255,.3)" }}>{posterIcon}</div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[34px] leading-none font-extrabold tracking-[-.03em]">{badge.name}</span>
            <span className="text-sm leading-[1.4]">{badge.description}</span>
          </div>
          <div className="flex flex-col gap-0.5 border-t border-white/35 pt-2.5">
            <span className="text-[15px] font-extrabold">{name || "Your name"}</span>
            <span className="text-xs">{course} · klymb.ai</span>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <span className="text-[22px] leading-[1.1] font-extrabold tracking-[-.02em]">Share your badge</span>
          <label htmlFor={`${id}-poster-name`} className="flex flex-col gap-1.5 text-[13px] font-bold">
            Name
            <input id={`${id}-poster-name`} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" className="sd-input min-h-11" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={download} disabled={busy} className={`${posterButton} border border-current`}>{busy ? "Creating image…" : "Download"}</button>
            <a
              href="https://www.linkedin.com/feed/"
              target="_blank"
              rel="noopener noreferrer"
              className={`${posterButton} bg-[#83050b] text-[#f3f2f2]`}
              onClick={() => { navigator.clipboard?.writeText(caption).then(() => setStatus("Caption copied. Attach the badge image to your post.")).catch(() => setStatus("Open LinkedIn and paste the caption from the downloaded badge.")); }}
            >
              Share on LinkedIn
            </a>
          </div>
          <p role="status" aria-live="polite" className="m-0 text-[13px]">{status}</p>
          <p className="m-0 text-xs text-sd-n-700">This celebrates recorded learning activity. It is not a professional certification.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-6 border border-current/20 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <Image unoptimized src={imageSrc ?? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt={imageSrc ? `${badge.name} Klymb.ai badge` : `${badge.name} achievement badge for ${name || "a proud learner"}`} width={1200} height={imageSrc ? 1200 : 900} className="h-auto w-full max-w-[420px] self-start justify-self-center" />
      <div className="flex min-w-0 flex-col gap-3">
        <h3 className="text-xl font-bold">You earned it. Share it.</h3>
        <p className="text-sm">{badge.description}</p>
        {!imageSrc && <><label htmlFor={`${id}-name`} className="text-sm font-semibold">Name on your badge</label>
        <input id={`${id}-name`} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" className="min-h-11 w-full border border-current/40 bg-transparent px-3 text-base" /></>}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={download} disabled={busy} className={`${button} bg-[#201e1d] text-white`}>{busy ? "Creating image…" : "Download badge (PNG)"}</button>
          <button type="button" className={button} onClick={async () => {
            try { await navigator.clipboard.writeText(caption); setStatus("Caption copied. Paste it into your LinkedIn post."); }
            catch { setStatus("Select and copy the caption below manually."); }
          }}>Copy caption</button>
          <a href="https://www.linkedin.com/feed/" target="_blank" rel="noopener noreferrer" className={`${button} text-[#0a66c2]`}>Open LinkedIn <span className="sr-only">in a new tab</span>↗</a>
        </div>
        <p className="text-xs">Download your badge, copy the caption, then open LinkedIn and attach the image to a new post.</p>
        <label htmlFor={`${id}-caption`} className="text-sm font-semibold">Your LinkedIn caption</label>
        <textarea id={`${id}-caption`} readOnly value={caption} rows={7} className="w-full resize-y border border-current/30 bg-transparent p-3 text-sm" />
        <p role="status" aria-live="polite" className="text-sm">{status}</p>
        <p className="text-xs">This celebrates recorded learning activity. It is not a professional certification.</p>
      </div>
    </div>
  );
}
