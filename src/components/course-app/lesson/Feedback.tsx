"use client";

import clsx from "clsx";
import { useState } from "react";
import type { Lang } from "@/data/system-design/types";
import { Icon } from "../icons";
import { anonId } from "../track";

const UI = {
  en: {
    title: (day: number) => `How was Day ${day}?`, sub: "Four quick taps. It shapes the next 20 days.",
    rating: "Your rating", clarity: "Did it explain things easily?", finish: "Will you complete the whole course?", improve: "What should we improve? (optional)",
    clear: [["yes", "Yes"], ["mostly", "Mostly"], ["no", "Not really"]], will: [["yes", "Yes"], ["maybe", "Maybe"], ["no", "No"]],
    placeholder: "Anything confusing, too long, too easy, missing…", send: "Send feedback", sending: "Sending…", thanks: "Thank you! We read every one.",
  },
  hi: {
    title: (day: number) => `Day ${day} kaisa laga?`, sub: "Bas chaar tap. Isse agle 20 din behtar bante hain.",
    rating: "Tumhari rating", clarity: "Kya cheezein aasaani se samajh aayi?", finish: "Kya tum poora course complete karoge?", improve: "Kya improve karein? (optional)",
    clear: [["yes", "Haan"], ["mostly", "Zyada tar"], ["no", "Nahi"]], will: [["yes", "Haan"], ["maybe", "Shayad"], ["no", "Nahi"]],
    placeholder: "Kuch confusing, bahut lamba, bahut aasaan, kuch missing…", send: "Feedback bhejo", sending: "Bhej rahe hain…", thanks: "Shukriya! Hum har ek padhte hain.",
  },
} as const;

function Choice({ options, value, onPick, label }: { options: readonly (readonly [string, string])[]; value: string | null; onPick: (v: string) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map(([v, text]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onPick(v)} className={clsx("sd-btn h-10 px-4 text-sm", value === v ? "bg-sd-ink text-sd-bg" : "sd-btn-secondary")}>{text}</button>
      ))}
    </div>
  );
}

/** End-of-day feedback: a 1–5 rating, was it clear, will you finish, and what to improve. */
export function Feedback({ lesson, day, lang, sent, onSent }: { lesson: string; day: number; lang: Lang; sent: boolean; onSent: () => void }) {
  const ui = UI[lang];
  const [rating, setRating] = useState(0);
  const [clarity, setClarity] = useState<string | null>(null);
  const [willFinish, setWillFinish] = useState<string | null>(null);
  const [improve, setImprove] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (sent) return <p className="m-0 flex items-center gap-2 bg-sd-surface px-4 py-3 text-sm font-extrabold"><Icon name="check" size={16} stroke={3} />{ui.thanks}</p>;

  const send = async () => {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/sd/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ anon: anonId(), lesson, rating, clarity, willFinish, improve, lang }) });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Couldn't send right now.");
      onSent();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't send right now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 border-2 border-sd-ink p-4">
      <div>
        <span className="text-[19px] font-extrabold tracking-[-0.01em]">{ui.title(day)}</span>
        <span className="block text-xs text-sd-n-700">{ui.sub}</span>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">{ui.rating}</span>
        <div role="radiogroup" aria-label={ui.rating} className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} of 5`} onClick={() => setRating(n)} className={clsx("sd-btn size-11 text-[17px]", n <= rating ? "bg-sd-accent text-sd-bg" : "sd-btn-secondary")}>{n}</button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2"><span className="text-sm font-semibold">{ui.clarity}</span><Choice options={ui.clear} value={clarity} onPick={setClarity} label={ui.clarity} /></div>
      <div className="flex flex-col gap-2"><span className="text-sm font-semibold">{ui.finish}</span><Choice options={ui.will} value={willFinish} onPick={setWillFinish} label={ui.finish} /></div>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold">{ui.improve}</span>
        <textarea value={improve} onChange={(e) => setImprove(e.target.value)} rows={3} maxLength={2000} placeholder={ui.placeholder} className="sd-input text-[15px]" />
      </label>
      {err && <p role="alert" className="m-0 text-sm font-semibold text-sd-accent-700">{err}</p>}
      <button type="button" disabled={!rating || busy} onClick={send} className="sd-btn sd-btn-primary h-11 self-start gap-2">{busy ? ui.sending : ui.send}<Icon name="arrowR" size={16} /></button>
    </div>
  );
}
