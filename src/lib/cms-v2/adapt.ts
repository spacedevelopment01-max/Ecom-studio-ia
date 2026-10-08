/**
 * Adaptations de CONTENU propres à une plateforme, appliquées à une copie du ThemeSpec avant l'adaptateur (le projet
 * n'est jamais modifié) : les consignes « à compléter » qui nomment Shopify désignent l'écran de la plateforme cible.
 */
import type { ThemeSpec } from "../theme/spec";
import type { CmsPlatform } from "./types";

const WHERE: Record<CmsPlatform, { fr: string; en: string }> = {
  shopify: { fr: "dans Shopify : Paramètres › Politiques", en: "in Shopify: Settings › Policies" },
  woocommerce: { fr: "dans WordPress : Pages › modifier cette page", en: "in WordPress: Pages › edit this page" },
  prestashop: { fr: "dans le thème : fichier de cette page (module esstudio) ou nouvelle exportation", en: "in the theme: this page's file (esstudio module) or a new export" },
  wix: { fr: "dans l'éditeur Wix", en: "in the Wix editor" },
  squarespace: { fr: "dans l'éditeur Squarespace", en: "in the Squarespace editor" },
};

export function adaptForPlatform(spec: ThemeSpec, platform: CmsPlatform): ThemeSpec {
  if (platform === "shopify") return spec;
  const out = structuredClone(spec);
  for (const p of out.store.policies ?? []) {
    p.body_html = p.body_html
      .replace(/\[À compléter dans Shopify : Paramètres › Politiques\]/g, `[À compléter ${WHERE[platform].fr}]`)
      .replace(/\[To complete in Shopify: Settings › Policies\]/g, `[To complete ${WHERE[platform].en}]`);
  }
  return out;
}
