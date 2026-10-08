/**
 * Politiques de la barrière de qualité, par type de livrable (un seul endroit pour tous les seuils du studio).
 *
 * Une note n'est jamais la seule règle : la décision tient aussi compte des critères individuels, des défauts
 * bloquants (corrigeables) et fatals (direction à abandonner), de la confiance accordée au contrôle et de sa
 * provenance (IA, contrôle local, métadonnées, humain). Changer une politique change POLICY_VERSION.
 */
export const POLICY_VERSION = "2026-10-p5a";

export type Checker = "ai" | "local" | "metadata" | "human" | "none";

export const DELIVERABLES = [
  "logo_route",
  "logo_full",
  "logo_v2",
  "image_product",
  "image_lifestyle",
  "image_ambiance",
  "image_v2",
  "stock_photo",
  "stock_v2",
  "stock_video",
  "video_clip",
  "ugc_frame",
  "ugc_clip",
  "copy_shop",
  "seo_meta",
  "blog_article",
  "social_plan",
  "social_post",
  "ad_copy",
  "theme_home",
  "theme_custom",
  "cutout",
] as const;
export type Deliverable = (typeof DELIVERABLES)[number];

export type Policy = {
  /** Note à partir de laquelle le résultat peut être FINAL (si rien d'autre ne s'y oppose). */
  final: number;
  /** En dessous : mauvaise direction, pas de reprise (REJECTED). */
  retryFloor: number;
  /** Reprises ciblées au plus (0 : on passe au candidat suivant). */
  maxRetries: number;
  /** Note minimale de chaque critère pour un FINAL. */
  minCriterion?: number;
  /** Notes minimales de critères précis (ex. pertinence d'un logo). */
  criteriaFloors?: Record<string, number>;
  /** Provenances de contrôle qui peuvent conclure FINAL. */
  finalCheckers: Checker[];
  /** Confiance minimale du contrôle pour un FINAL. */
  minConfidence: number;
  /** Défauts fatals : la direction est abandonnée, le résultat n'est jamais réutilisable automatiquement. */
  fatal: string[];
  /** Défauts bloquants corrigeables : jamais FINAL tant qu'ils sont là ; reprise ciblée si possible. */
  blocking: string[];
  /**
   * Résultat PROVISOIRE (utilisable techniquement, jamais présenté comme final professionnel) :
   * provenances qui peuvent y conduire, note minimale, usage automatique permis ou non, et libellé.
   */
  provisional?: { checkers: Checker[]; floor: number; use: "auto" | "manual"; label: "placeholder" | "needs_improvement" };
};

const TEXT: Policy = { final: 8, retryFloor: 6, maxRetries: 2, minCriterion: 6, finalCheckers: ["ai", "human"], minConfidence: 0.7, fatal: [], blocking: ["claim"] };
const IMAGE: Policy = { final: 7, retryFloor: 5, maxRetries: 1, finalCheckers: ["ai", "human"], minConfidence: 0.7, fatal: ["wrong_product", "corrupt", "forbidden"], blocking: ["deformed", "text_in_image"] };
const STOCK: Policy = { final: 7, retryFloor: 7, maxRetries: 0, finalCheckers: ["ai", "human", "metadata"], minConfidence: 0.5, fatal: ["off_topic", "corrupt", "forbidden"], blocking: [] };
const THEME: Policy = {
  final: 8,
  retryFloor: 5,
  maxRetries: 0, // Phase 1 : aucune boucle de correction coûteuse (Theme Engine V2, phase 10).
  finalCheckers: ["ai", "human"],
  minConfidence: 0.7,
  fatal: ["broken", "theme_check_error"],
  blocking: [],
  provisional: { checkers: ["ai"], floor: 5, use: "auto", label: "needs_improvement" },
};

export const POLICIES: Record<Deliverable, Policy> = {
  // Logo : seule une proposition contrôlée par l'IA (ou choisie par le client) peut être FINAL. La version du studio
  // n'est qu'un logo provisoire de remplacement (utilisable techniquement par le thème, jamais présenté comme final).
  logo_route: {
    final: 8,
    retryFloor: 6.5,
    maxRetries: 2,
    minCriterion: 6.5,
    criteriaFloors: { relevance: 7.5 },
    finalCheckers: ["ai", "human"],
    minConfidence: 0.7,
    fatal: ["resembles_known_brand", "unreadable_letters", "corrupt", "forbidden"],
    blocking: ["cliche", "claim", "small_sizes"],
    provisional: { checkers: ["local"], floor: 0, use: "auto", label: "placeholder" },
  },
  // Logo V2 (phase 4A) : planche jugée (fond neutre, noir seul, blanc sur sombre, petite taille). Nom exact, lisibilité,
  // typographie et petite taille ont leur plancher ; texte faux, cliché, rendu amateur bloquent ; une direction sous
  // 5,5 est abandonnée (aucune génération brûlée pour la sauver) ; la version du studio n'est que provisoire.
  logo_v2: {
    final: 8,
    retryFloor: 5.5,
    maxRetries: 2,
    minCriterion: 6,
    criteriaFloors: { relevance: 7, legibility: 7, typography: 7, smallSize: 6.5 },
    finalCheckers: ["ai", "human"],
    minConfidence: 0.7,
    fatal: ["resembles_known_brand", "corrupt", "forbidden"],
    blocking: ["name_mismatch", "text_unreadable", "extra_text", "cliche", "amateur", "small_sizes", "weak_monochrome", "claim"],
    provisional: { checkers: ["local"], floor: 0, use: "manual", label: "needs_improvement" },
  },
  logo_full: { final: 8, retryFloor: 6.5, maxRetries: 1, finalCheckers: ["ai", "human"], minConfidence: 0.7, fatal: ["resembles_known_brand", "corrupt", "forbidden"], blocking: ["name_mismatch", "extra_text"] },
  image_product: IMAGE,
  image_lifestyle: IMAGE,
  image_ambiance: IMAGE,
  // Image V2 (phase 5A) : une image hors sujet n'est jamais FINAL, même très belle (défaut fatal) ; un produit
  // transformé est fatal ; une image techniquement correcte mais esthétiquement faible ne passe pas (planchers
  // esthétique et composition). Reprises ciblées limitées à deux, chacune avec un diagnostic.
  image_v2: {
    final: 7.5,
    retryFloor: 5,
    maxRetries: 2,
    minCriterion: 5.5,
    criteriaFloors: { relevance: 7, fidelity: 8, aesthetics: 6.5, composition: 6, brief: 6.5 },
    finalCheckers: ["ai", "human"],
    minConfidence: 0.7,
    fatal: ["off_topic", "wrong_product", "product_altered", "corrupt", "forbidden"],
    blocking: ["deformed", "text_in_image", "artifacts", "low_resolution", "bad_crop", "weak_aesthetics", "brand_mismatch", "brief_mismatch", "duplicate", "license_unverified"],
  },
  stock_photo: STOCK,
  // Photo de banque V2 : seul un contrôle visuel (IA) ou humain conclut FINAL ; la description de la banque seule
  // (forfait sans IA) ne donne qu'un résultat PROVISOIRE, utilisable mais signalé « à vérifier ».
  stock_v2: {
    final: 7.5,
    retryFloor: 7,
    maxRetries: 0,
    criteriaFloors: { relevance: 7, aesthetics: 6, support: 6 },
    finalCheckers: ["ai", "human"],
    minConfidence: 0.7,
    fatal: ["off_topic", "corrupt", "forbidden", "license_unverified"],
    blocking: ["text_in_image", "artifacts", "low_resolution", "bad_crop", "weak_aesthetics", "duplicate", "deformed"],
    provisional: { checkers: ["metadata"], floor: 7, use: "auto", label: "needs_improvement" },
  },
  stock_video: STOCK,
  video_clip: { final: 7, retryFloor: 7, maxRetries: 0, finalCheckers: ["ai", "human"], minConfidence: 0.7, fatal: ["wrong_product", "corrupt", "forbidden"], blocking: [] },
  ugc_frame: { ...IMAGE },
  ugc_clip: { final: 7, retryFloor: 5, maxRetries: 1, finalCheckers: ["ai", "human"], minConfidence: 0.7, fatal: ["wrong_product", "corrupt", "forbidden"], blocking: ["deformed"] },
  copy_shop: TEXT,
  seo_meta: { ...TEXT, maxRetries: 1 },
  blog_article: TEXT,
  social_plan: TEXT,
  social_post: TEXT,
  ad_copy: TEXT,
  theme_home: THEME,
  theme_custom: THEME,
  // Détourage : le contrôle local (pixels) est un vrai contrôle ; il peut conclure.
  cutout: { final: 7, retryFloor: 7, maxRetries: 0, finalCheckers: ["ai", "local", "human"], minConfidence: 0.5, fatal: ["wrong_object", "corrupt"], blocking: [] },
};

/** Confiance accordée par défaut à chaque provenance de contrôle (une politique future pourra l'affiner). */
export const DEFAULT_CONFIDENCE: Record<Checker, number> = { human: 1, ai: 0.9, metadata: 0.6, local: 0.5, none: 0 };
