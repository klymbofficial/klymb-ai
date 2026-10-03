import { MotionProvider } from "@/components/motion/MotionProvider";
import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { Wordmark } from "@/components/layout/Wordmark";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <aside className="flex flex-col gap-6 bg-ink px-4 py-5 text-paper lg:w-60 lg:shrink-0 lg:px-5 lg:py-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Wordmark className="text-xl text-paper" />
            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/50">Admin</p>
          </div>
          <Link href="/" className="text-xs font-semibold text-white/60 underline underline-offset-4 hover:text-white lg:hidden">
            View site
          </Link>
        </div>

        <AdminNav />

        <div className="mt-auto hidden flex-col gap-3 border-t border-white/15 pt-4 lg:flex">
          <div>
            <p className="text-xs font-bold">{admin.name ?? "Signed in"}</p>
            <p className="truncate text-xs text-white/55">{admin.email}</p>
          </div>
          <Link href="/" className="text-xs font-semibold text-white/60 underline underline-offset-4 hover:text-white">View site</Link>
          <form action={signOut}>
            <button type="submit" className="border border-white/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-white/10">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main id="admin-main" className="min-w-0 flex-1 bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10"><MotionProvider>{children}</MotionProvider></div>
        <form action={signOut} className="px-4 pb-8 lg:hidden">
          <button type="submit" className="border-2 border-ink px-3 py-2 text-xs font-bold uppercase tracking-wider">Sign out</button>
        </form>
      </main>
    </div>
  );
}
