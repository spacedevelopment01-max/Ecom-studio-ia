import {execFileSync} from "node:child_process";
import type { NextConfig } from "next";

// Version du code compilé, jamais le HEAD mouvant d’un serveur déjà démarré.
const buildCommit=(()=>{try{return execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();}catch{return process.env.GITHUB_SHA??"";}})();
// Fichiers suivis modifiés au même moment (les fichiers non suivis, comme les kits privés, ne comptent pas) : « unknown » sans git.
const buildTree=(()=>{try{return execFileSync("git",["status","--porcelain","--untracked-files=no"],{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim()?"modified":"clean";}catch{return "unknown";}})();
const nextConfig: NextConfig = {
  // Vitrine statique GitHub Pages (scripts/pages-snapshot.mjs) : publiée sous /<dépôt>, construite à part.
  ...(process.env.PAGES_BASE_PATH ? { basePath: process.env.PAGES_BASE_PATH, distDir: ".next-pages" } : {}),
  // Vitrine statique : le sélecteur de langue change de page (/ ↔ /en/) au lieu de recharger depuis le serveur.
  env: { STUDIO_BUILD_COMMIT:/^[0-9a-f]{40}$/.test(buildCommit)?buildCommit:"", STUDIO_BUILD_TREE:buildTree, NEXT_PUBLIC_STATIC_PAGES: process.env.PAGES_BASE_PATH ?? "" },
  serverExternalPackages: [
    "better-sqlite3",
    "sharp",
    "@napi-rs/canvas",
    "@imgly/background-removal-node",
    "onnxruntime-node",
    "liquidjs",
    "playwright",
    "nodemailer",
    // Composition musicale (vrais instruments enregistrés, banque GeneralUser GS lue sur le disque).
    "spessasynth_core",
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
  // Production : chaque route est chargée à sa première visite, pas toutes au démarrage (sinon sharp, canvas,
  // Playwright et le contrôle des thèmes occupent la mémoire du site avant la moindre requête — mesuré 365 Mo au
  // démarrage). Important dans un Codespace de 8 Go.
  experimental: { serverActions: { bodySizeLimit: "60mb" }, preloadEntriesOnStart: false },
};

export default nextConfig;
