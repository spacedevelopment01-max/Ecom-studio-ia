/**
 * GUIDE DU MOTEUR D'IMAGES (règles du propriétaire, chargées à CHAQUE image finale).
 *
 * Règle n° 1 : toute image finale (publication, publicité, visuel de prestation, image produit, bénéfice, bannière,
 * ambiance, promotion, site, fiche produit) est CRÉÉE par un modèle de génération ou d'édition d'images. Un gabarit,
 * une composition canvas/HTML ou une photo de banque avec un texte posé ne remplacent JAMAIS la génération. Seules les
 * opérations techniques (redimensionner, compresser, convertir) viennent après. Échec ou budget insuffisant : nouvel
 * essai ciblé, autre modèle autorisé, ou blocage signalé — jamais de bascule silencieuse vers un gabarit.
 *
 * Valeurs du dépôt ici ; modifications du propriétaire sans code : réglage `image.creative_guide` (table `settings`,
 * JSON partiel fusionné, persistant) via `/api/admin/image-guide`. Texte lisible : `docs/guide-images-ia.md`.
 */
import { one } from "../db";

export type SizeRange = { min: number; max: number };

/** Rôle de l'image : toutes passent par l'IA, mais toutes n'ont pas d'accroche, de prix ni de bouton. */
export type ImagePurpose = "ad" | "post" | "product_main" | "product_scene" | "benefit" | "banner" | "ambiance" | "service" | "promo";

export type ImageCreativeGuide = {
  version: number;
  aiMandatory: true;
  /** Textes par rôle : nombre de niveaux et éléments permis (une image principale de produit reste sans texte). */
  purposes: Record<ImagePurpose, { text: "none" | "light" | "full"; cta: boolean; calmZone?: boolean; note: string }>;
  /** Typographie pour 1080 px de large (convertie en proportions dans la consigne, vérifiée au rendu). */
  text: { hook: SizeRange; secondary: SizeRange; benefit: SizeRange; body: SizeRange; cta: SizeRange; mention: SizeRange; maxFamilies: number; maxLevels: number; maxHookWords: number };
  layout: { marginPx: SizeRange; compositions: string[] };
  colors: { minContrast: number };
  /** Effets autorisés seulement avec une intention : jamais en décor automatique. */
  effectsNeedIntent: string[];
  /** Clichés interdits par défaut (un même secteur doit produire des univers différents). */
  cliches: { when: RegExp; avoid: string }[];
  /** Grille de contrôle de l'image réellement produite. */
  grid: { id: string; label: string }[];
  retries: { max: number };
};

export const DEFAULT_IMAGE_GUIDE: ImageCreativeGuide = {
  version: 1,
  aiMandatory: true,
  purposes: {
    ad: { text: "full", cta: true, note: "un bénéfice clair et un appel à l'action" },
    post: { text: "light", cta: false, note: "explique ou illustre ; texte court ou aucun" },
    product_main: { text: "none", cta: false, note: "produit seul, épuré, sans texte" },
    product_scene: { text: "none", cta: false, note: "mise en situation crédible, sans texte" },
    benefit: { text: "light", cta: false, note: "un bénéfice vérifié rendu visible" },
    banner: { text: "none", cta: false, calmZone: true, note: "zone calme réservée au texte ajouté par le site" },
    ambiance: { text: "none", cta: false, note: "univers de la marque, sans texte" },
    service: { text: "none", cta: false, note: "geste exact du métier, outils et matériaux cohérents ; illustration, jamais un vrai chantier du client" },
    promo: { text: "full", cta: true, note: "offre réelle seulement, comprise immédiatement" },
  },
  text: {
    hook: { min: 72, max: 112 },
    secondary: { min: 48, max: 68 },
    benefit: { min: 36, max: 48 },
    body: { min: 28, max: 36 },
    cta: { min: 36, max: 48 },
    mention: { min: 24, max: 28 },
    maxFamilies: 2,
    maxLevels: 3,
    maxHookWords: 7,
  },
  layout: {
    marginPx: { min: 60, max: 90 },
    compositions: ["centrée", "asymétrique", "éditoriale", "gros plan", "plein cadre", "diagonale", "nature morte", "scène narrative", "présentation technique"],
  },
  colors: { minContrast: 4.5 },
  effectsNeedIntent: ["podium", "halo", "fumée", "éclaboussure", "produit flottant", "néon"],
  cliches: [
    { when: /tech|drone|casque|electroni|informati|gaming/, avoid: "néons cyan/magenta par défaut" },
    { when: /premium|luxe|joaill|horlog|montre|parfum/, avoid: "noir et or par défaut" },
    { when: /bien[- ]etre|spa|yoga|cosmet|soin|massage/, avoid: "beige et feuilles de palmier par défaut" },
    { when: /.*/, avoid: "podium sous le produit par défaut" },
    { when: /artisan|peint|platr|plomb|electri|menuis|macon/, avoid: "artisan souriant devant un décor générique, bandeau de couleur identique" },
  ],
  grid: [
    { id: "relevance", label: "Pertinence (le sujet exact, le message)" },
    { id: "product", label: "Fidélité du produit (forme, proportions, matières, couleurs, détails, nombre de pièces)" },
    { id: "service", label: "Cohérence du service (geste, outils, posture, matériaux)" },
    { id: "hands", label: "Mains et objets sans défaut" },
    { id: "text", label: "Lisibilité, orthographe (texte exact), contraste" },
    { id: "margins", label: "Marges et zones de respiration" },
    { id: "logo", label: "Logo du projet exact (orthographe, forme, couleurs)" },
    { id: "third_party_brand", label: "Aucune marque tierce ni filigrane" },
    { id: "artifacts", label: "Aucun artefact" },
    { id: "diversity", label: "Différente des créations récentes du projet" },
  ],
  retries: { max: 2 },
};

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x) && !(x instanceof RegExp);
function merge<T>(base: T, over: unknown): T {
  if (!isObj(base) || !isObj(over)) return over === undefined ? base : (over as T);
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = k in out ? merge(out[k], v) : v;
  return out as T;
}

export const IMAGE_GUIDE_SETTING = "image.creative_guide";

/** Guide en vigueur : valeurs du dépôt + modifications du propriétaire (les clichés restent ceux du dépôt). */
export function loadImageGuide(): ImageCreativeGuide {
  try {
    const row = one<{ value: string }>("SELECT value FROM settings WHERE key = ?", IMAGE_GUIDE_SETTING);
    if (!row?.value) return DEFAULT_IMAGE_GUIDE;
    const over = JSON.parse(row.value) as Record<string, unknown>;
    delete over.cliches;
    return { ...merge(DEFAULT_IMAGE_GUIDE, over), aiMandatory: true };
  } catch {
    return DEFAULT_IMAGE_GUIDE;
  }
}

/** Taille typographique traduite en proportion de la largeur (le modèle d'images ne garantit pas des pixels exacts). */
export const share = (r: SizeRange, t = 0.5) => Math.round(((r.min + (r.max - r.min) * t) / 1080) * 1000) / 10;
