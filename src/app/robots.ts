import type { MetadataRoute } from "next";
import { site } from "@/data/config";

/** Index the public site; keep the signed-in areas and the API out of search. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/learn", "/api/"] }],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
