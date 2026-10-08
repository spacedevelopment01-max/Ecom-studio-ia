/**
 * Visual Intent (Image V2) : quelle image est demandée, et donc quelle partie de la chaîne est utile.
 * Déterministe : une demande claire n'appelle aucune IA pour être comprise. Une demande simple (détourage, recadrage,
 * déclinaison d'une image existante) ne déclenche pas la recherche ni la génération.
 */
import type { VisualKind, Support } from "./types";

export type Stage = "reuse" | "search" | "generate" | "edit" | "cutout" | "frame";

/** Étapes utiles par intention (dans l'ordre). La génération n'est qu'un dernier recours pour les photos du métier. */
export const PIPELINE: Record<VisualKind, Stage[]> = {
  stock_photo: ["reuse", "search"],
  trade_photo: ["reuse", "search", "generate"],
  ambiance: ["reuse", "search", "generate"],
  site_image: ["reuse", "search", "generate"],
  social_image: ["reuse", "search", "generate"],
  banner: ["reuse", "search", "generate"],
  // Images du produit RÉEL : jamais une banque d'images (elle n'a pas votre produit).
  product_image: ["reuse", "generate"],
  packshot: ["reuse", "cutout", "generate"],
  lifestyle: ["reuse", "generate"],
  usage_scene: ["reuse", "generate"],
  ad_image: ["reuse", "generate"],
  // Demandes simples : un seul outil.
  retouch: ["edit"],
  cutout: ["cutout"],
  variation: ["frame"],
};

/** Intentions qui montrent le produit réel (fidélité obligatoire, référence nécessaire). */
export const PRODUCT_KINDS: VisualKind[] = ["product_image", "packshot", "lifestyle", "usage_scene", "ad_image"];

const RULES: [VisualKind, RegExp][] = [
  ["cutout", /\b(detour\w*|cutout|fond transparent|remove (the )?background|sans fond)/],
  ["retouch", /\b(retouch\w*|corrige\w* (la |l')?(lumiere|couleur)|eclairci\w*|assombri\w*|brighten|fix the light)/],
  ["variation", /\b(declinaison\w*|decline\w*|variante\w*|variation\w*|recadr\w*|crop\w*|autre format|format (story|carre|portrait))/],
  ["packshot", /\b(packshot\w*|fond blanc|white background|photo produit seul)/],
  ["ad_image", /\b(pub|pubs|publicit\w*|advert\w*|ad creative|annonce\w*)\b/],
  ["banner", /\b(banniere\w*|banner\w*|bandeau\w*|en-tete|hero)\b/],
  ["usage_scene", /\b(utilisation|en train d'utiliser|in use|using the|mode d'emploi|demonstration)\b/],
  ["lifestyle", /\b(lifestyle|en situation|mise en situation|quotidien|daily life)\b/],
  ["stock_photo", /\b(photo libre|banque d'images|libre de droits|royalty[- ]free|stock)\b/],
  ["social_image", /\b(instagram|facebook|linkedin|tiktok|publications?|posts?|reseaux)\b/],
  ["ambiance", /\b(ambiance|univers|mood|atmosphere)\b/],
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Intention d'une demande en texte libre (sinon : photo du métier pour un service, image produit pour une boutique). */
export function visualIntent(text: string, business: "products" | "services"): { kind: VisualKind; support: Support; confident: boolean } {
  const t = norm(text);
  const hit = RULES.find(([, re]) => re.test(t));
  let kind: VisualKind = hit ? hit[0] : business === "services" ? "trade_photo" : "product_image";
  // Un service n'a pas de produit à montrer : « image produit », « packshot » ou « lifestyle » deviennent son métier.
  if (business === "services" && PRODUCT_KINDS.includes(kind) && kind !== "ad_image") kind = "trade_photo";
  return { kind, support: supportOf(kind, t), confident: !!hit };
}

export function supportOf(kind: VisualKind, t = ""): Support {
  if (kind === "banner") return "banner";
  if (kind === "ad_image") return "ad";
  if (kind === "social_image" || /instagram|facebook|linkedin|tiktok|story|reel/.test(t)) return "social";
  if (/\bblog|article\b/.test(t)) return "blog";
  if (/\bvideo\b/.test(t)) return "video";
  if (kind === "packshot" || kind === "product_image") return "product_page";
  return "site";
}

export const stagesFor = (kind: VisualKind) => PIPELINE[kind];
