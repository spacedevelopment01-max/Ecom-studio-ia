/**
 * Politiques de la barrière de qualité, par type de livrable (un seul endroit pour tous les seuils du studio).
 *
 * Une note n'est jamais la seule règle : la décision tient aussi compte des critères individuels, des défauts
 * bloquants (corrigeables) et fatals (direction à abandonner), de la confiance accordée au contrôle et de sa
 * provenance (IA, contrôle local, métadonnées, humain). Changer une politique change POLICY_VERSION.
 */
export const POLICY_VERSION = "2026-10-p1a";

export type Checker = "ai" | "local" | "metadata" | "human" | "none";

export const DELIVERABLES = [
  "logo_route",
  "logo_full",
  "image_product",
  "image_lifestyle",
  "image_ambiance",
  "stock_photo",
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
    blocking: ["cliche", "claim"],
    provisional: { checkers: ["local"], floor: 0, use: "auto", label: "placeholder" },
  },
  logo_full: { final: 8, retryFloor: 6.5, maxRetries: 1, finalCheckers: ["ai", "human"], minConfidence: 0.7, fatal: ["resembles_known_brand", "corrupt", "forbidden"], blocking: ["name_mismatch", "extra_text"] },
  image_product: IMAGE,
  image_lifestyle: IMAGE,
  image_ambiance: IMAGE,
  stock_photo: STOCK,
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
