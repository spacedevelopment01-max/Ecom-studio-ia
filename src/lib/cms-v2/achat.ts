/**
 * CMS Engine V2 — l'achat d'un site monté par SINA hors de Shopify (chantier « plateformes », 16 novembre 2026).
 *
 * Un site monté avec les pièces à tenue arrive ici en version de thème dont chaque pièce est une section
 * « es-custom-… » écrite en Liquid avec les objets de Shopify. Avant ce chantier, WooCommerce et PrestaShop ne
 * reprenaient pas sa fiche produit (fiche native de la plateforme à la place) et ses boutons d'achat ne menaient
 * nulle part. Ce module dit, pour les deux adaptateurs :
 *   - si la fiche produit du site est faite de pièces à tenue (alors elle part, rendue avec le vrai produit) ;
 *   - quelles pièces vont sur quelle fiche (fiche commune, fiche propre à un produit) ;
 *   - les scripts qui partent (le script commun des pièces d'achat et l'adaptateur du contrat « tnBoutique ») ;
 *   - le fichier de données de l'offre (remises par quantité, packs, cadeaux), appliqué par le code livré.
 */
import fs from "node:fs";
import path from "node:path";
import { storeProducts, type SectionInstance, type TemplateJson, type ThemeSpec } from "../theme/spec";
import { offreBoutique, offreDepuisOffres, offreVide, type OffreBoutique } from "../syna-agent/custom-theme/remises";

const SECTIONS_DIR = () => path.join(process.cwd(), "public", "sections");
export const estPieceTenue = (s: SectionInstance | undefined) => !!s && /^es-custom-/.test(s.type);

type Fiche = { /** Sections dans l'ordre, masquées exclues. */ sections: { id: string; section: SectionInstance }[] };
const pieces = (tpl: TemplateJson | undefined): Fiche["sections"] => (tpl?.order ?? []).map((id) => ({ id, section: tpl!.sections[id] })).filter((x) => x.section && !x.section.disabled);

/**
 * Les fiches produit d'un site à tenue : la fiche commune, et la fiche propre à chaque produit qui en a une. Null si
 * la fiche produit du site n'est pas faite de pièces à tenue (ancien thème : la fiche native de la plateforme reste).
 */
export function fichesTenue(spec: ThemeSpec): { commune: Fiche; propres: { handle: string; fiche: Fiche }[] } | null {
  if (spec.store.business === "services") return null;
  const commune = pieces(spec.templates.product);
  if (!commune.length || !commune.every((x) => estPieceTenue(x.section))) return null;
  const propres: { handle: string; fiche: Fiche }[] = [];
  for (const p of storeProducts(spec)) {
    const own = p.template_suffix ? pieces(spec.templates[`product.${p.template_suffix}`]) : [];
    if (own.length && own.every((x) => estPieceTenue(x.section))) propres.push({ handle: p.handle, fiche: { sections: own } });
  }
  return { commune: { sections: commune }, propres };
}

/** Le site a-t-il des pièces à tenue (n'importe où) ? Alors le script commun et l'adaptateur du panier partent. */
export function aDesPiecesTenue(spec: ThemeSpec): boolean {
  return [...Object.values(spec.templates), ...Object.values(spec.groups)].some((c) => Object.values(c?.sections ?? {}).some((s) => estPieceTenue(s)));
}

/**
 * Règles ajoutées à la feuille d'une boutique WooCommerce ou PrestaShop. La barre d'achat : dans l'aperçu du Studio,
 * elle attend un réglage de l'aperçu et son script de défilement ; dans une boutique, dès que le script commun l'a
 * montrée (son bouton achète pour de vrai), elle RESTE VISIBLE en bas de l'écran, et la page lui laisse sa place.
 */
export const FEUILLE_ACHAT = `/* Achat d'un site monté par SINA : la barre d'achat reste visible en bas de l'écran. */
html .ctw .tn-achat>.tn-barre:not([hidden]){display:flex;transform:none}
body:has(.ctw .tn-achat>.tn-barre:not([hidden])){padding-bottom:78px}
.ctw .tn form.tn-packs-f input[type="hidden"]{display:none}
`;

/** Scripts de l'achat pour une plateforme : le script commun du Studio et l'adaptateur du contrat « tnBoutique ». */
export function scriptsAchat(platform: "woocommerce" | "prestashop"): { commun: string | null; adaptateur: string } {
  const read = (f: string) => { try { return fs.readFileSync(path.join(SECTIONS_DIR(), f), "utf8"); } catch { return null; } };
  const adaptateur = read(`boutique-${platform}.js`);
  if (!adaptateur) throw new Error(`Adaptateur du panier absent : public/sections/boutique-${platform}.js`);
  return { commun: read("tenue-achat.js"), adaptateur };
}

/** Une pièce prête pour le moteur PHP : « all_products['mon-produit'] » → « all_products.mon-produit », sans les scripts de Shopify. */
export const accesParAdresse = (liquid: string): string => liquid
  .replace(/\b(all_products|collections)\['([a-z0-9][a-z0-9-]*)'\]/g, "$1.$2")
  // Scripts que la pièce appelle pour Shopify (son adaptateur du panier, le script commun) : hors de Shopify, le thème
  // exporté charge lui-même le script commun et l'adaptateur de SA plateforme ; jamais celui de Shopify.
  .replace(/<script src="\{\{-?\s*'(?:boutique-[a-z]+|tenue-achat)\.js'\s*\|\s*asset_url\s*-?\}\}"[^>]*><\/script>/g, "");

/**
 * Adresses d'une pièce pour WordPress : dans Shopify, « {{ routes.root_url }}pages/contact » ; ici, « /pages/contact »,
 * que le thème WordPress sait mener à la bonne page (es_url).
 */
export function pieceHorsShopify(liquid: string): string {
  return accesParAdresse(liquid)
    .replace(/\{\{-?\s*routes\.root_url\s*-?\}\}(?=[a-z])/g, "/")
    .replace(/\{\{-?\s*routes\.collections_url\s*-?\}\}\//g, "/collections/");
}

/**
 * Une pièce « vivante » lit la boutique à l'affichage (prix, stock, produits, formulaire d'achat) : elle ne peut pas
 * être figée dans une page. Dans PrestaShop, où les pages du site sont rendues par le Studio, ces pièces-là sont
 * rendues par le module, avec les vraies données.
 */
export const pieceVivante = (liquid: string): boolean => /\{%-?\s*form\s+'product'|\ball_products\b|\bcollections?\.[a-z_]+\.products\b|\bcollections\[|\bproduct\.(?:price|variants|selected_or_first_available_variant|available)\b/.test(liquid);

/**
 * L'offre du projet, d'après ce que le client a saisi dans le Studio (lots dégressifs, packs). Sans projet ni offre :
 * null (rien ne part, aucun prix de lot ne s'affiche).
 */
export async function offreDuProjet(projectId: string | undefined, spec: ThemeSpec): Promise<OffreBoutique | null> {
  if (!projectId || spec.store.business === "services") return null;
  try {
    const saisies = (await import("../syna-agent/product-features")).loadShopOffers(projectId);
    const { offre } = offreDepuisOffres(saisies, storeProducts(spec).map((p) => ({ handle: p.handle, titre: p.title, centimes: p.variants[0]?.price ?? p.price })), storeProducts(spec)[0]?.currency || "EUR");
    return offreVide(offre) ? null : offre;
  } catch { return null; }
}

/** Offre donnée à l'export : gardée seulement pour les produits du catalogue exporté (une règle sans produit ne tient pas). */
export function offrePourExport(offre: OffreBoutique | null | undefined, spec: ThemeSpec): { offre: OffreBoutique | null; ecartes: string[] } {
  if (offreVide(offre)) return { offre: null, ecartes: [] };
  const handles = new Set(storeProducts(spec).map((p) => p.handle));
  const ecartes: string[] = [];
  const produits = Object.entries(offre!.produits).filter(([h, r]) => {
    if (!handles.has(h)) { ecartes.push(`produit « ${h} » absent du catalogue`); return false; }
    for (const c of r.cadeaux) if (!handles.has(c.handle)) { ecartes.push(`cadeau « ${c.handle} » absent du catalogue`); return false; }
    return true;
  });
  if (!produits.length) return { offre: null, ecartes };
  // Mêmes règles, empreinte recalculée sur ce qui part vraiment.
  const out = offreBoutique({ devise: offre!.devise, produits: produits.map(([handle, r]) => ({ handle, lots: r.lots, packs: r.packs })) });
  return { offre: out, ecartes };
}
