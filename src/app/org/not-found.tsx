import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Not available", robots: { index: false, follow: false } };

/**
 * Every refused company page lands here, whether the page doesn't exist or
 * the viewer may not open it: the two look the same on purpose, so a URL
 * can't be used to find out which companies exist.
 */
export default function OrgNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <p className="display text-lg">KLYMB<span className="text-red">.AI</span></p>
        <h1 className="display mt-6 text-2xl">This page isn&apos;t available to you</h1>
        <p className="mt-3 text-sm text-muted">
          It may not exist, or it may belong to another company. If you expected to see it, check you signed in with the
          work email your company invited, then ask your HR contact.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/org">Go to my company</ButtonLink>
          <ButtonLink href="/org/sign-in" variant="secondary">Sign in again</ButtonLink>
        </div>
        <p className="mt-6 text-xs text-muted">
          Not part of a company? <Link href="/" className="font-semibold underline underline-offset-2">Klymb.ai home</Link>
        </p>
      </div>
    </div>
  );
}
