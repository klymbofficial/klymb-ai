"use client";

import { useRef, useState } from "react";
import { publishBrand, saveBrandDraft, uploadBrandLogo, type BrandingResult } from "@/app/org/[slug]/(workspace)/branding/actions";
import { BrandMark } from "@/components/company/BrandMark";
import { useConfirm } from "@/components/company/Overlay";
import { brandProps } from "@/components/company/brand-style";
import { contrastWithWhite } from "@/lib/company/brand";
import {
  BRAND_LIMITS,
  MAX_LOGO_BYTES,
  readBrand,
  resolveBrand,
  sameBrand,
  type BrandCompany,
  type BrandField,
  type BrandSettings,
} from "@/lib/company/branding";

const input = "border border-line/60 bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none";
const label = "flex flex-col gap-1 text-xs font-bold";
const submit = "bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-paper disabled:opacity-50";
const publishButton = "border-2 border-red-strong bg-red-strong px-4 py-2 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50";

interface Fields {
  displayName: string;
  accent: string;
  welcome: string;
  supportEmail: string;
  supportText: string;
  logoAlt: string;
  removeLogo: boolean;
}

const fieldsOf = (s: BrandSettings): Fields => ({
  displayName: s.displayName ?? "",
  accent: s.accent ?? "",
  welcome: s.welcome ?? "",
  supportEmail: s.supportEmail ?? "",
  supportText: s.supportText ?? "",
  logoAlt: s.logo?.alt ?? "",
  removeLogo: false,
});

const DATE = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export function BrandingEditor({
  slug, company, draft: initialDraft, published, draftSaved: initiallySaved, publishedAt,
}: {
  slug: string;
  company: BrandCompany;
  draft: BrandSettings;
  published: BrandSettings | null;
  draftSaved: boolean;
  publishedAt: string | null;
}) {
  const [saved, setSaved] = useState(initialDraft);
  const [draftSaved, setDraftSaved] = useState(initiallySaved);
  const [fields, setFields] = useState(fieldsOf(initialDraft));
  const [busy, setBusy] = useState<null | "save" | "logo" | "publish">(null);
  const [result, setResult] = useState<BrandingResult | null>(null);
  const [errors, setErrors] = useState<Partial<Record<BrandField, string>>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  // What the preview shows: the form as it is now, read by the same rules as a saved draft.
  const live = readBrand(
    { ...fields, logo: !fields.removeLogo && saved.logo ? { key: saved.logo.key, alt: fields.logoAlt } : null },
    company.id,
  );
  const preview = resolveBrand(company, live);
  const unsaved = !sameBrand(live, saved) || (fields.accent.trim() !== "" && !live.accent);
  const publishable = draftSaved && !unsaved && !(published && sameBrand(saved, published));
  // What the preview shows is exactly what people see now.
  const isLive = published !== null && sameBrand(live, published);

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  async function act(what: "save" | "logo" | "publish", run: () => Promise<BrandingResult>) {
    setBusy(what);
    setResult(null);
    const r = await run();
    setBusy(null);
    setResult(r);
    setErrors(!r.ok && r.errors ? r.errors : {});
    if (r.ok && r.draft) {
      setSaved(r.draft);
      setDraftSaved(true);
      if (what === "logo") {
        setFields((f) => ({ ...f, removeLogo: false }));
        if (fileRef.current) fileRef.current.value = "";
      } else {
        setFields(fieldsOf(r.draft));
      }
    }
  }

  const [confirm, dialog] = useConfirm();
  const publish = async () => {
    if (await confirm({ title: "Publish this branding?", body: "Everyone in your workspace, your sign-in page and new invite emails will use it.", confirmLabel: "Publish" })) void act("publish", () => publishBrand(slug));
  };

  const ratio = /^#?[0-9a-f]{6}$/i.test(fields.accent.trim()) ? contrastWithWhite(fields.accent.trim().replace(/^#?/, "#")) : null;
  const error = (k: BrandField) => errors[k] && <span role="alert" className="font-semibold text-error">{errors[k]}</span>;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {dialog}
      <div className="flex flex-col gap-6">
        <div aria-live="polite">
          <PublishStatus companyName={company.name} publishedAt={publishedAt} unsaved={unsaved} publishable={publishable} busy={busy} onPublish={publish} />
        </div>

        <form
          className="card flex flex-col gap-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void act("save", () => saveBrandDraft(slug, { ...fields }));
          }}
        >
          <h2 className="text-base font-black">Draft</h2>
          <label className={label}>
            Display name
            <input value={fields.displayName} onChange={set("displayName")} maxLength={BRAND_LIMITS.displayName} placeholder={company.name} className={input} />
            <span className="font-normal text-muted">Leave empty to use {company.name}.</span>
            {error("displayName")}
          </label>

          <div className={label}>
            <label htmlFor="brand-accent">Accent colour</label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                aria-label="Pick an accent colour"
                value={/^#[0-9a-f]{6}$/i.test(fields.accent) ? fields.accent : "#83050b"}
                onChange={set("accent")}
                className="h-10 w-14 cursor-pointer border border-line/60 bg-white p-1"
              />
              <input id="brand-accent" value={fields.accent} onChange={set("accent")} placeholder="#1d4ed8" maxLength={7} spellCheck={false} className={`${input} w-32 font-mono`} />
              {fields.accent && (
                <button type="button" onClick={() => setFields((f) => ({ ...f, accent: "" }))} className="text-xs font-bold underline underline-offset-2">
                  Use Klymb&apos;s
                </button>
              )}
            </div>
            <span className="font-normal text-muted">
              Buttons and the top band use it with white text, so it needs a contrast of at least 4.5:1.
              {ratio !== null && (
                <> This one is <strong className={ratio >= 4.5 ? "text-ink" : "text-error"}>{ratio.toFixed(1)}:1</strong>{ratio >= 4.5 ? "." : ": choose a darker shade."}</>
              )}
            </span>
            {error("accent")}
          </div>

          <label className={label}>
            Welcome text
            <textarea value={fields.welcome} onChange={set("welcome")} maxLength={BRAND_LIMITS.welcome} rows={3} className={input} />
            <span className="font-normal text-muted">Shown on your sign-in page and workspace home. {fields.welcome.length}/{BRAND_LIMITS.welcome}</span>
            {error("welcome")}
          </label>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-xs font-bold">Support contact</legend>
            <label className={label}>
              Email
              <input type="email" value={fields.supportEmail} onChange={set("supportEmail")} placeholder="learning@yourcompany.com" autoComplete="off" spellCheck={false} className={input} />
              {error("supportEmail")}
            </label>
            <label className={label}>
              Who and when
              <input value={fields.supportText} onChange={set("supportText")} maxLength={BRAND_LIMITS.supportText} placeholder="People team, weekdays 10 to 6 IST" className={input} />
              {error("supportText")}
            </label>
          </fieldset>

          {saved.logo && (
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 text-xs font-bold">Logo in the draft</legend>
              <label className={label}>
                Description for screen readers
                <input value={fields.logoAlt} onChange={set("logoAlt")} maxLength={BRAND_LIMITS.logoAlt} placeholder={`${preview.name} logo`} className={input} />
                {error("logoAlt")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={fields.removeLogo} onChange={set("removeLogo")} />
                Remove the logo (your name shows instead)
              </label>
            </fieldset>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy !== null} className={submit}>{busy === "save" ? "Saving…" : "Save draft"}</button>
            <button
              type="button"
              disabled={busy !== null || !publishable}
              onClick={publish}
              className={publishButton}
            >
              {busy === "publish" ? "Publishing…" : "Publish"}
            </button>
          </div>
          {unsaved && <p className="text-xs text-muted">Save the draft before publishing, so what goes live is what you saved.</p>}
        </form>

        <form
          className="card flex flex-col gap-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            void act("logo", () => uploadBrandLogo(slug, data));
          }}
        >
          <h2 className="text-base font-black">{saved.logo ? "Replace the logo" : "Upload a logo"}</h2>
          <p className="text-xs text-muted">PNG, JPEG or WebP, up to {MAX_LOGO_BYTES / 1024} KB. It sits on a white tile, so a logo drawn for white backgrounds works best. It goes into the draft.</p>
          <input ref={fileRef} type="file" name="logo" accept="image/png,image/jpeg,image/webp" required className="text-sm file:mr-3 file:border file:border-line/60 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-bold" />
          <div>
            <button type="submit" disabled={busy !== null} className={submit}>{busy === "logo" ? "Uploading…" : "Upload"}</button>
          </div>
        </form>

        {result && (
          <p role={result.ok ? "status" : "alert"} className={result.ok ? "border-2 border-ink/20 bg-card p-3 text-sm" : "border-2 border-error bg-error-tint p-3 text-sm font-semibold text-error"}>
            {result.message}
          </p>
        )}
      </div>

      <BrandPreview brand={preview} isLive={isLive} />
    </div>
  );
}

/**
 * Whether the people in the workspace see the draft yet, at the top of the page where it can't be missed.
 * Everything on this page, the logo included, goes into a draft, and nobody sees it until it is published.
 */
function PublishStatus({
  companyName, publishedAt, unsaved, publishable, busy, onPublish,
}: {
  companyName: string;
  publishedAt: string | null;
  unsaved: boolean;
  publishable: boolean;
  busy: null | "save" | "logo" | "publish";
  onPublish: () => void;
}) {
  const when = publishedAt ? `${DATE.format(new Date(publishedAt))} IST` : null;
  if (publishable) {
    return (
      <div className="flex flex-col gap-3 border-2 border-red-strong bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <p className="font-bold">Your people can&apos;t see these changes yet.</p>
          <p className="mt-1 text-muted">
            The draft is saved but not published. {when ? <>They still see the version published {when}.</> : <>Until you publish, they see {companyName} in Klymb&apos;s colours.</>}
          </p>
        </div>
        <button type="button" disabled={busy !== null} onClick={onPublish} className={`${publishButton} shrink-0 self-start sm:self-auto`}>
          {busy === "publish" ? "Publishing…" : "Publish now"}
        </button>
      </div>
    );
  }
  if (unsaved) {
    return (
      <div className="border-2 border-ink/30 bg-card p-4 text-sm">
        <p className="font-bold">You have unsaved changes.</p>
        <p className="mt-1 text-muted">Save the draft, then publish it. Nothing on this page reaches your people until you do.</p>
      </div>
    );
  }
  if (when) {
    return (
      <div className="border-2 border-ink/20 bg-card p-4 text-sm">
        <p className="font-bold">Live. Published {when}.</p>
        <p className="mt-1 text-muted">Your people see what&apos;s in the preview.</p>
      </div>
    );
  }
  return (
    <div className="border-2 border-ink/20 bg-card p-4 text-sm">
      <p className="font-bold">Not published yet.</p>
      <p className="mt-1 text-muted">Your people see {companyName} in Klymb&apos;s colours. Make your changes, save the draft, then publish it.</p>
    </div>
  );
}

/** The form as your people would see it once published: the workspace band and the sign-in card. */
function BrandPreview({ brand, isLive }: { brand: ReturnType<typeof resolveBrand>; isLive: boolean }) {
  return (
    <section aria-labelledby="preview-title" className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start" {...brandProps(brand.accent)}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="preview-title" className="text-sm font-extrabold uppercase tracking-[0.14em] text-muted">Preview</h2>
        <span className={isLive ? "border border-ink/30 px-2 py-0.5 text-[11px] font-bold text-ink" : "border-2 border-red-strong px-2 py-0.5 text-[11px] font-bold text-ink"}>
          {isLive ? "Live now" : "Draft, not live yet"}
        </span>
      </div>
      {/* The workspace as people see it: the sidebar, with the open page in the accent, beside the page. */}
      <div className="flex overflow-hidden rounded-lg border border-line/40" aria-label="Workspace">
        <div className="flex w-40 shrink-0 flex-col gap-1 bg-night p-3 text-paper">
          <BrandMark name={brand.name} logoUrl={brand.logoUrl} logoAlt={brand.logoAlt} />
          <p className="mb-2 text-[0.7rem] text-[#b9b5b3]">on Klymb.ai</p>
          <span className="rounded-md bg-red-strong px-2.5 py-1.5 text-sm font-bold text-white">Overview</span>
          <span className="px-2.5 py-1.5 text-sm text-[#e6e3e2]">My Upskill</span>
        </div>
        <div className="min-w-0 flex-1 bg-paper p-4">
          {brand.welcome ? <p className="rounded-md border-l-4 border-red-strong bg-card px-3 py-2 text-sm">{brand.welcome}</p> : <p className="text-sm text-muted">Your workspace</p>}
        </div>
      </div>
      <div className="card p-5" aria-label="Sign-in page">
        <BrandMark name={brand.name} logoUrl={brand.logoUrl} logoAlt={brand.logoAlt} size="lg" />
        <p className="display mt-4 text-xl">Sign in to {brand.name}</p>
        <p className="mt-1 text-sm text-muted">{brand.welcome ?? "For people your company has invited."}</p>
        <span className="mt-4 inline-flex border-2 border-red-strong bg-red-strong px-5 py-2.5 text-sm font-bold text-white">Email me a code</span>
        {(brand.supportEmail || brand.supportText) && (
          <p className="mt-4 text-xs text-muted">Help from {brand.name}: {[brand.supportText, brand.supportEmail].filter(Boolean).join(" · ")}</p>
        )}
      </div>
    </section>
  );
}
