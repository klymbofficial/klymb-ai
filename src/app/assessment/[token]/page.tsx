import type { Metadata } from "next";
import { BrandMark } from "@/components/company/BrandMark";
import { LocalTime } from "@/components/company/LocalTime";
import { readCandidateLink } from "@/lib/company/batch-link";
import { candidateByLink, type CandidateView } from "@/lib/company/batch-data";
import { allowedMinutes, deadlineText, durationText, lastStart, linkState } from "@/lib/company/batch-rules";
import { readableBrandColor } from "@/lib/company/brand";
import { loadCompanyBrand } from "@/lib/company/invite";
import { db } from "@/lib/db/client";
import { MAIL_SUPPORT } from "@/lib/mail";

// The link is the key: never indexed, never sent on as a referrer.
export const metadata: Metadata = { title: "Your assessment", robots: { index: false, follow: false }, referrer: "no-referrer" };

function Shell({ brand, children }: { brand: { name: string; logoUrl: string | null; accent: string | null } | null; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className={brand?.accent ? "text-white" : "bg-night text-paper"} style={brand?.accent ? { background: brand.accent } : undefined}>
        <div className="mx-auto flex max-w-2xl items-center px-4 py-4 sm:px-6">
          {brand ? <BrandMark name={brand.name} logoUrl={brand.logoUrl} /> : <span className="text-sm font-bold">Klymb.ai</span>}
        </div>
      </header>
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section role="status" className="card p-6">
      <h1 className="display text-2xl">{title}</h1>
      <div className="mt-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

/**
 * A candidate's private link. Shows their test, when they can start, how
 * long they have and the rules, in the company's look; or why the link no
 * longer works. Starting the test itself comes with T07: nothing here starts
 * a clock.
 */
export default async function CandidatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ref = readCandidateLink(token);
  const sql = db();
  const found: CandidateView | undefined | null = ref && sql ? await candidateByLink(sql, ref.id) : undefined;
  const brandRow = found && sql ? await loadCompanyBrand(sql, found.batch.companyId) : null;
  const brand = brandRow ? { name: brandRow.name, logoUrl: brandRow.logoUrl, accent: readableBrandColor(brandRow.brandColor) } : null;
  const support = brandRow?.supportEmail ?? MAIL_SUPPORT;
  const write = <a href={`mailto:${support}`} className="font-bold underline underline-offset-4">{support}</a>;

  if (found === null) {
    return <Shell brand={null}><Notice title="This page can't load right now">Try again in a minute. If it keeps happening, write to {write}.</Notice></Shell>;
  }
  if (!ref || !found || found.batch.status === "draft") {
    return <Shell brand={null}><Notice title="This link doesn't work">Check that you opened the whole link from your email. If it still doesn&apos;t work, write to the company that invited you, or to {write}.</Notice></Shell>;
  }

  const { candidate: c, batch: b, version: v } = found;
  const company = brand?.name ?? "The company";
  if (ref.generation !== c.generation) {
    return <Shell brand={brand}><Notice title="This link has been replaced">{company} sent you a newer link. Use the one in their latest email. Questions? Write to {write}.</Notice></Shell>;
  }

  const now = new Date();
  const last = lastStart({ closesAt: b.closesAt, minutes: b.minutes }, c);
  const state = linkState({ batchStatus: b.status, candidateStatus: c.status, opensAt: b.opensAt, lastStart: last, now });
  if (state === "cancelled" || state === "batch_cancelled") {
    return <Shell brand={brand}><Notice title="This invitation was cancelled">{company} cancelled this invitation, so the test can&apos;t be started from this link. Questions? Write to {write}.</Notice></Shell>;
  }

  const allowed = durationText(allowedMinutes(b.minutes, c.extraMinutes));
  const heading = state === "missed" ? "The time to start has passed" : state === "not_open" ? "Your assessment opens soon" : "Your assessment is open";

  return (
    <Shell brand={brand}>
      <section className="card p-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">{b.role} · {company}</p>
        <h1 className="display mt-2 text-3xl">{heading}</h1>
        <p className="mt-2 text-sm">Hi {c.name}. This is {company}&apos;s assessment: <strong>{b.title}</strong>.</p>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {state === "not_open" && (
            <div>
              <dt className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Opens</dt>
              <dd className="mt-1 text-sm">{deadlineText(b.opensAt, b.timeZone)}<LocalTime iso={b.opensAt} zone={b.timeZone} /></dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Start by</dt>
            <dd className="mt-1 text-sm">{deadlineText(last, b.timeZone)}<LocalTime iso={last.toISOString()} zone={b.timeZone} /></dd>
          </div>
          <div>
            <dt className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Time allowed</dt>
            <dd className="mt-1 text-sm">{allowed} once you start. The clock keeps running if you close the page.</dd>
          </div>
        </dl>

        {state === "missed" ? (
          <p className="mt-6 border-l-4 border-error bg-error-tint px-4 py-3 text-sm font-semibold">
            The last moment to start was {deadlineText(last, b.timeZone)}. If you think you should have more time, write to {write}.
          </p>
        ) : (
          <p className="mt-6 border-l-4 border-ink bg-white px-4 py-3 text-sm">
            Start by the time above to get your full {allowed}. After it, this link won&apos;t start the test. Starting the test from this page is being switched on; your time hasn&apos;t started.
          </p>
        )}
      </section>

      {state !== "missed" && (v.toolsAllowed.length > 0 || v.toolsNotAllowed.length > 0) && (
        <section className="card p-6 text-sm">
          <h2 className="display text-lg">Rules</h2>
          {v.toolsAllowed.length > 0 && <p className="mt-3"><strong>You may use:</strong> {v.toolsAllowed.join(", ")}.</p>}
          {v.toolsNotAllowed.length > 0 && <p className="mt-2"><strong>Don&apos;t use:</strong> {v.toolsNotAllowed.join(", ")}.</p>}
          <p className="mt-2">You&apos;ll write your answer{v.submission === "written_file" ? " and can attach a file" : ""}.</p>
        </section>
      )}

      <p className="text-xs text-muted">This link is for {c.email} only. Questions about the assessment? Write to {write}.</p>
    </Shell>
  );
}
