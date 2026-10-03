import type { MetadataRoute } from "next";

/** Lets Klymb.ai be installed to a home screen and opened like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Klymb.ai: Job-ready in 30 days",
    short_name: "Klymb.ai",
    description: "Your 30-day cohort: one real workplace problem a day, available offline.",
    start_url: "/learn",
    scope: "/",
    display: "standalone",
    background_color: "#f2f2f2",
    theme_color: "#83050b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
