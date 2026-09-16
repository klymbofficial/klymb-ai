import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // YouTube thumbnails for the day pages' reference resources.
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com" }],
  },
  /* config options here */
};

export default nextConfig;
