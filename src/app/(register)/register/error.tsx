"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Wordmark } from "@/components/layout/Wordmark";
import { Button } from "@/components/ui/Button";
import { contact } from "@/data/config";

/**
 * The page itself failed to load (not a mistake in the form, which the form
 * explains in place). Nothing was submitted, so nothing is lost: it says so
 * and offers a retry and the way to reach us.
 */
export default function RegisterError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("register page failed:", error.digest ?? error.message);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <Wordmark className="text-xl" />
      <p className="mt-10 text-xs font-extrabold uppercase tracking-[0.16em] text-red-deep">Something went wrong</p>
      <h1 className="display mt-3 text-3xl text-balance">We couldn&apos;t load registration</h1>
      <p className="mt-3 text-muted">
        This is on our side. Nothing was submitted, so you have not registered yet. Try again in a moment, or write to{" "}
        <a href={`mailto:${contact.email}`} className="font-semibold text-ink underline underline-offset-4">{contact.email}</a>.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button type="button" soft onClick={reset} className="rounded-full px-7">Try again</Button>
        <Link href="/" className="inline-flex items-center rounded-full border-2 border-ink px-7 py-3 text-sm font-bold transition-colors hover:bg-ink hover:text-paper">Go to klymb.ai</Link>
      </div>
    </div>
  );
}
