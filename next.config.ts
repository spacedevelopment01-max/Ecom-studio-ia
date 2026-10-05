import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vitrine statique GitHub Pages (scripts/pages-snapshot.mjs) : publiée sous /<dépôt>, construite à part.
  ...(process.env.PAGES_BASE_PATH ? { basePath: process.env.PAGES_BASE_PATH, distDir: ".next-pages" } : {}),
  // Vitrine statique : le sélecteur de langue change de page (/ ↔ /en/) au lieu de recharger depuis le serveur.
  env: { NEXT_PUBLIC_STATIC_PAGES: process.env.PAGES_BASE_PATH ?? "" },
  serverExternalPackages: [
    "better-sqlite3",
    "sharp",
    "@napi-rs/canvas",
    "@imgly/background-removal-node",
    "onnxruntime-node",
    "liquidjs",
    "playwright",
    "nodemailer",
  ],
  images: { unoptimized: true },
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "60mb" } },
};

export default nextConfig;
