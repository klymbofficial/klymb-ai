"use client";

import { useState } from "react";
import { createCoupon, setCouponPaused, type CouponInput } from "@/app/admin/coupon-actions";

export interface CouponRow {
  code: string; price: number; max_uses: number | null; ends_at: string | null; paused_at: string | null;
  note: string | null; created_by: string; created_at: string; used: number;
}

const input = "border border-line/60 bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none";
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });
const BLANK: CouponInput = { code: "", price: "499", maxUses: "", endsOn: "", note: "" };

function status(r: CouponRow, now: number) {
  if (r.paused_at) return "Paused";
  if (r.ends_at && now >= new Date(r.ends_at).getTime()) return "Ended";
  if (r.max_uses !== null && r.used >= r.max_uses) return "Used up";
  return "Active";
}

export function CouponsAdmin({ rows, siteUrl }: { rows: CouponRow[]; siteUrl: string }) {
  const [now] = useState(() => Date.now());
  return (
    <div className="flex flex-col gap-8">
      <Create />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line/30 text-xs uppercase tracking-wider text-muted">
            <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Used</th><th className="px-4 py-3">Last day</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-line/20">
            {rows.map((r) => {
              const st = status(r, now);
              return (
                <tr key={r.code} className={st === "Active" ? "" : "text-muted"}>
                  <td className="px-4 py-3">
                    <div className="font-mono font-semibold">{r.code}</div>
                    {r.note && <div className="text-xs text-muted">{r.note}</div>}
                    <CopyLink url={`${siteUrl}/system-design?coupon=${r.code}`} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">₹{r.price.toLocaleString("en-IN")}</td>
                  <td className="whitespace-nowrap px-4 py-3">{r.used}{r.max_uses !== null ? ` of ${r.max_uses}` : ""}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">{r.ends_at ? day(r.ends_at) : "No end"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold">{st}</td>
                  <td className="px-4 py-3"><Pause code={r.code} paused={!!r.paused_at} /></td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted">No coupon codes yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Create() {
  const [f, setF] = useState<CouponInput>(BLANK);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof CouponInput>(k: K, v: CouponInput[K]) => setF((p) => ({ ...p, [k]: v }));

  return (
    <form
      className="card flex flex-col gap-4 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        const r = await createCoupon(f);
        setBusy(false);
        if (!r.ok) return setMsg({ ok: false, text: r.message });
        setMsg({ ok: true, text: `${f.code.trim().toUpperCase()} is live.` });
        setF(BLANK);
      }}
    >
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-[2_1_200px] flex-col gap-1 text-xs font-bold">
          Code
          <input required maxLength={20} placeholder="KLYMB499" value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} className={`${input} font-mono`} />
        </label>
        <label className="flex flex-[1_1_120px] flex-col gap-1 text-xs font-bold">
          Price (₹)
          <input required type="number" min={1} step={1} value={f.price} onChange={(e) => set("price", e.target.value)} className={input} />
        </label>
        <label className="flex flex-[1_1_140px] flex-col gap-1 text-xs font-bold">
          How many people (optional)
          <input type="number" min={1} step={1} placeholder="No limit" value={f.maxUses} onChange={(e) => set("maxUses", e.target.value)} className={input} />
        </label>
        <label className="flex flex-[1_1_160px] flex-col gap-1 text-xs font-bold">
          Last day (optional)
          <input type="date" value={f.endsOn} onChange={(e) => set("endsOn", e.target.value)} className={input} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs font-bold">
        Note for you (optional)
        <input maxLength={120} placeholder="Who it's for, e.g. college workshop" value={f.note} onChange={(e) => set("note", e.target.value)} className={input} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-paper disabled:opacity-50">{busy ? "Saving…" : "Make coupon"}</button>
        {msg && <p role={msg.ok ? "status" : "alert"} className={`text-xs font-semibold ${msg.ok ? "text-ink" : "text-error"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" onClick={() => void navigator.clipboard?.writeText(url).then(() => setCopied(true))} className="mt-1 text-xs underline underline-offset-2 hover:text-ink">
      {copied ? "Link copied" : "Copy link"}
    </button>
  );
}

function Pause({ code, paused }: { code: string; paused: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <span className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (!paused && !window.confirm(`Pause ${code}? It stops working at checkout until you turn it back on.`)) return;
          setBusy(true);
          const r = await setCouponPaused(code, !paused);
          setBusy(false);
          if (!r.ok) setError(r.message);
        }}
        className="rounded-md border border-line/50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-surface disabled:opacity-50"
      >
        {busy ? "Saving…" : paused ? "Turn on" : "Pause"}
      </button>
      {error && <span role="alert" className="text-xs text-error">{error}</span>}
    </span>
  );
}
