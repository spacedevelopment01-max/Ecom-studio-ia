/**
 * Projets de référence du benchmark visuel Theme Engine V2 (phase 10A) — AUCUN appel d'IA :
 *  A artisan    — Sébastien Blanc, plâtrier-peintre (services) : aucune photo authentique disponible → aucune photo ;
 *  B cosmetic   — Sérum Éclat : flacon DESSINÉ localement (visuel de démonstration, pas une photo du produit) ;
 *  C hightech   — Ostral, drone pliable : photos de la démo « drone » du studio (photos réelles d'un fournisseur) ;
 *  D restaurant — Chez Lison (services) : aucune photo authentique disponible → aucune photo ;
 *  E saas       — Nuvia : capture d'interface DESSINÉE localement (données de démonstration).
 * Les médias de démonstration portent `meta.demo` et une note ; ils servent à juger la composition, pas à publier.
 * Mêmes projets et mêmes médias pour l'ancien moteur (AVANT) et le Theme Engine V2 (APRÈS).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { id, now, run } from "@/lib/db";
import { localBrand } from "@/lib/engine/local";
import { emptyProduct } from "@/lib/project-types";
import { saveAsset } from "@/lib/library";
import { seedImageFixture } from "./image-v2-fixtures";

export const THEME_SCENARIOS = ["artisan", "cosmetic", "hightech", "restaurant", "saas"] as const;
export type ThemeScenario = (typeof THEME_SCENARIOS)[number];
export const THEME_SCENARIO_LABEL: Record<ThemeScenario, string> = {
  artisan: "A — Sébastien Blanc, plâtrier-peintre",
  cosmetic: "B — Sérum Éclat, cosmétique premium",
  hightech: "C — Ostral, drone (high-tech)",
  restaurant: "D — Chez Lison, restaurant",
  saas: "E — Nuvia, SaaS",
};

const DEMO = (note: string) => ({ demo: true, demoNote: note });

function seedOstral(userId: string) {
  const product = {
    ...emptyProduct(),
    name: "Ostral",
    nameStatus: "provided",
    category: "Drone pliable à caméra stabilisée",
    sector: "hightech",
    summary: "Drone pliable à caméra stabilisée, pensé pour filmer en voyage.",
    visual: { ...emptyProduct().visual, shape: "drone quadrirotor pliable", colors: [{ hex: "#6B6E73", name: "gris titane", share: 0.7 }] },
    facts: [{ key: "camera", label: "Caméra", value: "stabilisée", status: "confirmed", source: "user" }],
  };
  const { brand, strategy } = localBrand(product as any, "Ostral", { business: "products" } as any);
  const pid = id();
  run(
    "INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, strategy_json, settings_json, sources_json, business_type, business_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    pid, userId, "Ostral", "ready", "shopify", JSON.stringify(product), JSON.stringify({ ...brand, name: "Ostral", personality: ["précis", "aventureux", "sobre"], positioning: "Filmer le voyage sans encombrement.", audience: "Voyageurs et vidéastes amateurs", palette: { primary: "#455773", secondary: "#D4D6D8", accent: "#7874B4", light: "#F2F4F7", dark: "#14181F" } }), JSON.stringify(strategy), JSON.stringify({ language: "fr" }), "[]", "products", "{}", now(), now(),
  );
  return pid;
}

// ---------------------------------------------------------------- médias dessinés localement

/** Flacon compte-gouttes en verre ambré (détouré, fond transparent). */
function bottleSvg(w = 900, h = 1200) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 900 1200">
  <defs>
    <linearGradient id="glass" x1="0" x2="1"><stop offset="0" stop-color="#7A3F12"/><stop offset=".18" stop-color="#C77B30"/><stop offset=".42" stop-color="#E7A35A"/><stop offset=".62" stop-color="#B8692A"/><stop offset="1" stop-color="#5E2E0C"/></linearGradient>
    <linearGradient id="rubber" x1="0" x2="1"><stop offset="0" stop-color="#D9D6D0"/><stop offset=".45" stop-color="#FFFFFF"/><stop offset="1" stop-color="#BDB9B2"/></linearGradient>
    <linearGradient id="collar" x1="0" x2="1"><stop offset="0" stop-color="#E8E4DD"/><stop offset=".5" stop-color="#FFFFFF"/><stop offset="1" stop-color="#CFCAC2"/></linearGradient>
    <linearGradient id="label" x1="0" x2="1"><stop offset="0" stop-color="#EFE6D8"/><stop offset=".5" stop-color="#FBF7F0"/><stop offset="1" stop-color="#E4D9C8"/></linearGradient>
  </defs>
  <path d="M410 70 q40 -40 80 0 v170 h-80z" fill="url(#rubber)"/>
  <rect x="372" y="236" width="156" height="150" rx="14" fill="url(#collar)"/>
  <path d="M300 470 q0 -84 84 -84 h132 q84 0 84 84 v600 q0 60 -60 60 h-180 q-60 0 -60 -60z" fill="url(#glass)"/>
  <rect x="318" y="430" width="22" height="640" rx="11" fill="#FFFFFF" opacity=".28"/>
  <rect x="300" y="610" width="300" height="330" fill="url(#label)"/>
  <text x="450" y="745" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="74" letter-spacing="10" fill="#3A2412">ÉCLAT</text>
  <line x1="390" y1="782" x2="510" y2="782" stroke="#B8692A" stroke-width="3"/>
  <text x="450" y="842" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="30" letter-spacing="6" fill="#5A4030">SÉRUM VISAGE</text>
  <text x="450" y="892" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#5A4030">30 ml</text>
</svg>`;
}

async function cosmeticMedia(userId: string, projectId: string) {
  const cut = await sharp(Buffer.from(bottleSvg())).png().toBuffer();
  await saveAsset({ projectId, userId, data: cut, name: "flacon-detoure.png", mime: "image/png", role: "cutout", folderKey: "product.cutouts", origin: "generated", status: "approved", meta: { best: true, ...DEMO("Flacon dessiné localement (démonstration)") } });
  const bottle = await sharp(Buffer.from(bottleSvg(600, 800))).png().toBuffer();
  const back = (a: string, b: string, w: number, h: number) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><radialGradient id="g" cx=".5" cy=".38" r=".8"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><ellipse cx="${w / 2}" cy="${h * 0.86}" rx="${w * 0.2}" ry="${h * 0.025}" fill="#000" opacity=".16"/></svg>`;
  const pack = await sharp(Buffer.from(back("#F7EFE4", "#E3D3BF", 1400, 1400))).composite([{ input: bottle, top: 410, left: 400 }]).jpeg({ quality: 88 }).toBuffer();
  await saveAsset({ projectId, userId, data: pack, name: "packshot.jpg", mime: "image/jpeg", role: "packshot", folderKey: "images.packshots", origin: "generated", status: "approved", meta: DEMO("Packshot dessiné localement (démonstration)") });
  // Texture du gel : gouttes ambrées sur verre (détail produit de démonstration).
  const drops = Array.from({ length: 16 }, (_, i) => {
    const x = 120 + ((i * 397) % 1180);
    const y = 140 + ((i * 263) % 780);
    const r = 26 + ((i * 37) % 70);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#d)"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.18}" fill="#fff" opacity=".7"/>`;
  }).join("");
  const det = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1050"><defs><radialGradient id="d" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#F6C27F"/><stop offset=".7" stop-color="#C77B30"/><stop offset="1" stop-color="#8A4A15"/></radialGradient><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F3E7D6"/><stop offset="1" stop-color="#D9C3A6"/></linearGradient></defs><rect width="1400" height="1050" fill="url(#b)"/>${drops}</svg>`;
  await saveAsset({ projectId, userId, data: await sharp(Buffer.from(det)).jpeg({ quality: 88 }).toBuffer(), name: "texture-gel.jpg", mime: "image/jpeg", role: "detail", folderKey: "images.details", origin: "generated", status: "approved", meta: DEMO("Texture dessinée localement (démonstration)") });
}

/** Capture d'interface de démonstration (tableau de bord), données fictives signalées dans l'image. */
function dashboardSvg(variant: 0 | 1) {
  const W = 1600;
  const H = 1000;
  const ink = "#0F172A";
  const muted = "#64748B";
  const acc = "#4F46E5";
  const line = Array.from({ length: 12 }, (_, i) => `${300 + i * 80},${620 - Math.round(80 * Math.sin(i * 0.7 + variant) + i * 14)}`).join(" ");
  const bars = Array.from({ length: 8 }, (_, i) => {
    const h = 60 + ((i * 53 + variant * 31) % 150);
    return `<rect x="${1140 + i * 46}" y="${700 - h}" width="28" height="${h}" rx="6" fill="${i === 5 ? acc : "#C7D2FE"}"/>`;
  }).join("");
  const kpi = (x: number, label: string, v: string) => `<g transform="translate(${x},150)"><rect width="300" height="130" rx="18" fill="#fff" stroke="#E2E8F0"/><text x="24" y="44" font-family="Helvetica, Arial" font-size="20" fill="${muted}">${label}</text><text x="24" y="98" font-family="Helvetica, Arial" font-weight="700" font-size="40" fill="${ink}">${v}</text></g>`;
  const rows = Array.from({ length: 4 }, (_, i) => `<g transform="translate(300,${770 + i * 50})"><rect width="${W - 360}" height="40" rx="8" fill="${i % 2 ? "#fff" : "#F8FAFC"}"/><circle cx="24" cy="20" r="8" fill="${["#22C55E", acc, "#F59E0B", "#0EA5E9"][i]}"/><rect x="48" y="14" width="${180 + i * 30}" height="12" rx="6" fill="#CBD5E1"/><rect x="${W - 600}" y="14" width="120" height="12" rx="6" fill="#E2E8F0"/></g>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" rx="22" fill="#F1F5F9"/>
  <rect width="240" height="${H}" fill="${ink}"/>
  <text x="36" y="70" font-family="Helvetica, Arial" font-weight="700" font-size="30" fill="#fff">Nuvia</text>
  ${["Vue d'ensemble", "Ventes", "Clients", "Rapports", "Réglages"].map((t, i) => `<g transform="translate(24,${130 + i * 56})"><rect width="192" height="42" rx="10" fill="${i === variant ? "#1E293B" : "none"}"/><text x="16" y="28" font-family="Helvetica, Arial" font-size="19" fill="${i === variant ? "#fff" : "#94A3B8"}">${t}</text></g>`).join("")}
  <text x="300" y="92" font-family="Helvetica, Arial" font-weight="700" font-size="34" fill="${ink}">${variant ? "Rapport mensuel" : "Vue d'ensemble"}</text>
  <rect x="${W - 380}" y="58" width="320" height="44" rx="22" fill="#EEF2FF"/><text x="${W - 220}" y="87" text-anchor="middle" font-family="Helvetica, Arial" font-size="18" fill="${acc}">Données de démonstration</text>
  ${kpi(300, "Commandes", "1 284")}${kpi(620, "Panier moyen", "62 €")}${kpi(940, "Clients actifs", "348")}${kpi(1260, "Taux de retour", "2,1 %")}
  <rect x="300" y="310" width="800" height="420" rx="18" fill="#fff" stroke="#E2E8F0"/>
  <text x="330" y="356" font-family="Helvetica, Arial" font-size="22" fill="${ink}">Évolution</text>
  <polyline points="${line}" fill="none" stroke="${acc}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
  <rect x="1120" y="310" width="${W - 1180}" height="420" rx="18" fill="#fff" stroke="#E2E8F0"/>
  <text x="1150" y="356" font-family="Helvetica, Arial" font-size="22" fill="${ink}">Par canal</text>${bars}
  ${rows}
</svg>`;
}

async function saasMedia(userId: string, projectId: string) {
  for (const v of [0, 1] as const) {
    const png = await sharp(Buffer.from(dashboardSvg(v))).jpeg({ quality: 90 }).toBuffer();
    await saveAsset({ projectId, userId, data: png, name: `interface-${v + 1}.jpg`, mime: "image/jpeg", role: v ? "scene" : "packshot", folderKey: v ? "images.scenes" : "images.packshots", origin: "generated", status: "approved", meta: DEMO("Capture d'interface dessinée localement, données fictives (démonstration)") });
  }
}

async function droneMedia(userId: string, projectId: string) {
  const dir = path.join(process.cwd(), "public/demo/drone");
  const add = async (file: string, role: string, folderKey: string, mime = "image/jpeg") => {
    let data = fs.readFileSync(path.join(dir, file));
    if (file.endsWith(".webp")) {
      data = await sharp(data).png().toBuffer();
      mime = "image/png";
    }
    await saveAsset({ projectId, userId, data, name: file.replace(/\.webp$/, ".png"), mime, role, folderKey, origin: "upload", status: "approved", meta: { ...(role === "cutout" ? { best: true } : {}), ...DEMO("Photo de la démo « drone » du studio (photo réelle d'un fournisseur, retouchée)") } });
  };
  await add("cutout-1.webp", "cutout", "product.cutouts");
  await add("packshot-1.jpg", "packshot", "images.packshots");
  await add("detail-1.jpg", "detail", "images.details");
  await add("scene-1.jpg", "scene", "images.scenes");
  await add("scene-2.jpg", "scene", "images.scenes");
  await add("banner-1.jpg", "banner", "images.banners");
  await add("logo.svg", "logo", "brand.logos", "image/svg+xml");
}

/** Crée le projet de référence et ses médias de démonstration. */
export async function seedThemeScenario(userId: string, kind: ThemeScenario): Promise<string> {
  if (kind === "hightech") {
    const pid = seedOstral(userId);
    await droneMedia(userId, pid);
    return pid;
  }
  const pid = seedImageFixture(userId, kind);
  if (kind === "cosmetic") await cosmeticMedia(userId, pid);
  if (kind === "saas") await saasMedia(userId, pid);
  return pid;
}
