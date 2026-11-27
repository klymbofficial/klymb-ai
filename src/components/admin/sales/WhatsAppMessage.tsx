"use client";

import { useState, useSyncExternalStore } from "react";
import { input } from "@/components/admin/sales/styles";

/**
 * The opening WhatsApp message the WhatsApp buttons type in for you. It lives
 * in this browser only (localStorage), so each person keeps their own and it
 * doesn't follow them to another laptop or phone. {name} becomes the lead's
 * first name; anything else can still be changed in WhatsApp before sending.
 */
export const DEFAULT_WHATSAPP_MESSAGE = `Hi {name}, Sarthak here 👋
linkedin.com/in/sarthak-gupta7

I'm building Klymb.ai and wanted to connect on a short call. Got something I think you'll find useful. Can I share?`;

const KEY = "klymb.sales.whatsappMessage";
const EVENT = "klymb:whatsapp-message";

function read(): string {
  try {
    return window.localStorage.getItem(KEY) ?? DEFAULT_WHATSAPP_MESSAGE;
  } catch {
    return DEFAULT_WHATSAPP_MESSAGE;
  }
}

function write(value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, value);
  } catch {
    // Private window or blocked storage: the default keeps working.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useWhatsAppMessage(): string {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_WHATSAPP_MESSAGE);
}

/** "Abhay Kumar Kanwadia" → "Abhay". */
function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? "";
  // Names synced from WhatsApp can be just a number; don't greet a number.
  return /[a-z]/i.test(first) ? first.charAt(0).toUpperCase() + first.slice(1) : "";
}

export function fillMessage(template: string, name: string): string {
  const first = firstName(name);
  return first ? template.replaceAll("{name}", first) : template.replace(/ ?\{name\}/g, "");
}

export function whatsappHref(phone: string, name: string, template: string): string {
  const text = fillMessage(template, name).trim();
  return `https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** A fold-out box above the sheet to change the saved message. */
export function WhatsAppMessageEditor() {
  const saved = useWhatsAppMessage();
  const [draft, setDraft] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const value = draft ?? saved;
  const btn = "px-3 py-1.5 text-xs font-bold uppercase tracking-wider disabled:opacity-50";

  return (
    <details className="card p-3">
      <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider">WhatsApp opening message</summary>
      <p className="mt-2 text-xs text-muted">
        The WhatsApp buttons open the chat with this already typed. <b>{"{name}"}</b> becomes the person&apos;s first name.
        You can still change it in WhatsApp before sending. Saved in this browser only.
      </p>
      <textarea
        value={value}
        onChange={(e) => { setDraft(e.target.value); setNote(""); }}
        rows={6}
        maxLength={1000}
        className={`${input} mt-2 w-full font-sans`}
      />
      <p className="mt-1 text-xs text-muted">Preview for &ldquo;Abhay Kumar&rdquo;: {fillMessage(value, "Abhay Kumar").split("\n")[0]}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={draft === null || draft === saved}
          onClick={() => { write(value.trim() ? value : null); setDraft(null); setNote("Saved."); }}
          className={`${btn} bg-ink text-paper`}
        >
          Save
        </button>
        <button
          type="button"
          disabled={saved === DEFAULT_WHATSAPP_MESSAGE && draft === null}
          onClick={() => { write(null); setDraft(null); setNote("Back to the default."); }}
          className={`${btn} border border-line/50 hover:bg-surface`}
        >
          Reset to default
        </button>
        {note && <span role="status" className="text-xs font-semibold">{note}</span>}
      </div>
    </details>
  );
}
