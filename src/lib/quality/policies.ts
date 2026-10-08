/**
 * Politiques de la barrière de qualité, par type de livrable (un seul endroit pour tous les seuils du studio).
 *
 * Une note n'est jamais la seule règle : la décision tient aussi compte des critères individuels, des défauts
 * bloquants (corrigeables) et fatals (direction à abandonner), de la confiance accordée au contrôle et de sa
 * provenance (IA, contrôle local, métadonnées, humain). Changer une politique change POLICY_VERSION.
 */
export const POLICY_VERSION = "2026-10-p10a";

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
  "ad_v2",
  "video_v2",
  "video_shot_v2",
  "seo_product_v2",
  "seo_service_v2",
  "seo_category_v2",
  "seo_home_v2",
  "seo_article_v2",
  "seo_metadata_v2",
  "seo_strategy_v2",
  "seo_tech_audit_v2",
  "social_post_v2",
  "theme_home",
  "theme_custom",
  "theme_v2",
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
const SEO_V2 = (criteriaFloors: Record<string, number>): Policy => ({
  final: 7.5,
  retryFloor: 5,
  maxRetries: 2,
  minCriterion: 6,
  criteriaFloors,
  finalCheckers: ["ai", "human"],
  minConfidence: 0.7,
  fatal: [],
  blocking: ["invented_claim", "invented_source", "wrong_fact", "unconfirmed_commercial", "forbidden_claim", "invented_link", "hollow_copy", "keyword_stuffing", "duplicate_content", "bad_structure", "missing_meta", "intent_mismatch"],
  provisional: { checkers: ["local", "ai"], floor: 0, use: "manual", label: "needs_improvement" },
});
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
  // Publicité V2 (phase 6A) : création complète (texte + visuel composé) jugée sur 10 critères. Affirmation interdite
  // ou produit transformé = fatal ; affirmation non confirmée, texte illisible, zone de sécurité débordée, produit
  // recouvert, trop de texte ou création générique bloquent. Sans relecture IA : au mieux PROVISOIRE (choix manuel).
  ad_v2: {
    final: 7.5,
    retryFloor: 5.5,
    maxRetries: 2,
    minCriterion: 6,
    criteriaFloors: { hook: 7, relevance: 7, legibility: 7, cta: 6.5, brand: 6.5 },
    finalCheckers: ["ai", "human"],
    minConfidence: 0.7,
    fatal: ["forbidden_claim", "product_altered", "wrong_product", "corrupt", "forbidden"],
    blocking: ["unverified_claim", "copy_policy", "illegible", "safe_zone", "product_overlap", "too_much_text", "generic", "duplicate_concept"],
    provisional: { checkers: ["local"], floor: 0, use: "manual", label: "needs_improvement" },
  },
  // Vidéo V2 (phase 7A) : vidéo complète jugée sur 13 critères. Produit transformé, affirmation inventée ou fichier
  // corrompu = fatal ; personnage incohérent, séquence hors sujet, artefacts majeurs, audio inutilisable, texte
  // illisible ou désynchronisé bloquent. Une vidéo exportable mais médiocre n'est jamais FINAL ; sans relecture IA
  // (contrôles locaux seuls) : au mieux PROVISOIRE, à valider par le client.
  video_v2: {
    final: 7.5,
    retryFloor: 5.5,
    maxRetries: 2,
    minCriterion: 6,
    criteriaFloors: { relevance: 7, narrative: 6.5, product_fidelity: 8, continuity: 6.5, audio: 6, subtitles: 6.5, commercial: 6.5 },
    finalCheckers: ["ai", "human"],
    minConfidence: 0.7,
    fatal: ["product_altered", "wrong_product", "invented_claim", "corrupt", "forbidden"],
    blocking: ["character_inconsistent", "off_topic", "major_artifacts", "audio_unusable", "illegible_text", "out_of_sync", "duration_mismatch", "safe_zone", "missing_disclosure", "repetitive_editing"],
    provisional: { checkers: ["local"], floor: 0, use: "manual", label: "needs_improvement" },
  },
  // Plan vidéo V2 (un plan généré) : jugé sur ses images (début, milieu, fin). Produit transformé = fatal (le plan
  // est écarté, jamais réutilisé) ; une reprise ciblée au plus ; sans contrôle : jamais FINAL.
  video_shot_v2: {
    final: 7,
    retryFloor: 5,
    maxRetries: 1,
    finalCheckers: ["ai", "human"],
    minConfidence: 0.7,
    fatal: ["product_altered", "wrong_product", "corrupt", "forbidden"],
    blocking: ["character_inconsistent", "off_topic", "major_artifacts"],
  },
  // SEO & Copywriting V2 (phase 8A) : une politique par type de contenu. Affirmation inventée, source inexistante,
  // caractéristique fausse, information commerciale non confirmée, affirmation à éviter, lien inventé, formule
  // creuse, sur-optimisation, doublon, structure ou métadonnées absentes : bloquants (reprise ciblée sur les blocs
  // fautifs, jamais FINAL). Sans relecture éditoriale IA : au mieux PROVISOIRE, à valider par le client.
  seo_product_v2: SEO_V2({ accuracy: 8, relevance: 7, intent_fit: 7, commercial: 6.5 }),
  seo_service_v2: SEO_V2({ accuracy: 8, relevance: 7, intent_fit: 7, clarity: 7 }),
  seo_category_v2: SEO_V2({ accuracy: 8, relevance: 7, originality: 6.5 }),
  seo_home_v2: SEO_V2({ accuracy: 8, relevance: 7, brand: 7, intent_fit: 7 }),
  seo_article_v2: SEO_V2({ accuracy: 8, relevance: 7, usefulness: 7, originality: 6.5, intent_fit: 7 }),
  seo_metadata_v2: { ...SEO_V2({ accuracy: 8, relevance: 7 }), maxRetries: 1 },
  // Stratégie et audit technique : produits par des règles (pas d'IA) ; ils restent des recommandations à valider
  // par le client (PROVISOIRE), jamais présentés comme vérifiés sur le web réel.
  seo_strategy_v2: { final: 8, retryFloor: 5, maxRetries: 0, finalCheckers: ["human"], minConfidence: 0.7, fatal: [], blocking: ["unsourced_metrics", "invented_link", "cannibalization"], provisional: { checkers: ["local"], floor: 5, use: "auto", label: "needs_improvement" } },
  seo_tech_audit_v2: { final: 8, retryFloor: 0, maxRetries: 0, finalCheckers: ["human"], minConfidence: 0.7, fatal: [], blocking: [], provisional: { checkers: ["local"], floor: 0, use: "auto", label: "needs_improvement" } },
  // Publication sociale V2 (phase 9A) : affirmation inventée, affirmation à éviter, information à compléter, média
  // refusé / introuvable / sans licence, média ou format non conforme au réseau, accroche répétée : bloquants (jamais
  // approuvée ni programmée). Contrôle local seul : PROVISOIRE ; l'approbation du client (contrôle humain) conclut.
  social_post_v2: {
    final: 7.5,
    retryFloor: 0,
    maxRetries: 0,
    finalCheckers: ["ai", "human"],
    minConfidence: 0.7,
    fatal: [],
    blocking: ["invented_claim", "forbidden_claim", "incomplete", "media_missing", "media_rejected", "rights_unknown", "media_required", "wrong_media", "video_duration", "too_many_media", "caption_too_long", "empty_caption", "duplicate_hook"],
    provisional: { checkers: ["local"], floor: 0, use: "manual", label: "needs_improvement" },
  },
  theme_home: THEME,
  theme_custom: THEME,
  // Theme Engine V2 (phase 10A) : un thème techniquement valide n'est JAMAIS FINAL automatiquement — seule la validation
  // du propriétaire (humain) conclut. Le contrôle local (structure, contrastes, contenus, navigateur) donne PROVISOIRE ;
  // un défaut grave (navigation inutilisable, texte illisible, thème cassé) rejette le thème.
  theme_v2: {
    final: 8,
    retryFloor: 0,
    maxRetries: 0,
    finalCheckers: ["human"],
    minConfidence: 0.8,
    fatal: ["broken", "theme_check_error", "navigation_unusable", "unreadable_text"],
    blocking: ["empty_section", "overflow", "overlap", "missing_image", "distorted_image", "js_error", "broken_link", "invented_claim", "missing_h1"],
    provisional: { checkers: ["local", "ai"], floor: 0, use: "manual", label: "needs_improvement" },
  },
  // Détourage : le contrôle local (pixels) est un vrai contrôle ; il peut conclure.
  cutout: { final: 7, retryFloor: 7, maxRetries: 0, finalCheckers: ["ai", "local", "human"], minConfidence: 0.5, fatal: ["wrong_object", "corrupt"], blocking: [] },
};

/** Confiance accordée par défaut à chaque provenance de contrôle (une politique future pourra l'affiner). */
export const DEFAULT_CONFIDENCE: Record<Checker, number> = { human: 1, ai: 0.9, metadata: 0.6, local: 0.5, none: 0 };
