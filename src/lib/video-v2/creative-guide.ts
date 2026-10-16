/**
 * GUIDE CRÉATIF VIDÉO (règles du propriétaire, chargées à CHAQUE publicité vidéo).
 *
 * Valeurs par défaut écrites ici (versionnées dans le dépôt) ; le propriétaire peut les modifier sans toucher au code :
 * réglage `video.creative_guide` (table `settings`, JSON partiel fusionné sur ces valeurs, persistant après
 * redémarrage) via l'API d'administration `/api/admin/video-guide`. Le texte lisible est dans
 * `docs/guide-creatif-video.md`.
 *
 * Qui s'en sert : `creative-brief.ts` (fiche créative), `storyboard.ts` (plans), `doc.ts`/`three-scenes.ts`
 * (tailles, interlignes, animations, transitions, carte de fin), `brand-guard.ts` (marques), `final-check.ts`
 * (grille de contrôle du fichier final).
 */
import { one } from "../db";

/** Tailles en pixels pour une vidéo verticale 1080 × 1920 (mises à l'échelle pour les autres formats). */
export type SizeRange = { min: number; max: number };

export type AnimationPreset = {
  id: "sober" | "punchy" | "mask" | "words" | "highlight";
  label: string;
  /** Animation de calque utilisée par le rendu. */
  layerIn: "rise" | "fade" | "pop" | "left" | "grow";
  /** Durée d'entrée (s). */
  dur: [number, number];
  /** Déplacement en px (base 1920 de haut). */
  travelPx?: [number, number];
  /** Échelle de départ (accroche dynamique). */
  scaleFrom?: number;
  /** Décalage entre groupes de mots (s). */
  stagger?: [number, number];
};

export type PaletteFamily = "premium" | "tech" | "artisan" | "wellness" | "promo";

export type VideoCreativeGuide = {
  version: number;
  /** Parcours distincts (règle 1). */
  routes: {
    services: { stockSources: ["pixabay"]; clientVideosFirst: true; illustrationNotClientWork: true };
    products: { stockSubstituteForbidden: true; allowed: string[] };
  };
  /** Règle absolue des marques (2). */
  brands: { onlyProjectBrand: true; neverEraseLicenseWatermark: true; logoByCompositing: true };
  /** Tailles de texte (6), base 1080 × 1920. */
  text: {
    hook: SizeRange;
    sceneTitle: SizeRange;
    benefit: SizeRange;
    secondary: SizeRange;
    subtitle: SizeRange;
    cta: SizeRange;
    mention: SizeRange;
    lineHeight: { title: [number, number]; body: [number, number] };
    maxLevelsPerScene: number;
    maxFontFamilies: number;
    maxTitleLines: number;
    maxSubtitleLines: number;
  };
  /** Couleurs (7). Exemples quand le projet n'a pas de charte : jamais imposés. */
  colors: { minContrast: number; examples: Record<PaletteFamily, { bg: string; text: string; accent: string; note: string }> };
  /** Placement (8). */
  layout: { sideMarginPct: [number, number] };
  /** Animations (9). */
  animations: AnimationPreset[];
  /** Montage (10). Durées en secondes. */
  editing: { defaultTransition: "cut"; dynamic: [number, number]; softFade: [number, number]; noAutoFlash: true };
  /** Scénario, voix, son (11). */
  script: {
    structure30s: { part: string; from: number; to: number }[];
    wordsPer30s: [number, number];
    voice: { language: "fr"; natural: true; noThirdPartyBrand: true; noInventedFeature: true };
    musicUnderVoiceDb: number;
  };
  /** Appel à l'action (12). */
  cta: { textPx: SizeRange; padX: [number, number]; padY: [number, number]; holdS: [number, number]; byGoal: Record<"buy" | "quote" | "booking" | "visit" | "contact", { fr: string; en: string }> };
  /** Grille d'évaluation du fichier final (14). */
  grid: { id: string; label: string }[];
};

export const DEFAULT_VIDEO_GUIDE: VideoCreativeGuide = {
  version: 1,
  routes: {
    services: { stockSources: ["pixabay"], clientVideosFirst: true, illustrationNotClientWork: true },
    products: {
      stockSubstituteForbidden: true,
      allowed: ["détourer", "supprimer l'arrière-plan", "nettoyer le détourage", "reconstruire les parties manquantes", "reconstituer une vue", "créer des décors", "créer des plans et cadrages", "générer des scènes vidéo", "mettre en situation", "mouvements de caméra, de lumière, animations cohérentes"],
    },
  },
  brands: { onlyProjectBrand: true, neverEraseLicenseWatermark: true, logoByCompositing: true },
  text: {
    hook: { min: 90, max: 130 },
    sceneTitle: { min: 64, max: 88 },
    benefit: { min: 48, max: 64 },
    secondary: { min: 36, max: 46 },
    subtitle: { min: 44, max: 56 },
    cta: { min: 48, max: 64 },
    mention: { min: 28, max: 34 },
    lineHeight: { title: [1.0, 1.15], body: [1.15, 1.35] },
    maxLevelsPerScene: 3,
    maxFontFamilies: 2,
    maxTitleLines: 2,
    maxSubtitleLines: 2,
  },
  colors: {
    minContrast: 4.5,
    examples: {
      premium: { bg: "#121212", text: "#F5F1E8", accent: "#C6A66B", note: "composition sobre, détails et mouvements mesurés" },
      tech: { bg: "#0B1220", text: "#F8FAFC", accent: "#38BDF8", note: "démonstration, précision, animations nettes" },
      artisan: { bg: "#F5F2EB", text: "#243746", accent: "#C66B45", note: "gestes, matières, confiance" },
      wellness: { bg: "#F4F1E9", text: "#263D35", accent: "#8FAF9A", note: "respiration, mouvements doux" },
      promo: { bg: "#151515", text: "#FFFFFF", accent: "#FF6B35", note: "hiérarchie forte, offre comprise tout de suite" },
    },
  },
  layout: { sideMarginPct: [0.06, 0.08] },
  animations: [
    { id: "sober", label: "Apparition sobre", layerIn: "rise", dur: [0.25, 0.4], travelPx: [12, 28] },
    { id: "punchy", label: "Accroche dynamique", layerIn: "pop", dur: [0.18, 0.28], scaleFrom: 0.94 },
    { id: "mask", label: "Révélation par masque", layerIn: "left", dur: [0.3, 0.5], travelPx: [30, 60] },
    { id: "words", label: "Apparition par groupes de mots", layerIn: "rise", dur: [0.25, 0.35], travelPx: [12, 20], stagger: [0.08, 0.14] },
    { id: "highlight", label: "Mise en valeur (soulignement animé)", layerIn: "grow", dur: [0.3, 0.45] },
  ],
  editing: { defaultTransition: "cut", dynamic: [0.15, 0.3], softFade: [0.3, 0.6], noAutoFlash: true },
  script: {
    structure30s: [
      { part: "hook", from: 0, to: 3 },
      { part: "need", from: 3, to: 8 },
      { part: "demonstration", from: 8, to: 18 },
      { part: "proof", from: 18, to: 25 },
      { part: "cta", from: 25, to: 30 },
    ],
    wordsPer30s: [55, 75],
    voice: { language: "fr", natural: true, noThirdPartyBrand: true, noInventedFeature: true },
    musicUnderVoiceDb: -12,
  },
  cta: {
    textPx: { min: 48, max: 64 },
    padX: [28, 44],
    padY: [18, 26],
    holdS: [2.5, 4],
    byGoal: {
      buy: { fr: "Commander", en: "Shop now" },
      quote: { fr: "Demander un devis", en: "Request a quote" },
      booking: { fr: "Réserver", en: "Book now" },
      visit: { fr: "Venez nous voir", en: "Visit us" },
      contact: { fr: "Nous contacter", en: "Contact us" },
    },
  },
  grid: [
    { id: "scenes", label: "Plusieurs scènes utiles, cohérentes et différentes" },
    { id: "text_size", label: "Textes lisibles (tailles du guide, sur téléphone)" },
    { id: "contrast", label: "Contraste suffisant à plusieurs instants" },
    { id: "hierarchy", label: "Hiérarchie : 3 niveaux au plus par scène, 2 polices au plus" },
    { id: "spelling", label: "Orthographe" },
    { id: "sync", label: "Synchronisation voix / sous-titres / plans" },
    { id: "product", label: "Fidélité du produit (même forme, couleurs, matières, détails)" },
    { id: "service_relevance", label: "Pertinence des plans de services (une étape ou un bénéfice par plan)" },
    { id: "third_party_brand", label: "Aucune marque tierce (texte, voix, images)" },
    { id: "logo", label: "Logo du projet exact (posé, jamais généré)" },
    { id: "artifacts", label: "Absence d'artefacts" },
    { id: "cta", label: "Appel à l'action adapté et visible 2,5 à 4 s" },
    { id: "audio", label: "Qualité audio (musique sous la voix)" },
    { id: "format", label: "Respect du format" },
  ],
};

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
function merge<T>(base: T, over: unknown): T {
  if (!isObj(base) || !isObj(over)) return (over === undefined ? base : (over as T));
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = k in out ? merge(out[k], v) : v;
  return out as T;
}

export const VIDEO_GUIDE_SETTING = "video.creative_guide";

/** Guide en vigueur : valeurs du dépôt + modifications du propriétaire (réglage persistant). */
export function loadVideoGuide(): VideoCreativeGuide {
  try {
    const row = one<{ value: string }>("SELECT value FROM settings WHERE key = ?", VIDEO_GUIDE_SETTING);
    return row?.value ? merge(DEFAULT_VIDEO_GUIDE, JSON.parse(row.value)) : DEFAULT_VIDEO_GUIDE;
  } catch {
    return DEFAULT_VIDEO_GUIDE;
  }
}

/** Taille en pixels pour un cadre de hauteur `h` (base 1920) : `t` 0 = minimum, 1 = maximum de la plage. */
export function px(range: SizeRange, frameH: number, t = 0.5, frameW?: number): number {
  // Format horizontal : la hauteur ne suffit pas (texte trop petit sur 1080 de haut) ; référence = petit côté.
  const ref = frameW ? Math.min(frameW, frameH) / 1080 : frameH / 1920;
  return Math.round((range.min + (range.max - range.min) * Math.max(0, Math.min(1, t))) * ref);
}

/** Rapport de contraste WCAG entre deux couleurs hexadécimales. */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const c = hex.replace("#", "");
    const v = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
}
