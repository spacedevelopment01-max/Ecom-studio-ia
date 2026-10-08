/**
 * Scénarios du benchmark Image & Search V2 (phase 5A) : utilisés par les tests (fournisseurs simulés) et par
 * scripts/benchmark-image-v2.ts (vraies API, dans le Codespace du propriétaire, plus tard).
 *  A — Sébastien Blanc, plâtrier-peintre : photos du métier, murs nus et textures rejetés ;
 *  B — cosmétique premium : packshot, lifestyle, univers premium, fidélité au produit ;
 *  C — high-tech : produit réel, éclairage maîtrisé, environnement technologique ;
 *  D — restaurant : photographie culinaire, ambiance, cohérence avec l'établissement ;
 *  E — SaaS : visuels numériques, composition éditoriale, cohérence graphique.
 * Aucun traitement propre à un scénario dans le moteur : les fixtures ne sont que des projets.
 */
import sharp from "sharp";
import { id, now, run } from "@/lib/db";
import { localBrand } from "@/lib/engine/local";
import { emptyProduct } from "@/lib/project-types";
import { saveAsset } from "@/lib/library";
import { seedSebastienBlanc, seedSerumEclat } from "./brain-fixtures";
import type { ImageRequestV2 } from "@/lib/image-v2/engine";

export const IMAGE_FIXTURES = ["artisan", "cosmetic", "hightech", "restaurant", "saas"] as const;
export type ImageFixture = (typeof IMAGE_FIXTURES)[number];

function insert(userId: string, business: "services" | "products", product: any, services: any, brandPatch: Record<string, unknown>) {
  const { brand, strategy } = localBrand(product, product.name, { business, services } as any);
  const pid = id();
  run(
    "INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, strategy_json, settings_json, sources_json, business_type, business_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    pid, userId, product.name, "ready", "shopify", JSON.stringify(product), JSON.stringify({ ...brand, ...brandPatch }), JSON.stringify(strategy), JSON.stringify({ language: "fr" }), "[]", business, JSON.stringify(services ?? {}), now(), now(),
  );
  return pid;
}

/** Détourage de référence simulé (PNG transparent : un objet coloré au centre). */
export async function seedCutout(userId: string, projectId: string, color = "#C77B30"): Promise<string> {
  const W = 600;
  const H = 900;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="170" y="120" width="260" height="700" rx="60" fill="${color}"/><rect x="250" y="40" width="100" height="100" fill="#ffffff"/></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const a = await saveAsset({ projectId, userId, data: png, name: "detourage.png", mime: "image/png", role: "cutout", folderKey: "product.cutouts", origin: "generated", status: "approved", meta: { best: true } });
  return a.id;
}

export function seedImageFixture(userId: string, kind: ImageFixture): string {
  const brandPatch = (personality: string[], positioning: string, audience: string) => ({ personality, positioning, audience });
  switch (kind) {
    case "artisan":
      return seedSebastienBlanc(userId);
    case "cosmetic": {
      const pid = seedSerumEclat(userId);
      run("UPDATE projects SET brand_json = json_set(brand_json, '$.personality', json(?), '$.positioning', ?) WHERE id = ?", JSON.stringify(["premium", "raffiné", "épuré"]), "Soin visage haut de gamme à la vitamine C.", pid);
      return pid;
    }
    case "hightech":
      return insert(
        userId,
        "products",
        { ...emptyProduct(), name: "Onde Pro", nameStatus: "provided", category: "Casque audio sans fil", sector: "hightech", summary: "Casque Bluetooth à réduction de bruit, 30 h d'autonomie.", visual: { ...emptyProduct().visual, shape: "casque arceau", colors: [{ hex: "#1E1F22", name: "noir mat", share: 0.7 }], hasLogo: true, labelText: ["ONDE"] }, facts: [{ key: "battery", label: "Autonomie", value: "30 h", status: "confirmed", source: "user" }] },
        null,
        brandPatch(["précis", "moderne", "sobre"], "Le son net, sans fioritures.", "Actifs urbains et télétravailleurs"),
      );
    case "restaurant":
      return insert(
        userId,
        "services",
        { ...emptyProduct(), name: "Chez Lison", nameStatus: "provided", category: "Restaurant bistrot", sector: "restauration", summary: "Cuisine de marché, plats du jour et vins nature." },
        { services: [{ name: "Déjeuner du jour" }, { name: "Dîner" }], area: "Lyon 4e", contactMode: "call" },
        brandPatch(["chaleureux", "convivial", "gourmand"], "Le bistrot de quartier où l'on revient pour la cuisine de marché.", "Habitants et travailleurs du quartier"),
      );
    case "saas":
      return insert(
        userId,
        "products",
        { ...emptyProduct(), name: "Nuvia", nameStatus: "provided", category: "Logiciel SaaS d'analyse de données", sector: "hightech", summary: "Tableaux de bord qui rendent les données d'une PME lisibles en temps réel." },
        null,
        brandPatch(["précis", "moderne", "clair"], "L'analyse de données claire pour les PME.", "Dirigeants de PME"),
      );
  }
}

/** Demandes du benchmark par scénario (images UTILES au scénario, rien d'autre). */
export function fixtureRequests(kind: ImageFixture, cutoutId?: string | null): ImageRequestV2[] {
  switch (kind) {
    case "artisan":
      return [
        { kind: "trade_photo", support: "site", aspect: "16:9", count: 2, allowGenerate: false, name: "metier" },
        { kind: "trade_photo", support: "service_page", aspect: "4:5", service: { name: "Enduits et lissage" }, allowGenerate: false, name: "enduits" },
      ];
    case "cosmetic":
      return [
        { kind: "packshot", support: "product_page", aspect: "1:1", references: cutoutId ? [cutoutId] : [], name: "packshot" },
        { kind: "lifestyle", support: "site", aspect: "4:5", references: cutoutId ? [cutoutId] : [], name: "lifestyle" },
        { kind: "ambiance", support: "site", aspect: "16:9", allowGenerate: false, name: "univers" },
      ];
    case "hightech":
      return [
        { kind: "product_image", support: "product_page", aspect: "1:1", references: cutoutId ? [cutoutId] : [], name: "produit" },
        { kind: "ambiance", support: "banner", aspect: "3:1", allowGenerate: false, name: "univers-tech" },
      ];
    case "restaurant":
      return [{ kind: "trade_photo", support: "site", aspect: "16:9", count: 2, allowGenerate: false, name: "cuisine" }];
    case "saas":
      return [{ kind: "site_image", support: "site", aspect: "16:9", count: 2, allowGenerate: false, name: "editorial" }];
  }
}
