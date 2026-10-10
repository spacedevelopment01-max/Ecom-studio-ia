/**
 * Fixtures du Brand & Logo Engine V2 (phase 4A) : cinq catégories de marques, pour vérifier que le moteur n'a pas
 * une esthétique unique. Utilisées par les tests (IA simulée) et par scripts/benchmark-logo-v2.ts (vraies API).
 */
import { id, now, run } from "@/lib/db";
import { localBrand } from "@/lib/engine/local";
import { emptyProduct } from "@/lib/project-types";
import { seedSebastienBlanc, seedSerumEclat } from "./brain-fixtures";

export const LOGO_FIXTURES = ["artisan", "cosmetic", "saas", "restaurant", "product"] as const;
export type LogoFixture = (typeof LOGO_FIXTURES)[number];

function insert(userId: string, business: "services" | "products", product: any, services: any, brandPatch: Record<string, unknown>) {
  const { brand, strategy } = localBrand(product, product.name, { business, services } as any);
  const pid = id();
  run(
    "INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, strategy_json, settings_json, sources_json, business_type, business_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    pid, userId, product.name, "ready", "shopify", JSON.stringify(product), JSON.stringify({ ...brand, ...brandPatch }), JSON.stringify(strategy), JSON.stringify({ language: "fr" }), "[]", business, JSON.stringify(services ?? {}), now(), now(),
  );
  return pid;
}

/** Projet d'une catégorie de benchmark (nom clairement identifié). */
export function seedLogoFixture(userId: string, kind: LogoFixture): string {
  const brandPatch = (personality: string[], positioning: string, audience: string) => ({ personality, positioning, audience });
  switch (kind) {
    case "artisan": {
      const pid = seedSebastienBlanc(userId);
      run("UPDATE projects SET brand_json = json_set(brand_json, '$.personality', json(?), '$.positioning', ?, '$.audience', ?) WHERE id = ?", JSON.stringify(["précis", "artisan", "fiable"]), "Finitions intérieures soignées, du plâtre à la peinture, pour des intérieurs nets.", "Particuliers qui rénovent leur logement autour de Mâcon", pid);
      return pid;
    }
    case "cosmetic": {
      const pid = seedSerumEclat(userId);
      run("UPDATE projects SET brand_json = json_set(brand_json, '$.personality', json(?), '$.positioning', ?, '$.audience', ?) WHERE id = ?", JSON.stringify(["premium", "raffiné", "épuré"]), "Soin visage à la vitamine C, formule courte, gestes simples.", "Femmes actives attentives aux formules", pid);
      return pid;
    }
    case "saas":
      return insert(userId, "products", { ...emptyProduct(), name: "Nuvia", nameStatus: "provided", category: "Logiciel d'analyse de données", sector: "hightech", summary: "Tableaux de bord qui rendent les données d'une PME lisibles en temps réel." }, null, brandPatch(["précis", "moderne", "digital"], "L'analyse de données claire pour les PME, sans data scientist.", "Dirigeants de PME"));
    case "restaurant":
      return insert(userId, "services", { ...emptyProduct(), name: "Chez Lison", nameStatus: "provided", category: "Bistrot de quartier", sector: "alimentation", summary: "Cuisine de marché, plats du jour et vins nature." }, { services: [{ name: "Déjeuner du jour" }, { name: "Dîner" }], area: "Lyon 4e", contactMode: "call" }, brandPatch(["chaleureux", "convivial", "gourmand"], "Le bistrot de quartier où l'on revient pour la cuisine de marché.", "Habitants et travailleurs du quartier"));
    case "product":
      return insert(userId, "products", { ...emptyProduct(), name: "Atlas Gourde", nameStatus: "provided", category: "Gourde isotherme", sector: "sport", summary: "Gourde isotherme en acier, 24 h au froid, bouchon une main." }, null, brandPatch(["robuste", "aventurier", "direct"], "La gourde qui suit partout, du bureau au sommet.", "Randonneurs et actifs urbains"));
  }
}

/**
 * Logos complets d'essai (sans IA) : dessins DISTINCTS et travaillés (anneau, maison au trait, losange deux tons,
 * courbe), jamais une simple forme pleine, avec le nom en barre sombre (#222) dessous. Un dessin par direction : une
 * série de 3 n'est jamais faite de 3 copies.
 */
export async function artFixture(variant: number, size = 1024): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const k = size / 1024;
  const marks = [
    `<circle cx="512" cy="380" r="220" fill="#8A3B26"/><circle cx="512" cy="380" r="110" fill="#FFFFFF"/>`,
    `<path d="M300 520 L300 330 L512 170 L724 330 L724 520 Z" fill="none" stroke="#446274" stroke-width="44" stroke-linejoin="round"/><rect x="470" y="400" width="84" height="120" fill="#446274"/>`,
    `<path d="M512 150 L740 380 L512 610 Z" fill="#2B5D8A"/><path d="M512 150 L284 380 L512 610 Z" fill="#C8A27A"/>`,
    `<path d="M640 200 C460 140 340 260 470 360 C600 460 520 600 360 560" fill="none" stroke="#5B3A8A" stroke-width="60" stroke-linecap="round"/>`,
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#FFFFFF"/>${marks[variant % marks.length]}<rect x="262" y="700" width="500" height="90" fill="#222222"/></svg>`;
  return sharp(Buffer.from(svg)).resize(Math.round(1024 * k)).png().toBuffer();
}
