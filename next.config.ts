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
    // Theme Check (contrôle des exports Shopify) lit ses fichiers de configuration à côté de son code : il ne doit
    // pas être empaqueté par Next (sinon « configs/recommended.yml » introuvable et export en erreur).
    "@shopify/theme-check-node",
    "@shopify/theme-check-common",
    "@shopify/theme-check-docs-updater",
    "@shopify/theme-graph",
    "@shopify/liquid-html-parser",
  ],
  images: { unoptimized: true },
  // Développement : une route compilée reste prête 30 min (60 s par défaut). Sinon, revenir sur un onglet du studio
  // recompilait ~4 400 modules (2 à 5 s, et jusqu'à 3 fois la même route en 6 min, mesuré).
  onDemandEntries: { maxInactiveAge: 30 * 60_000, pagesBufferLength: 60 },
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "60mb" } },
};

export default nextConfig;
