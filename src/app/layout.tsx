import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@/components/legal/Analytics";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SupportBot } from "@/components/support/SupportBot";
import { preload } from "react-dom";
import { site } from "@/data/config";
import "./fonts.css";
import "./globals.css";

/** Set NEXT_PUBLIC_GA_ID to switch analytics on; unset means no tracking script at all. */
const gaId = process.env.NEXT_PUBLIC_GA_ID;

/**
 * The latin files of both fonts, preloaded as next/font/google did. The
 * fonts themselves are declared in ./fonts.css, served from public/fonts.
 */
const PRELOAD_FONTS = ["/fonts/archivo-v25-latin.woff2", "/fonts/inter-v20-latin.woff2"];

const description =
  "A 30-day job-readiness program with five career tracks: QA Engineer, L1/L2 Support, Project Manager, Junior Developer and Reporting Analyst.";

export const metadata: Metadata = {
  // Makes every relative URL in metadata, the preview image above all, absolute on the real domain.
  metadataBase: new URL(site.url),
  title: { default: "Klymb.ai | Become Job-Ready in 30 Days", template: "%s | Klymb.ai" },
  description,
  applicationName: "Klymb.ai",
  openGraph: {
    type: "website",
    siteName: "Klymb.ai",
    locale: "en_IN",
    title: "Klymb.ai | Become Job-Ready in 30 Days",
    description,
  },
  twitter: {
    card: "summary_large_image",
    site: "@KlymbAI",
    title: "Klymb.ai | Become Job-Ready in 30 Days",
    description,
  },
};

export const viewport: Viewport = { themeColor: "#f3f2f2" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  for (const href of PRELOAD_FONTS) preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen">
        {children}
        <ServiceWorkerRegister />
        {/* Kamran's help, on the public site and the learner app (hidden in admin). */}
        <SupportBot />
        {/* Cookieless, first-party (/_vercel/*): live visitors and real-user page speed in the Vercel dashboard. */}
        <VercelAnalytics />
        <SpeedInsights />
      </body>
      {gaId && <Analytics gaId={gaId} />}
    </html>
  );
}
