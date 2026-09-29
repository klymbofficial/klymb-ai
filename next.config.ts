import type { NextConfig } from "next";
import { site } from "./src/data/config";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy.
 *
 * Every allowance below exists because something on the site needs it:
 *   googletagmanager.com        Google Analytics 4 script
 *   google-analytics.com        GA4 measurement beacons
 *   *.analytics.google.com      GA4 regional collection endpoints
 *   accounts.google.com         Google sign-in redirect and form post
 *   *.supabase.co               database reads and writes from the server
 *   i.ytimg.com                 YouTube thumbnails on learner day pages
 *   *.googleusercontent.com     Google profile images on signed-in accounts
 *   *.razorpay.com              Razorpay Checkout: its script, its payment frame and its API
 *
 * 'unsafe-inline' on script-src is required by Next.js, which inlines a small
 * bootstrap and the flight payload; a nonce would mean giving up static
 * rendering everywhere. 'unsafe-eval' is development only — React Refresh
 * needs it, production does not.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://checkout.razorpay.com https://cdn.razorpay.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://i.ytimg.com https://*.googleusercontent.com https://www.googletagmanager.com https://www.google-analytics.com https://*.razorpay.com",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    "https://*.supabase.co",
    "https://www.google-analytics.com",
    "https://*.analytics.google.com",
    "https://*.googletagmanager.com",
    "https://stats.g.doubleclick.net",
    "https://*.razorpay.com",
    isDev ? "ws: http://localhost:*" : "",
  ]
    .filter(Boolean)
    .join(" "),
  "frame-src 'self' https://accounts.google.com https://api.razorpay.com https://checkout.razorpay.com",
  // Clickjacking: nothing may embed this site.
  "frame-ancestors 'none'",
  "base-uri 'self'",
  // Sign-in posts to Google; nothing else may be a form target.
  "form-action 'self' https://accounts.google.com",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Legacy equivalent of frame-ancestors, for older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    // YouTube thumbnails for the day pages' reference resources.
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com" }],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  /**
   * One address for the site. The Vercel alias still served everything, so a
   * visitor could be signed in on one host and not the other, and search
   * engines saw two copies. Matching the exact alias leaves preview
   * deployments (which have their own hostnames) alone.
   */
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: site.vercelAlias }],
        destination: `${site.url}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
