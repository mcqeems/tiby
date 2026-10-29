import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Next 16 only allows the `qualities` listed here (default `[75]`), and
  // `priority` is now `preload`. Neither is overridden today; add a list here
  // before using `quality={...}` on an Image.
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
