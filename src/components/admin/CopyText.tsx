"use client";

import { useState } from "react";

/** A button that copies `text` and says so. */
export function CopyText({ text, label = "Copy link", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => void navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
      className={className ?? "border border-line/50 px-3 py-1.5 text-xs font-bold hover:bg-surface"}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
