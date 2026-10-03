import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "You're offline", robots: { index: false, follow: false } };

/** Served by the service worker for any page that was never visited while online. */
export default function OfflinePage() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center px-4 py-16 sm:px-6">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-red-deep">No connection</p>
      <h1 className="display mt-3 text-[clamp(2rem,5vw,3.25rem)] text-balance">You&apos;re offline. Your course isn&apos;t.</h1>
      <p className="mt-4 text-muted">
        Pages you have opened before still work, and every day of your course is saved on this device once you have
        opened your dashboard online. Anything you submit now is kept and sent when you reconnect.
      </p>
      <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold">
        <Link href="/learn" className="underline underline-offset-4">My cohort</Link>
        <Link href="/" className="underline underline-offset-4">Home</Link>
        <Link href="/tracks" className="underline underline-offset-4">Career tracks</Link>
      </div>
    </section>
  );
}
