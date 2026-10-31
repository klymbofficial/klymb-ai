"use client";

import { useRef, useState } from "react";
import { addPerson, removePerson, resendInvite, uploadPeople, type PeopleResult } from "@/app/org/[slug]/people/actions";
import { CSV_COLUMNS, MAX_CSV_ROWS, type RowError } from "@/lib/company/people";
import type { CompanyPeople, PersonRow } from "@/lib/company/people-data";

const input = "border border-line/60 bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none";
const label = "flex flex-col gap-1 text-xs font-bold";
const submit = "bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-paper disabled:opacity-50";

const ROLE_LABEL: Record<PersonRow["role"], string> = { hr: "HR", head: "Team head", employee: "Employee" };
const TEMPLATE = `${CSV_COLUMNS.join(",")}\nasha@example.com,Asha Rao,Sales\nsam@example.com,Sam Lee,\n`;

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function Note({ result }: { result: PeopleResult | null }) {
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

export function PeopleManager({ slug, me, data }: { slug: string; me: string; data: CompanyPeople }) {
  const used = data.active.length;
  const free = Math.max(0, data.seatCount - used);
  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm nums" aria-live="polite">
        <strong>{used}</strong> of <strong>{data.seatCount}</strong> seats used · <strong>{free}</strong> free
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <AddOne slug={slug} teams={data.teams.map((t) => t.name)} free={free} />
        <UploadCsv slug={slug} free={free} />
      </div>
      <ActiveList slug={slug} me={me} people={data.active} />
      <RemovedList people={data.removed} />
    </div>
  );
}

function AddOne({ slug, teams, free }: { slug: string; teams: string[]; free: number }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [role, setRole] = useState("employee");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PeopleResult | null>(null);

  return (
    <form
      className="card flex flex-col gap-3 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setResult(null);
        const r = await addPerson(slug, { email, name, team: role === "hr" ? "" : team, role });
        setBusy(false);
        setResult(r);
        if (r.ok) { setEmail(""); setName(""); }
      }}
    >
      <h2 className="text-base font-black">Add one person</h2>
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
          Role
          <select value={role} onChange={(e) => setRole(e.target.value)} className={input}>
            <option value="employee">Employee</option>
            <option value="hr">HR</option>
          </select>
        </label>
        <label className={label}>
          Team
          <select value={role === "hr" ? "" : team} onChange={(e) => setTeam(e.target.value)} disabled={role === "hr"} className={`${input} min-w-40`}>
            <option value="">No team</option>
            {teams.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      </div>
      <div>
        <button type="submit" disabled={busy || free === 0} className={submit}>{busy ? "Adding…" : "Add person"}</button>
      </div>
      {free === 0 && !result && <p className="text-xs text-muted">Every seat is taken. Remove someone, or ask Klymb for more seats.</p>}
      <Note result={result} />
    </form>
  );
}

function UploadCsv({ slug, free }: { slug: string; free: number }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PeopleResult | null>(null);

  return (
    <form
      className="card flex flex-col gap-3 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setResult(null);
        const r = await uploadPeople(slug, new FormData(e.currentTarget));
        setBusy(false);
        setResult(r);
        if (r.ok && fileRef.current) fileRef.current.value = "";
      }}
    >
      <h2 className="text-base font-black">Upload a CSV</h2>
      <p className="text-xs text-muted">
        Columns: <code className="font-mono">{CSV_COLUMNS.join(", ")}</code>, with a header row. Only email is needed. Teams must already exist.
        Everyone joins as an employee. Up to {MAX_CSV_ROWS} people per file; if any row has a problem, nobody is added.
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
        <button type="submit" disabled={busy || free === 0} className={submit}>{busy ? "Checking…" : "Upload"}</button>
      </div>
      <Note result={result} />
    </form>
  );
}

function ActiveList({ slug, me, people }: { slug: string; me: string; people: PersonRow[] }) {
  // Which row is working, and on what, so only that row's button says so.
  const [busy, setBusy] = useState<{ email: string; what: "remove" | "resend" } | null>(null);
  const [result, setResult] = useState<PeopleResult | null>(null);

  async function act(p: PersonRow, what: "remove" | "resend") {
    setBusy({ email: p.email, what });
    setResult(null);
    setResult(await (what === "remove" ? removePerson(slug, p.email) : resendInvite(slug, p.email)));
    setBusy(null);
  }

  function remove(p: PersonRow) {
    const who = p.name ? `${p.name} (${p.email})` : p.email;
    if (!window.confirm(`Remove ${who}?\n\nTheir access ends now and their seat frees up. Their progress is kept, and you can add them back later.`)) return;
    return act(p, "remove");
  }
  const working = (p: PersonRow, what: "remove" | "resend") => busy?.email === p.email && busy.what === what;

  return (
    <section aria-labelledby="active-people" className="flex flex-col gap-3">
      <h2 id="active-people" className="text-lg font-black">People <span className="text-muted nums">({people.length})</span></h2>
      <Note result={result} />
      {people.length === 0 ? (
        <p className="text-sm text-muted">Nobody yet. Add someone above.</p>
      ) : (
        <div className="overflow-x-auto border border-line/25 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line/25 text-xs uppercase tracking-wider text-muted">
              <tr><th className="px-3 py-2">Person</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Team</th><th className="px-3 py-2">Added</th><th className="px-3 py-2"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.email} className="border-b border-line/15 last:border-0">
                  <td className="px-3 py-2">
                    <div className="font-semibold">{p.name ?? p.email}</div>
                    {p.name && <div className="text-xs text-muted">{p.email}</div>}
                  </td>
                  <td className="px-3 py-2">{ROLE_LABEL[p.role]}</td>
                  <td className="px-3 py-2">{p.team_name ?? <span className="text-muted">—</span>}</td>
                  <td className="px-3 py-2 nums text-muted">{day(p.added_at)}</td>
                  <td className="px-3 py-2 text-right">
                    {p.email === me ? (
                      <span className="text-xs text-muted">You</span>
                    ) : (
                      <span className="inline-flex gap-4 whitespace-nowrap">
                        <button type="button" onClick={() => act(p, "resend")} disabled={busy !== null} className="text-xs font-bold underline underline-offset-2 disabled:opacity-50">
                          {working(p, "resend") ? "Sending…" : "Resend invite"}
                        </button>
                        <button type="button" onClick={() => remove(p)} disabled={busy !== null} className="text-xs font-bold text-error underline underline-offset-2 disabled:opacity-50">
                          {working(p, "remove") ? "Removing…" : "Remove"}
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RemovedList({ people }: { people: PersonRow[] }) {
  if (people.length === 0) return null;
  return (
    <section aria-labelledby="removed-people" className="flex flex-col gap-3">
      <h2 id="removed-people" className="text-lg font-black">Removed <span className="text-muted nums">({people.length})</span></h2>
      <p className="text-xs text-muted">They can&apos;t sign in and don&apos;t use a seat. Their progress is kept. Add the same email again to bring someone back.</p>
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
