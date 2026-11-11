import { CookieBanner } from "@/components/legal/CookieBanner";

/**
 * The homepage brings its own pill nav, footer and floating buttons
 * (components/landing), so it sits outside the (site) layout: no
 * announcement bar, site header or site footer here.
 */
export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      {children}
      <CookieBanner />
    </>
  );
}
