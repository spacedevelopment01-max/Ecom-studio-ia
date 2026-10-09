/**
 * Capacités des fournisseurs et des modèles (phase 3A) : la logique métier demande une CAPACITÉ (texte, vision,
 * image, vidéo, recherche…) et un NIVEAU (léger, standard, fort), jamais un nom de modèle. Seul ce fichier relie
 * niveaux et capacités aux modèles réels.
 */
import type { ProviderId } from "../ai/config";
import { MEDIA_MODELS } from "../ai/media-models";

export type Capability =
  | "text"
  | "vision"
  | "structured_output"
  | "long_context"
  | "image_generation"
  | "image_edit" // retouche par masque autour du produit réel
  | "video_generation"
  | "stock_search"
  | "deterministic"; // moteur local du studio (0 €)

/** Niveau de raisonnement / créativité attendu. */
export type Tier = "local" | "light" | "standard" | "strong";
export const TIER_RANK: Record<Tier, number> = { local: 0, light: 1, standard: 2, strong: 3 };

export type ModelCapability = {
  provider: ProviderId | "local";
  model: string;
  tier: Tier;
  capabilities: Capability[];
  /** Réflexion adaptative et niveau d'effort réglables. */
  effort: boolean;
};

/** Registre des modèles connus du studio (ajouter un modèle ici suffit au routeur). */
export const MODELS: ModelCapability[] = [
  { provider: "local", model: "local-engine", tier: "local", capabilities: ["deterministic", "text"], effort: false },
  { provider: "anthropic", model: "claude-haiku-4-5", tier: "light", capabilities: ["text", "vision", "structured_output"], effort: false },
  { provider: "anthropic", model: "claude-sonnet-5-5", tier: "standard", capabilities: ["text", "vision", "structured_output", "long_context"], effort: true },
  { provider: "anthropic", model: "claude-opus-5-5", tier: "strong", capabilities: ["text", "vision", "structured_output", "long_context"], effort: true },
  { provider: "openai", model: "gpt-image-1", tier: "strong", capabilities: ["image_generation", "image_edit"], effort: false },
  { provider: "google", model: "gemini-2.5-flash-image", tier: "standard", capabilities: ["image_generation"], effort: false },
  { provider: "google", model: "veo-3.0-generate-001", tier: "strong", capabilities: ["video_generation"], effort: false },
  { provider: "google", model: "veo-3.0-fast-generate-001", tier: "standard", capabilities: ["video_generation"], effort: false },
  { provider: "fal", model: "fal-ai/kling-video/v2.1/pro/image-to-video", tier: "standard", capabilities: ["video_generation"], effort: false },
  { provider: "pexels", model: "pexels-search", tier: "local", capabilities: ["stock_search"], effort: false },
  { provider: "pixabay", model: "pixabay-search", tier: "local", capabilities: ["stock_search"], effort: false },
];

// Modèles images et vidéos du catalogue multimédia (media-models.ts) VÉRIFIÉS (identifiant et tarif officiels)
// absents ci-dessus : déclarés au repli historique du routeur. Les autres (à confirmer) ne passent que par le routage
// multimédia (media-routing.ts), qui vérifie leur confirmation par l'administration.
for (const m of MEDIA_MODELS) {
  if (!m.adapter || !(m.verified.id && m.verified.price) || MODELS.some((x) => x.provider === m.provider && x.model === m.model)) continue;
  const capabilities: Capability[] = m.kind === "video" ? ["video_generation"] : m.needsReference ? ["image_edit"] : m.caps.maskEdit ? ["image_generation", "image_edit"] : ["image_generation"];
  MODELS.push({ provider: m.provider, model: m.model, tier: m.quality === 3 ? "strong" : m.quality === 2 ? "standard" : "light", capabilities, effort: false });
}

export const modelInfo = (provider: string, model: string) => MODELS.find((m) => m.provider === provider && m.model === model) ?? null;

/** Modèles qui ont toutes les capacités demandées. */
export const capableModels = (needs: Capability[]) => MODELS.filter((m) => needs.every((c) => m.capabilities.includes(c)));
