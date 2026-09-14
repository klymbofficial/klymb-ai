"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/** Local-only practice submission. TODO(Supabase): persist submissions. */
export function WorkSubmission({ label, checklist, submitLabel }: { label: string; checklist?: string[]; submitLabel: string }) {
  const [text, setText] = useState("");
  const [checked, setChecked] = useState<boolean[]>(() => (checklist ?? []).map(() => false));
  const [done, setDone] = useState(false);

  return (
    <div className="border-2 border-line bg-paper p-6">
      {checklist && (
        <fieldset>
          <legend className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Checklist</legend>
          <ul className="mt-3 space-y-2">
            {checklist.map((c, i) => (
              <li key={c} className="flex items-start gap-3">
                <input id={`check-${i}`} type="checkbox" className="mt-1 size-4 accent-red-strong" checked={checked[i]}
                  onChange={(e) => setChecked((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))} />
                <label htmlFor={`check-${i}`}>{c}</label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
      <label htmlFor="work" className="mt-6 block text-sm font-bold">{label}</label>
      <textarea id="work" rows={7} value={text} onChange={(e) => { setText(e.target.value); setDone(false); }}
        className="mt-2 block w-full border-2 border-line bg-white p-3 focus:border-ink focus:outline-none" placeholder="Write your approach, answer or a link to your work…" />
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Button type="button" onClick={() => setDone(true)} disabled={text.trim().length < 20}>{submitLabel}</Button>
        <p role="status" className="text-sm font-semibold">
          {done ? "Saved in this preview only — it will be lost on refresh." : text.trim().length < 20 ? "Write at least 20 characters to submit." : ""}
        </p>
      </div>
    </div>
  );
}
