/**
 * Politique de routage centrale (phase 3A) : UN seul endroit décrit, pour chaque tâche, la capacité nécessaire,
 * le niveau de départ, l'effort, l'escalade permise et ce qui peut se faire sans IA. Aucun moteur ne choisit
 * lui-même un modèle. Réglable sans toucher aux moteurs : réglage d'administration « ai.policy » (fusionné).
 *
 * Principe : MEILLEURE QUALITÉ JUSTIFIÉE, pas le moins cher. Une tâche créative ou stratégique part directement
 * sur un modèle fort (pas d'essai « bon marché » d'abord) ; une tâche à grille fixe part sur un modèle standard ;
 * le léger est réservé au tri et au classement ; le local (0 €) à ce qui est déterministe.
 *
 * Les niveaux par défaut reproduisent exactement le routage d'avant la phase 3 (DEFAULT_ROUTES en est dérivé).
 */
import type { Route, TaskId } from "../ai/config";
import { getJsonSetting } from "../settings";
import type { Capability, Tier } from "./capabilities";

/** Effort sur l'échelle de la politique ; traduit vers la valeur acceptée par chaque modèle (mapEffort). */
type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export type TaskPolicy = {
  /** Capacités indispensables (la vision s'ajoute quand l'entrée contient des images). */
  needs: Capability[];
  /** Niveau de départ. */
  tier: Tier;
  effort?: Effort;
  /** Niveau maximal atteignable par escalade (absent : pas d'escalade). */
  escalateTo?: Tier;
  /** Une demande SIMPLE de cette tâche peut être faite par le moteur local (0 €). */
  localWhenSimple?: boolean;
  /** Mode automatique : niveau suffisant pour une demande SIMPLE (jamais appliqué en manuel ni après un échec). */
  simpleTier?: Tier;
  /** Pourquoi ce niveau (raison synthétique tracée). */
  why: string;
};

/** Modèle par défaut de chaque niveau, pour le texte (le reste passe par les capacités). */
export const TEXT_MODEL_BY_TIER: Record<Exclude<Tier, "local">, string> = {
  light: "claude-haiku-4-5",
  standard: "claude-sonnet-5-5",
  strong: "claude-opus-5-5",
};

const TEXT: Capability[] = ["text", "structured_output"];

export const DEFAULT_POLICY: Record<TaskId, TaskPolicy> = {
  vision_analysis: { needs: [...TEXT, "vision"], tier: "strong", effort: "medium", why: "vision analysis drives every later step" },
  strategy: { needs: TEXT, tier: "strong", effort: "high", why: "complex creative direction" },
  // Textes de vente (accueil, fiche produit, FAQ) : enjeu direct sur la conversion, réflexion plus poussée.
  copywriting: { needs: TEXT, tier: "standard", effort: "high", escalateTo: "strong", why: "sales copy, high effort" },
  theme_design: { needs: TEXT, tier: "strong", effort: "high", why: "complex layout direction" },
  theme_edit: { needs: TEXT, tier: "strong", effort: "medium", localWhenSimple: true, why: "composed theme edit" },
  theme_custom: { needs: [...TEXT, "long_context"], tier: "strong", effort: "high", why: "full custom theme" },
  // Contrôles (images, plans vidéo, relectures) : grille fixe, réponse courte — modèle solide mais moins cher que la création.
  quality_control: { needs: TEXT, tier: "standard", effort: "low", escalateTo: "strong", simpleTier: "light", why: "fixed grid review" },
  photo_triage: { needs: [...TEXT, "vision"], tier: "light", escalateTo: "standard", why: "simple photo sorting" },
  cutout_check: { needs: [...TEXT, "vision"], tier: "standard", effort: "low", why: "visual check, fixed grid" },
  logo_symbol: { needs: TEXT, tier: "strong", effort: "medium", why: "complex creative direction" },
  social_planning: { needs: TEXT, tier: "strong", effort: "medium", why: "editorial strategy" },
  // Reprises ciblées du calendrier et réécritures de l'éditeur : rédaction de community manager, effort moyen.
  social_copy: { needs: TEXT, tier: "standard", effort: "medium", escalateTo: "strong", simpleTier: "light", why: "targeted social rewrite" },
  classification: { needs: TEXT, tier: "light", escalateTo: "standard", localWhenSimple: true, why: "short classification" },
  video_direction: { needs: TEXT, tier: "strong", effort: "medium", why: "complex creative direction" },
  // Brief photo : quelques centaines de mots, mais il conditionne une image payante (~0,17 $) — modèle fort, effort moyen.
  art_direction: { needs: TEXT, tier: "strong", effort: "medium", why: "brief conditions a paid image" },
  // Campagne de test complète (stratégie + annonces) : modèle fort, effort moyen ; une relecture notée et au plus une reprise.
  ad_creative: { needs: TEXT, tier: "strong", effort: "medium", why: "full test campaign" },
  // Sujets d'articles : stratégie de mots-clés et intention de recherche (le léger est trop superficiel), appel court.
  blog_topics: { needs: TEXT, tier: "standard", effort: "low", escalateTo: "strong", why: "keyword strategy, short call" },
  blog_writing: { needs: TEXT, tier: "standard", effort: "medium", escalateTo: "strong", why: "long-form copy" },
  image_generation: { needs: ["image_generation"], tier: "strong", why: "paid image, best available renderer" },
  video_generation: { needs: ["video_generation"], tier: "strong", why: "paid video, best available renderer" },
};

/** Fournisseur et modèle par défaut des tâches média (le routeur peut se replier sur un autre fournisseur capable). */
export const MEDIA_DEFAULTS: Partial<Record<TaskId, Route>> = {
  image_generation: { provider: "openai", model: "gpt-image-1" },
  video_generation: { provider: "google", model: "veo-3.0-generate-001" },
};

/** Route par défaut d'une tâche (source de DEFAULT_ROUTES dans config.ts : un seul endroit). */
export function policyRoute(task: TaskId, policy: Record<TaskId, TaskPolicy> = DEFAULT_POLICY): Route {
  const media = MEDIA_DEFAULTS[task];
  if (media) return { ...media };
  const p = policy[task];
  const tier = p.tier === "local" ? "light" : p.tier;
  return { provider: "anthropic", model: TEXT_MODEL_BY_TIER[tier], ...(p.effort && tier !== "light" ? { effort: p.effort } : {}) };
}

export const POLICY_ROUTES = Object.fromEntries((Object.keys(DEFAULT_POLICY) as TaskId[]).map((t) => [t, policyRoute(t)])) as Record<TaskId, Route>;

/** Politique effective : défauts + réglage d'administration « ai.policy » (champs fusionnés par tâche). */
export function routingPolicy(): Record<TaskId, TaskPolicy> {
  const custom = getJsonSetting<Partial<Record<TaskId, Partial<TaskPolicy>>>>("ai.policy", {});
  const out = { ...DEFAULT_POLICY };
  for (const [k, v] of Object.entries(custom)) if (k in out && v) out[k as TaskId] = { ...out[k as TaskId], ...v };
  return out;
}
