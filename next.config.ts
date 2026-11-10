import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The downloaded catalog (static data mode) is read from disk by server code; ship it with
  // every server function.
  outputFileTracingIncludes: {
    "/**": ["./catalog/catalog.json.gz"],
  },
  images: {
    // Card art, set logos and symbols already come web-sized (WebP) from TCGdex's CDN. Serving
    // them directly keeps the site within free hosting limits (no per-image optimization).
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.tcgdex.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.pokemontcg.io",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        // One canonical address: favorites, their cookie copy and backups are tied to the exact
        // host, so www must not become a second, separate copy of the site.
        source: "/:path*",
        has: [{ type: "host", value: "www.podexcards.com" }],
        destination: "https://podexcards.com/:path*",
        permanent: true,
      },
      // podex.dk (and www) forward to the one canonical address.
      ...["podex.dk", "www.podex.dk"].map((host) => ({
        source: "/:path*",
        has: [{ type: "host" as const, value: host }],
        destination: "https://podexcards.com/:path*",
        permanent: true,
      })),
    ];
  },
  async headers() {
    return [
      {
        // Always fetch the latest service worker; never let a stale one control the app.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
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
