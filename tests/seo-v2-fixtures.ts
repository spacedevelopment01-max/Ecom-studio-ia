/**
 * Scénarios du benchmark SEO V2 (phase 8A) : utilisés par les tests (fournisseurs simulés) et par
 * scripts/benchmark-seo-v2.ts (vrais fournisseurs, plus tard, dans le Codespace du propriétaire).
 *  A — Sébastien Blanc, plâtrier-peintre : accueil, prestations, article ;
 *  B — cosmétique premium : fiche produit, article ;
 *  C — high-tech : fiche produit, FAQ ;
 *  D — restaurant : accueil, page de prestation ;
 *  E — SaaS : fiche produit, page « À propos ».
 * Les projets sont ceux du benchmark Image V2 ; aucun traitement propre à un scénario dans le moteur.
 */
import type { ImageFixture } from "./image-v2-fixtures";
import type { ContentType } from "@/lib/seo-v2/types";

export const SEO_SCENARIOS = ["A", "B", "C", "D", "E"] as const;
export type SeoScenario = (typeof SEO_SCENARIOS)[number];

export const SEO_FIXTURE: Record<SeoScenario, ImageFixture> = { A: "artisan", B: "cosmetic", C: "hightech", D: "restaurant", E: "saas" };

export const SEO_TYPES: Record<SeoScenario, ContentType[]> = {
  A: ["home_page", "service_page", "blog_article"],
  B: ["product_page", "blog_article"],
  C: ["product_page", "faq"],
  D: ["home_page", "service_page"],
  E: ["product_page", "brand_page"],
};

export function seoScenarioOf(x: string): SeoScenario | null {
  const up = x.toUpperCase();
  if ((SEO_SCENARIOS as readonly string[]).includes(up)) return up as SeoScenario;
  const hit = (Object.entries(SEO_FIXTURE) as [SeoScenario, ImageFixture][]).find(([, f]) => f === x.toLowerCase());
  return hit ? hit[0] : null;
}
