import type { MetadataRoute } from "next";
import { site } from "@/data/config";

/** Index the public site; keep the signed-in areas and the API out of search. */
export default function robots(): MetadataRoute.Robots {
  return {
    // The System Design course page is public (its outline is in the HTML); the rest of /learn is signed-in.
    // OpenAI's search, ads and user-fetch bots are named outright so ChatGPT's checks see them allowed; same paths as everyone.
    rules: [{ userAgent: ["*", "OAI-SearchBot", "OAI-AdsBot", "ChatGPT-User"], allow: ["/", "/learn/system-design"], disallow: ["/admin", "/learn", "/api/"] }],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
