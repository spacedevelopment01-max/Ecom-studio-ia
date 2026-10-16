/**
 * RÈGLE ABSOLUE DES MARQUES (guide créatif, règle 2) : seuls le nom, la marque et le logo du PROJET apparaissent ou sont
 * prononcés. Contrôlé sur tous les textes (titres, phrase de fin, bouton, sous-titres, voix off), sur la description des
 * plans Pixabay (avant téléchargement) et, quand l'IA est active, sur l'image du plan (code `third_party_brand` du
 * contrôle visuel). Un plan qui montre une marque tierce est remplacé : on ne gomme jamais un filigrane de licence.
 */
import type { Project } from "../projects";

/** Marques et enseignes très courantes dans les banques d'images et les textes (contrôle local, sans IA). */
export const KNOWN_BRANDS = [
  "apple", "iphone", "ipad", "macbook", "airpods", "samsung", "galaxy", "huawei", "xiaomi", "google", "pixel", "sony", "playstation", "xbox", "microsoft", "nintendo",
  "nike", "adidas", "puma", "reebok", "new balance", "converse", "vans", "under armour", "the north face", "patagonia", "decathlon", "quechua",
  "rolex", "omega", "cartier", "tag heuer", "breitling", "swatch", "casio", "seiko", "tissot", "longines", "patek philippe", "audemars piguet",
  "louis vuitton", "gucci", "chanel", "dior", "hermes", "prada", "zara", "h&m", "uniqlo", "lacoste", "ray-ban", "rayban",
  "coca-cola", "coca cola", "pepsi", "red bull", "nespresso", "starbucks", "mcdonald's", "mcdonalds", "heineken", "nestle",
  "ikea", "leroy merlin", "castorama", "bosch", "makita", "dewalt", "black+decker", "stanley", "karcher", "dyson", "tollens", "dulux",
  "l'oreal", "loreal", "nivea", "garnier", "la roche-posay", "vichy", "lancome", "estee lauder", "clinique", "sephora",
  "amazon", "facebook", "instagram", "tiktok", "youtube", "netflix", "spotify", "uber", "airbnb", "tesla", "bmw", "mercedes", "audi", "renault", "peugeot", "toyota", "jeep", "volkswagen",
  "gopro", "canon", "nikon", "dji", "beats", "bose", "jbl", "marshall", "garmin", "fitbit",
];

const fold = (x: string) => ` ${x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9&'+ -]+/g, " ").replace(/\s+/g, " ")} `;

/** Marques autorisées : celle du projet (nom de marque, nom du projet, nom de l'entreprise). */
export function allowedBrands(p: Pick<Project, "name" | "brand">): string[] {
  return [p.brand?.name, p.name].filter((x): x is string => !!x?.trim()).map((x) => x.trim());
}

/** Marques tierces citées dans un texte (jamais celles du projet). */
export function thirdPartyBrands(text: string, allowed: string[] = []): string[] {
  const t = fold(text);
  const own = allowed.map((a) => fold(a).trim()).filter(Boolean);
  return KNOWN_BRANDS.filter((b) => t.includes(` ${b} `) && !own.some((o) => o === b || o.includes(b) || b.includes(o)));
}

/** Tous les textes d'une publicité vidéo contrôlés ensemble : renvoie chaque problème trouvé (champ + marque). */
export function brandIssuesInTexts(fields: Record<string, string | null | undefined>, allowed: string[]): { field: string; brand: string }[] {
  return Object.entries(fields).flatMap(([field, v]) => (v ? thirdPartyBrands(v, allowed).map((brand) => ({ field, brand })) : []));
}

/** Description d'un plan de banque (mots-clés, titre) : écarté s'il cite une marque tierce, avant tout téléchargement. */
export const stockMentionsBrand = (alt: string, allowed: string[] = []) => thirdPartyBrands(alt, allowed).length > 0;

/** Consigne ajoutée au contrôle visuel d'un plan : marque, logo, nom ou filigrane visible → refus. */
export const BRAND_VISUAL_RULE = "Reject (code third_party_brand) if ANY brand name, logo, trademark, readable product label or watermark of another company is visible (on objects, clothes, tools, screens, packaging, signs). Neutral unbranded objects are fine.";
