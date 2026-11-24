"use client";

import { useId, useRef, useState } from "react";
import { ATTEMPT_FILE_ACCEPT, ATTEMPT_FILE_LIMITS, sizeText, tooBigText } from "@/lib/company/attempt-files";

export interface ShownFile {
  id: string;
  name: string;
  bytes: number;
}

/**
 * Files attached to the candidate's answer: up to 3, 4 MB each, PDF / PNG /
 * JPG / TXT / MD. Size and count are checked here first to save a wasted
 * upload; the server checks everything again, including the type from the
 * file's own bytes. Files can be removed until the test is submitted or the
 * time is up.
 */
export function AttemptFiles({ token, attemptId, initial, deadline, serverNow }: {
  token: string;
  attemptId: string;
  initial: ShownFile[];
  deadline: string;
  serverNow: string;
}) {
  const [files, setFiles] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [skew] = useState(() => new Date(serverNow).getTime() - Date.now());
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const api = `/api/assessment/${token}/files`;
  const over = () => Date.now() + skew > new Date(deadline).getTime();
  const full = files.length >= ATTEMPT_FILE_LIMITS.count;

  async function add(file: File) {
    if (over()) return setMsg({ ok: false, text: "Time is up, so files can't be added." });
    if (file.size > ATTEMPT_FILE_LIMITS.bytes) return setMsg({ ok: false, text: tooBigText(file.size) });
    setBusy("upload");
    setMsg({ ok: true, text: `Uploading ${file.name}…` });
    const form = new FormData();
    form.set("attemptId", attemptId);
    form.set("file", file);
    try {
      const res = await fetch(api, { method: "POST", body: form });
      const out = (await res.json().catch(() => null)) as { status?: string; message?: string; file?: ShownFile } | null;
      if (out?.status === "added" && out.file) {
        setFiles((f) => [...f, { id: out.file!.id, name: out.file!.name, bytes: out.file!.bytes }]);
        setMsg({ ok: true, text: `${out.file.name} attached.` });
      } else {
        setMsg({ ok: false, text: out?.message ?? "That didn't upload. Try again." });
      }
    } catch {
      setMsg({ ok: false, text: "That didn't upload: check your connection and try again. Your written answer is unaffected." });
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(f: ShownFile) {
    setBusy(f.id);
    try {
      const res = await fetch(api, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ attemptId, fileId: f.id }) });
      const out = (await res.json().catch(() => null)) as { status?: string; message?: string } | null;
      if (out?.status === "removed") {
        setFiles((list) => list.filter((x) => x.id !== f.id));
        setMsg({ ok: true, text: `${f.name} removed.` });
      } else setMsg({ ok: false, text: out?.message ?? "That file can't be removed now." });
    } catch {
      setMsg({ ok: false, text: "That didn't go through: check your connection and try again." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby={`${id}-files`} className="card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`${id}-files`} className="display text-lg">Files</h2>
        <p className="text-xs text-muted">Up to {ATTEMPT_FILE_LIMITS.count} files, {sizeText(ATTEMPT_FILE_LIMITS.bytes)} each: PDF, PNG, JPG, TXT or MD.</p>
      </div>
      {files.length > 0 && (
        <ul className="mt-3 divide-y divide-line/20 rounded-md border border-line/30">
          {files.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 truncate" title={f.name}>{f.name} <span className="text-muted">· {sizeText(f.bytes)}</span></span>
              <button type="button" onClick={() => void remove(f)} disabled={!!busy} className="shrink-0 text-xs font-bold underline underline-offset-4 disabled:opacity-50">
                {busy === f.id ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3">
        <label htmlFor={`${id}-pick`} className={`inline-flex min-h-10 cursor-pointer items-center rounded-md border-2 border-ink bg-white px-4 text-sm font-bold hover:bg-ink hover:text-paper ${full || busy ? "pointer-events-none opacity-50" : ""}`}>
          {busy === "upload" ? "Uploading…" : full ? "Most files attached" : "Attach a file"}
        </label>
        <input
          id={`${id}-pick`}
          ref={input}
          type="file"
          accept={ATTEMPT_FILE_ACCEPT}
          disabled={full || !!busy}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void add(f); }}
          className="sr-only"
        />
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-2 text-sm ${msg.ok ? "text-muted" : "font-semibold text-error"}`}>{msg.text}</p>}
    </section>
  );
}
