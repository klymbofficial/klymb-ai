import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOutOfSales } from "@/app/sales/actions";
import { Wordmark } from "@/components/layout/Wordmark";
import { requireSalesUser } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Sales", robots: { index: false, follow: false } };

/**
 * The interns' side of Sales: only their own leads, nothing else from admin.
 * Owners work in /admin/sales, so they are sent there.
 */
export default async function RepLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSalesUser();
  if (user.role === "owner") redirect("/admin/sales");

  return (
    <div className="min-h-dvh bg-surface">
      <header className="bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-baseline gap-3">
            <Wordmark className="text-lg text-paper" />
            <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/50">Sales</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-white/70 sm:inline">{user.name ?? user.email}</span>
            <form action={signOutOfSales}>
              <button type="submit" className="border border-white/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-white/10">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
