"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import {
  logOutOtherSessions, saveCompanyInfo, saveCompanySetting, saveMyDetails, saveMyEmailUpdates, type SettingsResult,
} from "@/app/org/[slug]/(workspace)/settings/actions";
import { BTN_PRIMARY } from "@/components/company/HiringParts";
import type { CompanySwitch } from "@/lib/company/settings-rules";
import type { SettingsGroup } from "@/lib/company/settings-nav";

const input = "block w-full min-h-10 rounded-md border border-line/50 bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none aria-[invalid=true]:border-error disabled:bg-paper disabled:text-muted";

/** The section menu: uppercase groups, the open one marked with a bar on its left, like HackerEarth's. */
export function SettingsNav({ groups }: { groups: SettingsGroup[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings" className="shrink-0 rounded-lg border border-line/30 bg-white py-3 lg:sticky lg:top-6 lg:w-64">
      {groups.map((g) => (
        <div key={g.label} className="pb-2">
          <p className="px-5 pb-1.5 pt-3 text-xs font-extrabold uppercase tracking-[0.12em] text-ink">{g.label}</p>
          <ul>
            {g.links.map((l) => {
              const on = pathname === l.href;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={on ? "page" : undefined}
                    className={clsx("block border-l-4 px-4 py-2 text-sm", on ? "border-red-strong bg-paper font-semibold text-ink" : "border-transparent text-ink/80 hover:bg-paper hover:text-ink")}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** A section's heading, with a rule under it. */
export function SettingsHead({ title, intro }: { title: string; intro?: React.ReactNode }) {
  return (
    <div className="mb-6 border-b border-line/25 pb-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {intro && <p className="mt-1.5 max-w-2xl text-sm text-muted">{intro}</p>}
    </div>
  );
}

export function SettingsCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 max-w-3xl rounded-lg border border-line/30 bg-white p-6">
      {title && <h2 className="mb-3 text-lg font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

/** Says plainly that a switch is stored but nothing acts on it yet (user's choice, 26 Nov). */
export function SavedOnlyNote({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 rounded-md bg-[#fdf1e7] px-3 py-2 text-xs text-[#6b3300]">{children}</p>;
}

function Message({ result }: { result: SettingsResult | null }) {
  if (!result) return null;
  return <p role={result.ok ? "status" : "alert"} className={clsx("text-sm font-semibold", result.ok ? "text-[#14532d]" : "text-error")}>{result.message}</p>;
}

function Row({ label, htmlFor, children, error }: { label: string; htmlFor: string; children: React.ReactNode; error?: string | null }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-start sm:gap-6">
      <label htmlFor={htmlFor} className="pt-2 text-sm font-semibold">{label}</label>
      <div>
        {children}
        {error && <p id={`${htmlFor}-error`} className="mt-1 text-xs font-semibold text-error">{error}</p>}
      </div>
    </div>
  );
}

/** A yes/no switch that saves as soon as it is flipped, and goes back if saving fails. */
export function Switch({ label, description, initial, save }: { label: string; description?: React.ReactNode; initial: boolean; save: (on: boolean) => Promise<SettingsResult> }) {
  const [on, setOn] = useState(initial);
  const [result, setResult] = useState<SettingsResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm font-semibold">{label}</p>
          {description && <p className="mt-1 max-w-xl text-sm text-muted">{description}</p>}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={label}
          disabled={pending}
          onClick={() => {
            const next = !on;
            setOn(next);
            setResult(null);
            start(async () => {
              const r = await save(next);
              if (!r.ok) setOn(!next);
              setResult(r);
            });
          }}
          className={clsx("relative inline-flex h-7 w-14 shrink-0 items-center rounded-full px-1 text-[0.6rem] font-extrabold transition-colors disabled:opacity-60", on ? "bg-[#15803d] text-white" : "bg-[#d4d2d1] text-ink")}
        >
          <span className={clsx("absolute", on ? "left-2" : "right-2")}>{on ? "YES" : "NO"}</span>
          <span className={clsx("h-5 w-5 rounded-full bg-white shadow transition-transform", on ? "translate-x-7" : "translate-x-0")} />
        </button>
      </div>
      <Message result={result} />
    </div>
  );
}

export function EmailUpdatesSwitch({ slug, initial }: { slug: string; initial: boolean }) {
  return (
    <Switch
      label="Biweekly account updates"
      description="You'll receive emails every other Monday with updates about your account, such as invitations used and test-level insights."
      initial={initial}
      save={(on) => saveMyEmailUpdates(slug, on)}
    />
  );
}

export function CompanySwitchControl({ slug, setting, label, description, initial }: { slug: string; setting: CompanySwitch; label: string; description: string; initial: boolean }) {
  return <Switch label={label} description={description} initial={initial} save={(on) => saveCompanySetting(slug, setting, on)} />;
}

/** A form whose fields are read on submit and saved by `save`; field errors show under their field. */
function useSave(save: (raw: Record<string, unknown>) => Promise<SettingsResult>) {
  const [result, setResult] = useState<SettingsResult | null>(null);
  const [pending, start] = useTransition();
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.currentTarget));
    setResult(null);
    start(async () => setResult(await save(raw)));
  };
  const errorOn = (f: string) => (result && !result.ok && result.field === f ? result.message : null);
  return { result, pending, onSubmit, errorOn };
}

export function ProfileForm({ slug, profile, zones, languages }: {
  slug: string;
  profile: { email: string; name: string; jobTitle: string | null; phone: string | null; timeZone: string; language: string };
  zones: { value: string; label: string }[];
  languages: readonly { code: string; label: string }[];
}) {
  const { result, pending, onSubmit, errorOn } = useSave((raw) => saveMyDetails(slug, raw));
  const aria = (f: string) => (errorOn(f) ? { "aria-invalid": true, "aria-describedby": `${f}-error` } : {});
  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-4">
      <Row label="Full name" htmlFor="name" error={errorOn("name")}>
        <input id="name" name="name" defaultValue={profile.name} required maxLength={80} autoComplete="name" className={input} {...aria("name")} />
      </Row>
      <Row label="Email" htmlFor="email">
        <input id="email" value={profile.email} disabled className={input} />
        <p className="mt-1 text-xs text-muted">Your work email. Ask an admin if it needs to change.</p>
      </Row>
      <Row label="Job title" htmlFor="jobTitle" error={errorOn("jobTitle")}>
        <input id="jobTitle" name="jobTitle" defaultValue={profile.jobTitle ?? ""} maxLength={80} placeholder="e.g. Tech Recruiter" autoComplete="organization-title" className={input} {...aria("jobTitle")} />
      </Row>
      <Row label="Contact number" htmlFor="phone" error={errorOn("phone")}>
        <input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} maxLength={24} placeholder="+91 98765 43210" autoComplete="tel" className={input} {...aria("phone")} />
      </Row>
      <Row label="Timezone" htmlFor="timeZone" error={errorOn("timeZone")}>
        <select id="timeZone" name="timeZone" defaultValue={profile.timeZone} className={input} {...aria("timeZone")}>
          {zones.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
        </select>
      </Row>
      <Row label="Language" htmlFor="language" error={errorOn("language")}>
        <select id="language" name="language" defaultValue={profile.language} className={input} {...aria("language")}>
          {languages.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </Row>
      <div className="flex flex-wrap items-center gap-4 sm:pl-[calc(11rem+1.5rem)]">
        <button type="submit" disabled={pending} className={BTN_PRIMARY}>{pending ? "Saving…" : "Save changes"}</button>
        {result?.ok && <Message result={result} />}
        {result && !result.ok && !result.field && <Message result={result} />}
      </div>
    </form>
  );
}

export function CompanyInfoForm({ slug, company }: { slug: string; company: { name: string; phone: string | null; website: string | null; address: string | null } }) {
  const { result, pending, onSubmit, errorOn } = useSave((raw) => saveCompanyInfo(slug, raw));
  const aria = (f: string) => (errorOn(f) ? { "aria-invalid": true, "aria-describedby": `${f}-error` } : {});
  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-4">
      <Row label="Company name" htmlFor="company-name">
        <input id="company-name" value={company.name} disabled className={input} />
        <p className="mt-1 text-xs text-muted">Change how the name shows to your people and candidates under Branding below.</p>
      </Row>
      <Row label="Contact number" htmlFor="phone" error={errorOn("phone")}>
        <input id="phone" name="phone" type="tel" defaultValue={company.phone ?? ""} maxLength={24} placeholder="+91 22 4000 1234" className={input} {...aria("phone")} />
      </Row>
      <Row label="Company website" htmlFor="website" error={errorOn("website")}>
        <input id="website" name="website" type="text" inputMode="url" defaultValue={company.website ?? ""} maxLength={200} placeholder="https://www.example.com" className={input} {...aria("website")} />
      </Row>
      <Row label="Contact address" htmlFor="address" error={errorOn("address")}>
        <textarea id="address" name="address" defaultValue={company.address ?? ""} maxLength={500} rows={4} className={input} {...aria("address")} />
      </Row>
      <div className="flex flex-wrap items-center gap-4 sm:pl-[calc(11rem+1.5rem)]">
        <button type="submit" disabled={pending} className={BTN_PRIMARY}>{pending ? "Saving…" : "Save changes"}</button>
        {result?.ok && <Message result={result} />}
        {result && !result.ok && !result.field && <Message result={result} />}
      </div>
    </form>
  );
}

export function LogOutOthers({ slug }: { slug: string }) {
  const [result, setResult] = useState<SettingsResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col items-start gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setResult(await logOutOtherSessions(slug)))}
        className="inline-flex min-h-10 items-center rounded-md bg-error px-4 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Signing out…" : "Log out from other sessions"}
      </button>
      <Message result={result} />
    </div>
  );
}
