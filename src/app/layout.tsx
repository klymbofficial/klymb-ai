import type { Metadata, Viewport } from "next";
import { Analytics } from "@/components/legal/Analytics";
import { CookieBanner } from "@/components/legal/CookieBanner";
import { Archivo } from "next/font/google";
import "./globals.css";

/** Set NEXT_PUBLIC_GA_ID to switch analytics on; unset means no tracking script at all. */
const gaId = process.env.NEXT_PUBLIC_GA_ID;

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"] });

export const metadata: Metadata = {
  title: { default: "Klymb.ai — Become Job-Ready in 30 Days", template: "%s — Klymb.ai" },
  description:
    "A 30-day job-readiness program with five career tracks: QA Engineer, L1/L2 Support, Project Manager, Junior Developer and Reporting Analyst.",
};

export const viewport: Viewport = { themeColor: "#f3f2f2" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} antialiased`}>
      <body className="min-h-screen">
        {children}
        <CookieBanner />
      </body>
      {gaId && <Analytics gaId={gaId} />}
    </html>
  );
}
