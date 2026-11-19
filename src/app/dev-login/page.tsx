import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/layout/Wordmark";
import { DEV_USERS, devLoginEnabled } from "@/lib/dev-login";
import { devSignIn } from "./actions";

export const metadata: Metadata = { title: "Dev sign-in", robots: { index: false, follow: false } };

// Reads the environment on every request, never prerendered.
export const dynamic = "force-dynamic";

/**
 * Sign in as a fake person, with no Google and no fixed port. A 404 unless
 * AUTH_DEV_LOGIN=true on `next dev` or a Vercel preview (src/lib/dev-login.ts).
 */
export default function DevLoginPage() {
  if (!devLoginEnabled()) notFound();

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Wordmark className="text-2xl" />
          <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.18em] text-muted">Dev sign-in</p>
        </div>
        <div className="card p-6 sm:p-8">
          <h1 className="display text-2xl">Sign in as…</h1>
          <p className="mt-2 text-sm text-muted">
            Fake people for testing. Picking one adds the rows that role needs to this environment&apos;s database.
          </p>
          <ul className="mt-6 flex flex-col gap-3">
            {DEV_USERS.map((u) => (
              <li key={u.email}>
                <form action={devSignIn}>
                  <input type="hidden" name="email" value={u.email} />
                  <button
                    type="submit"
                    className="w-full rounded-2xl border border-line/50 bg-white px-4 py-3 text-left shadow-card transition-colors hover:bg-surface"
                  >
                    <span className="block text-sm font-bold text-ink">{u.label}</span>
                    <span className="block text-xs text-muted">{u.blurb}</span>
                    <span className="block text-xs text-muted">{u.email}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
