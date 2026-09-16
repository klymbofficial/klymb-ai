import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <a href="#learn-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <div id="learn-main">{children}</div>
    </div>
  );
}
