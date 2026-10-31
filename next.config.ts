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
 *   *.r2.cloudflarestorage.com  System Design videos, played from signed R2 links
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
  // Any https image: company logos are links an admin pastes from the
  // company's own site (/admin/companies), so the hosts can't be listed.
  // Images can't run code; scripts, frames and connections stay locked to
  // the hosts named here.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' https://*.r2.cloudflarestorage.com",
  [
    "connect-src 'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://www.google-analytics.com",
    "https://*.analytics.google.com",
    "https://*.googletagmanager.com",
    "https://stats.g.doubleclick.net",
    "https://*.razorpay.com",
    isDev ? "ws: http://localhost:*" : "",
    // Nothing for the voice coach: the browser posts its WebRTC offer to
    // /api/coach/session on this origin, and the media connection that
    // follows is not a fetch, so no CSP directive governs it.
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
  // Production is HTTPS already; on http://localhost it would break same-origin redirects.
  isDev ? "" : "upgrade-insecure-requests",
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Legacy equivalent of frame-ancestors, for older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  {
    /**
     * The microphone is open to this origin alone, for the voice coach
     * (/learn/coach). It cannot be scoped to that one path: a second
     * Permissions-Policy header does not replace the first, the two are
     * intersected, so a closed global policy would keep the coach muted
     * however the page is served. What still stands between a script and the
     * microphone is the browser's own permission prompt, frame-ancestors
     * 'none' and the script-src above — nothing third-party runs here.
     */
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // YouTube thumbnails for the day pages' reference resources.
      { protocol: "https", hostname: "i.ytimg.com" },
      // Google profile images for signed-in learners.
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The service worker must always be re-checked, or an old one outlives a deploy.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
    ];
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
