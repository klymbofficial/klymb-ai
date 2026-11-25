import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/company/BrandMark";
import { BrandSupport } from "@/components/company/BrandSupport";
import { brandProps } from "@/components/company/brand-style";
import { CompanySignInForm } from "@/components/company/CompanySignInForm";
import { Wordmark } from "@/components/layout/Wordmark";
import { getMemberships } from "@/lib/company/auth";
import { publishedBrandBySlug } from "@/lib/company/branding-data";
import { safeOrgNext } from "@/lib/company/return-path";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ next?: string | string[] }> };

/**
 * A company's own sign-in page: where invite emails and deep links into its
 * workspace lead. It shows the company's published brand (logo, name, accent,
 * welcome, support contact) and the same sign-in as everywhere: a password,
 * or an email code. A forgotten password is an email code, then a new
 * password in Settings; the support contact is the way out when neither works.
 *
 * Only a page in this company's workspace is followed afterwards; anything
 * else returns to the workspace's home. An unknown company gets the plain
 * Klymb sign-in, so a mistyped link still lets someone in.
 */
export default async function WorkspaceSignInPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const asked = safeOrgNext((await searchParams).next);
  const sql = db();
  const brand = sql ? await publishedBrandBySlug(sql, slug) : null;
  if (!brand) redirect(asked ? `/org/sign-in?next=${encodeURIComponent(asked)}` : "/org/sign-in");

  const home = `/org/${brand.slug}`;
  const next = asked && (asked === home || asked.startsWith(`${home}/`) || asked.startsWith(`${home}?`)) ? asked : home;

  // Already signed in as a member somewhere: straight on. The workspace itself decides whether they may see it.
  if ((await getMemberships()).length) redirect(next);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12" {...brandProps(brand.accent)}>
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <BrandMark name={brand.name} logoUrl={brand.logoUrl} logoAlt={brand.logoAlt} size="lg" />
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">Company workspace</p>
        </div>
        <div className="card p-6 sm:p-8">
          {brand.accent && <div aria-hidden="true" className="-mx-6 -mt-6 mb-6 h-1.5 bg-[var(--brand-accent)] sm:-mx-8 sm:-mt-8" />}
          <h1 className="display text-2xl">Sign in to {brand.name}</h1>
          <p className="mt-2 text-sm text-muted">
            {brand.welcome ?? "For people your company has invited. Sign in with your work email."}
          </p>
          <CompanySignInForm next={next} />
        </div>
        <ul className="mt-6 space-y-2 text-xs text-muted">
          <li>First time here, or forgot your password? Email yourself a 6-digit code, then set a password in Settings. Still stuck? Try the other work email you may have been invited with.</li>
          <li><BrandSupport brand={brand} /></li>
          <li>
            Here for your own Klymb courses? <Link href="/learn" className="font-semibold text-ink underline underline-offset-2">Sign in to your course</Link> instead.
          </li>
        </ul>
        <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted">
          Powered by <Wordmark className="text-xs" />
        </p>
      </div>
    </div>
  );
}
