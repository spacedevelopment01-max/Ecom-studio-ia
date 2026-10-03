import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vitrine statique GitHub Pages (scripts/pages-snapshot.mjs) : publiée sous /<dépôt>, construite à part.
  ...(process.env.PAGES_BASE_PATH ? { basePath: process.env.PAGES_BASE_PATH, distDir: ".next-pages" } : {}),
  serverExternalPackages: [
    "better-sqlite3",
    "sharp",
    "@napi-rs/canvas",
    "@imgly/background-removal-node",
    "onnxruntime-node",
    "liquidjs",
    "playwright",
  ],
  images: { unoptimized: true },
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "60mb" } },
};

export default nextConfig;
