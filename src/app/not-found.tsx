import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/layout/Wordmark";
import { ButtonLink } from "@/components/ui/Button";
import { tracks } from "@/data/tracks";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: true } };

/** Any unknown URL: say so plainly, then offer the places people were most likely looking for. */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-16 sm:px-6">
      <Link href="/" aria-label="Klymb.ai home"><Wordmark className="text-xl" /></Link>
      <p className="mt-12 text-xs font-extrabold uppercase tracking-[0.14em] text-red-deep">404</p>
      <h1 className="display mt-3 text-[clamp(2.25rem,6vw,4rem)] text-balance">
        This page doesn&apos;t exist. <span className="text-red-strong">Your next role still does.</span>
      </h1>
      <p className="mt-4 text-muted">The link may be old or mistyped. Try one of these instead.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/tracks" soft arrow>Choose your track</ButtonLink>
        <ButtonLink href="/" variant="secondary" soft className="border-line hover:bg-ink">Home</ButtonLink>
      </div>
      <ul className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {tracks.map((t) => (
          <li key={t.slug}><Link href={`/tracks/${t.slug}`} className="font-semibold underline underline-offset-4 hover:text-red-deep">{t.name}</Link></li>
        ))}
        <li><Link href="/contact" className="font-semibold underline underline-offset-4 hover:text-red-deep">Contact</Link></li>
      </ul>
    </main>
  );
}
