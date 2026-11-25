"use client";

import Link from "next/link";
import { useState } from "react";
import { saveCatalogItem, saveCatalogProgram, setCatalogGrant, type CatalogResult } from "@/app/admin/catalog-actions";
import { CATALOG_PURPOSES, KIND_LABEL, PURPOSE_LABEL, type CatalogKind, type CatalogPurpose } from "@/data/business-catalog";
import { CATALOG_STATUSES, STATUS_LABEL, type CatalogStatus } from "@/lib/company/catalog";

const input = "border border-line/60 bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none";
const label = "flex flex-col gap-1 text-xs font-bold";
const submit = "bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-paper disabled:opacity-50";
const quiet = "border-2 border-ink px-4 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-ink hover:text-paper disabled:opacity-50";

export interface AdminCatalogItem {
  slug: string;
  kind: CatalogKind;
  title: string;
  summary: string | null;
  status: CatalogStatus;
  skills: string[];
  purposes: CatalogPurpose[];
  steps: string[];
  /** For an assessment: how many versions have been published. */
  versions: number;
}

type Message = { ok: boolean; text: string } | null;

function Note({ msg }: { msg: Message }) {
  if (!msg) return null;
  return <p role={msg.ok ? "status" : "alert"} className={`w-full text-xs font-semibold ${msg.ok ? "text-ink" : "text-error"}`}>{msg.text}</p>;
}

function useAction() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Message>(null);
  async function run(action: () => Promise<CatalogResult>) {
    setBusy(true);
    setMsg(null);
    const result = await action();
    setBusy(false);
    setMsg({ ok: result.ok, text: result.message });
    return result.ok;
  }
  return { busy, msg, run };
}

const STATUS_TONE: Record<CatalogStatus, string> = {
  draft: "border border-line/60 text-muted",
  published: "bg-ink text-paper",
  retired: "border border-line/60 text-muted line-through",
};

export function CatalogAdmin({
  items, companies, grants,
}: {
  items: AdminCatalogItem[];
  companies: { id: string; slug: string; name: string }[];
  grants: Record<string, string[]>;
}) {
  const [editing, setEditing] = useState<AdminCatalogItem | null>(null);
  const stepChoices = items.filter((i) => i.kind !== "program");

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="items-title" className="flex flex-col gap-4">
        <h2 id="items-title" className="display text-xl">Items</h2>
        {items.map((item) => (
          <ItemCard key={item.slug} item={item} onEditProgram={item.kind === "program" ? () => setEditing(item) : undefined} />
        ))}
      </section>

      <ProgramForm key={editing?.slug ?? "new"} editing={editing} stepChoices={stepChoices} onDone={() => setEditing(null)} />

      <Grants items={items} companies={companies} grants={grants} />
    </div>
  );
}

function ItemCard({ item, onEditProgram }: { item: AdminCatalogItem; onEditProgram?: () => void }) {
  const [status, setStatus] = useState<CatalogStatus>(item.status);
  const [skills, setSkills] = useState(item.skills.join(", "));
  const [purposes, setPurposes] = useState<CatalogPurpose[]>(item.purposes);
  const { busy, msg, run } = useAction();

  return (
    <form
      className="card flex flex-col gap-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        void run(() => saveCatalogItem(item.slug, { status, skills, purposes }));
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${STATUS_TONE[item.status]}`}>{STATUS_LABEL[item.status]}</span>
        <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">{KIND_LABEL[item.kind]}</span>
        <code className="text-xs text-muted">{item.slug}</code>
      </div>
      <h3 className="text-base font-black">{item.title}</h3>
      {item.kind === "program" && (
        <p className="text-sm text-muted">
          {item.steps.length ? item.steps.join(" → ") : "No steps yet."}{" "}
          <button type="button" onClick={onEditProgram} className="font-bold text-ink underline underline-offset-2">Edit program</button>
        </p>
      )}
      {item.kind === "assessment" && (
        <p className="text-sm">
          <Link href={`/admin/catalog/assessments/${item.slug}`} className="font-bold underline underline-offset-2">Write and publish the test</Link>
          <span className="text-muted"> · {item.versions ? `${item.versions} ${item.versions === 1 ? "version" : "versions"} published` : "no version published yet"}</span>
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-end">
        <label className={label}>
          State
          <select value={status} onChange={(e) => setStatus(e.target.value as CatalogStatus)} className={input}>
            {CATALOG_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>
        <label className={label}>
          Skills, separated by commas
          <input value={skills} onChange={(e) => setSkills(e.target.value)} className={input} />
        </label>
        <fieldset className="flex gap-3 pb-2">
          <legend className="sr-only">Used for</legend>
          {CATALOG_PURPOSES.map((p) => (
            <label key={p} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={purposes.includes(p)}
                onChange={(e) => setPurposes((cur) => (e.target.checked ? [...cur, p] : cur.filter((x) => x !== p)))}
              />
              {PURPOSE_LABEL[p]}
            </label>
          ))}
        </fieldset>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={quiet}>{busy ? "Saving…" : "Save"}</button>
        <Note msg={msg} />
      </div>
    </form>
  );
}

function ProgramForm({ editing, stepChoices, onDone }: { editing: AdminCatalogItem | null; stepChoices: AdminCatalogItem[]; onDone: () => void }) {
  const [slug, setSlug] = useState(editing?.slug ?? "");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [summary, setSummary] = useState(editing?.summary ?? "");
  const [steps, setSteps] = useState(editing?.steps.join("\n") ?? "");
  const { busy, msg, run } = useAction();

  return (
    <section aria-labelledby="program-title" className="flex flex-col gap-4">
      <h2 id="program-title" className="display text-xl">{editing ? `Edit ${editing.title}` : "New program"}</h2>
      <form
        className="card flex flex-col gap-3 p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await run(() => saveCatalogProgram({ slug, title, summary, steps }));
          if (ok && !editing) { setSlug(""); setTitle(""); setSummary(""); setSteps(""); }
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>
            URL name
            <input value={slug} onChange={(e) => setSlug(e.target.value)} readOnly={!!editing} required placeholder="engineering-upskilling" className={`${input} font-mono`} />
          </label>
          <label className={label}>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} className={input} />
          </label>
        </div>
        <label className={label}>
          Summary (optional)
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={600} rows={2} className={input} />
        </label>
        <label className={label}>
          Steps, one URL name per line, in order
          <textarea value={steps} onChange={(e) => setSteps(e.target.value)} rows={4} required className={`${input} font-mono`} />
          <span className="font-normal text-muted">Available: {stepChoices.map((s) => s.slug).join(", ")}. A new program starts as a draft.</span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className={submit}>{busy ? "Saving…" : editing ? "Save program" : "Create program"}</button>
          {editing && <button type="button" onClick={onDone} className="text-xs font-bold underline underline-offset-2">Cancel</button>}
          <Note msg={msg} />
        </div>
      </form>
    </section>
  );
}

function Grants({ items, companies, grants }: { items: AdminCatalogItem[]; companies: { id: string; slug: string; name: string }[]; grants: Record<string, string[]> }) {
  const { busy, msg, run } = useAction();
  return (
    <section aria-labelledby="grants-title" className="flex flex-col gap-4">
      <h2 id="grants-title" className="display text-xl">Given to companies</h2>
      <p className="max-w-2xl text-sm text-muted">Giving a program also gives its published steps.</p>
      {companies.length === 0 ? (
        <p className="text-sm text-muted">No companies yet.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line/30">
                <th scope="col" className="p-3 text-xs font-bold">Company</th>
                {items.map((i) => (
                  <th key={i.slug} scope="col" className="p-3 text-xs font-bold">
                    {i.title}
                    <span className="block font-normal text-muted">{STATUS_LABEL[i.status]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-b border-line/15 last:border-0">
                  <th scope="row" className="p-3 font-bold">{c.name}<span className="block text-xs font-normal text-muted">{c.slug}</span></th>
                  {items.map((i) => {
                    const on = grants[c.id]?.includes(i.slug) ?? false;
                    return (
                      <td key={i.slug} className="p-3">
                        <input
                          type="checkbox"
                          defaultChecked={on}
                          disabled={busy}
                          aria-label={`${i.title} for ${c.name}`}
                          onChange={(e) => {
                            const box = e.currentTarget;
                            const want = box.checked;
                            void run(() => setCatalogGrant(c.id, i.slug, want)).then((ok) => { if (!ok) box.checked = !want; });
                          }}
                          className="h-4 w-4"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Note msg={msg} />
    </section>
  );
}
