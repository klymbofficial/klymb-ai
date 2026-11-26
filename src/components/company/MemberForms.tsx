"use client";

import { useRef, useState } from "react";
import { BTN_PRIMARY } from "@/components/company/HiringParts";
import { addPerson, previewUpload, updateRoles, uploadPeople, type PeopleResult, type UploadPreview } from "@/app/org/[slug]/(workspace)/people/actions";
import { GRANTABLE_ROLES, ROLE_LABEL, type GrantableRole } from "@/lib/company/access";
import { CSV_COLUMNS, MAX_CSV_ROWS, type RowError } from "@/lib/company/people";
import type { PersonRow } from "@/lib/company/people-data";

const input = "min-h-10 rounded-md border border-line/50 bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none";
const label = "flex flex-col gap-1 text-xs font-bold";
const submit = BTN_PRIMARY;

/** What each responsibility opens, beside its checkbox. */
const ROLE_HINT: Record<GrantableRole, string> = {
  admin: "Runs this workspace: people, teams and assigning",
  company_head: "Company-wide Upskill progress",
  recruiter: "Schedules tests and invites candidates",
  reviewer: "Reviews and approves test content",
  employee: "Their own Upskill progress",
};

const TEMPLATE = `${CSV_COLUMNS.join(",")}\nasha@example.com,Asha Rao,Sales\nsam@example.com,Sam Lee,\n`;

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function Note({ result }: { result: PeopleResult | null }) {
  if (!result) return null;
  return (
    <div role={result.ok ? "status" : "alert"} className={`w-full text-xs font-semibold ${result.ok ? "text-ink" : "text-error"}`}>
      <p>{result.message}</p>
      {!result.ok && result.errors && <ErrorReport errors={result.errors} />}
    </div>
  );
}

/** Every problem in the file, by line, so HR can fix it all in one go. */
function ErrorReport({ errors }: { errors: RowError[] }) {
  return (
    <ul className="mt-2 max-h-72 overflow-y-auto border border-error/40 bg-error-tint p-3 font-normal">
      {errors.map((e, i) => (
        <li key={i} className="flex gap-3 py-0.5">
          <span className="w-16 shrink-0 font-mono font-bold nums">{e.line === null ? "File" : `Line ${e.line}`}</span>
          <span>{e.message}</span>
        </li>
      ))}
    </ul>
  );
}

export function AddOne({ slug, teams, free, initialRole = "employee" }: { slug: string; teams: string[]; free: number; initialRole?: "employee" | "admin" }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [role, setRole] = useState<string>(initialRole);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PeopleResult | null>(null);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setResult(null);
        const r = await addPerson(slug, { email, name, team, role });
        setBusy(false);
        setResult(r);
        if (r.ok) { setEmail(""); setName(""); }
      }}
    >
            <label className={label}>
        Email
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" spellCheck={false} className={input} />
      </label>
      <label className={label}>
        Name (optional)
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="off" className={input} />
      </label>
      <div className="flex flex-wrap gap-3">
        <label className={label}>
          Joins as
          <select value={role} onChange={(e) => setRole(e.target.value)} className={input}>
            <option value="employee">{ROLE_LABEL.employee}</option>
            <option value="admin">{ROLE_LABEL.admin}</option>
          </select>
        </label>
        <label className={label}>
          Team
          <select value={team} onChange={(e) => setTeam(e.target.value)} className={`${input} min-w-40`}>
            <option value="">No team</option>
            {teams.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      </div>
      <p className="text-xs text-muted">Give more responsibilities, like recruiter or company head, by opening the person in the members list once they&apos;re added.</p>
      <div>
        <button type="submit" disabled={busy || free === 0} className={submit}>{busy ? "Adding…" : "Add person"}</button>
      </div>
      {free === 0 && !result && <p className="text-xs text-muted">Every seat is taken. Remove someone, or ask Klymb for more seats.</p>}
      <Note result={result} />
    </form>
  );
}

export function UploadCsv({ slug, free }: { slug: string; free: number }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | "check" | "add">(null);
  const [result, setResult] = useState<PeopleResult | null>(null);
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [file, setFile] = useState<FormData | null>(null);

  const reset = () => { setPreview(null); setFile(null); if (fileRef.current) fileRef.current.value = ""; };

  async function check(form: HTMLFormElement) {
    const data = new FormData(form);
    setBusy("check");
    setResult(null);
    const r = await previewUpload(slug, data);
    setBusy(null);
    if (!r.ok) return setResult(r);
    setFile(data);
    setPreview(r.preview);
  }

  async function add() {
    if (!file || !preview) return;
    setBusy("add");
    const r = await uploadPeople(slug, file, preview.add.map((p) => p.email));
    setBusy(null);
    setResult(r);
    if (r.ok) reset();
  }

  if (preview) {
    const n = preview.add.length;
    return (
      <section aria-labelledby="csv-check" className="flex flex-col gap-4">
        <h2 id="csv-check" className="text-base font-black">Check the file</h2>
        <p className="text-sm">
          {n ? <><strong>{n}</strong> to add</> : "Nobody new to add"}
          {preview.skipped.length > 0 && <> · <strong>{preview.skipped.length}</strong> already here, left as they are</>}
          {" · "}{preview.activeMembers + n} of {preview.seats} seats after
        </p>
        {n > 0 && (
          <ul className="max-h-64 overflow-y-auto border border-line/40 bg-white text-sm">
            {preview.add.map((p) => (
              <li key={p.email} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 border-b border-line/15 px-3 py-1.5 last:border-0">
                <span className="font-mono text-xs text-muted">Line {p.line}</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{p.name ?? p.email}</span>
                  <span className="block truncate text-xs text-muted">{[p.name ? p.email : null, p.team, p.returning ? "returning" : null].filter(Boolean).join(" · ")}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted">Each person gets an email with how to sign in.</p>
        <div className="flex flex-wrap items-center gap-2">
          {n > 0 && <button type="button" onClick={add} disabled={busy !== null} className={submit}>{busy === "add" ? "Adding…" : `Add ${n} ${n === 1 ? "person" : "people"}`}</button>}
          <button type="button" onClick={() => { reset(); setResult(null); }} disabled={busy !== null} className="px-3 py-2 text-xs font-bold underline underline-offset-4">Choose another file</button>
        </div>
        <Note result={result} />
      </section>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => { e.preventDefault(); void check(e.currentTarget); }}
    >
            <p className="text-xs text-muted">
        Columns: <code className="font-mono">{CSV_COLUMNS.join(", ")}</code>, with a header row. Only email is needed; teams must already exist.
        Up to {MAX_CSV_ROWS} people. You check the list before anyone is added, and people already here are left as they are.
      </p>
      <a
        href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`}
        download="klymb-people-template.csv"
        className="self-start text-xs font-bold underline underline-offset-2"
      >
        Download a template
      </a>
      <input ref={fileRef} type="file" name="file" accept=".csv,text/csv" required className="text-sm file:mr-3 file:border file:border-line/60 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-bold" />
      <div>
        <button type="submit" disabled={busy !== null || free === 0} className={submit}>{busy === "check" ? "Checking…" : "Check file"}</button>
      </div>
      <Note result={result} />
    </form>
  );
}

/** Ticks for what someone does. A team's lead is set from the team's card, so it is shown, not edited, here. */
export function RolesEditor({ slug, person, onDone }: { slug: string; person: PersonRow; onDone: (r: PeopleResult) => void }) {
  const [roles, setRoles] = useState<GrantableRole[]>(GRANTABLE_ROLES.filter((r) => person.roles.includes(r)));
  const [busy, setBusy] = useState(false);
  const leads = person.roles.includes("team_lead");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await updateRoles(slug, person.email, roles);
        setBusy(false);
        onDone(r);
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-bold">What {person.name ?? person.email} does</legend>
        {GRANTABLE_ROLES.map((r) => (
          <label key={r} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={roles.includes(r)}
              onChange={(e) => setRoles((now) => (e.target.checked ? GRANTABLE_ROLES.filter((x) => x === r || now.includes(x)) : now.filter((x) => x !== r)))}
              className="mt-1"
            />
            <span><strong className="font-semibold">{ROLE_LABEL[r]}</strong> <span className="text-xs text-muted">· {ROLE_HINT[r]}</span></span>
          </label>
        ))}
        {leads && <p className="text-xs text-muted">Also leads {person.team_name ?? "a team"}. Change a team&apos;s lead by opening the team card.</p>}
      </fieldset>
      <button type="submit" disabled={busy} className={`${submit} mt-3`}>{busy ? "Saving…" : "Save"}</button>
    </form>
  );
}

export function RemovedList({ people }: { people: PersonRow[] }) {
  if (people.length === 0) return null;
  return (
    <section aria-labelledby="removed-people" className="flex flex-col gap-3">
      <h2 id="removed-people" className="text-lg font-black">Removed <span className="text-muted nums">({people.length})</span></h2>
      <p className="text-xs text-muted">They can&apos;t sign in and don&apos;t use a seat. Their record is kept. Add the same email again to bring someone back.</p>
      <ul className="border border-line/25 bg-white text-sm">
        {people.map((p) => (
          <li key={p.email} className="flex flex-wrap justify-between gap-2 border-b border-line/15 px-3 py-2 last:border-0">
            <span>{p.name ? <>{p.name} <span className="text-muted">({p.email})</span></> : p.email}</span>
            <span className="text-xs text-muted nums">Removed {day(p.removed_at!)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
