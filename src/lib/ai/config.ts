/**
 * Fournisseurs, modèles et routage des tâches.
 * Tout est modifiable dans l'administration ; ces valeurs sont des points de
 * départ. Les clients n'ont jamais besoin de clé : E-COM STUDIO IA fournit l'IA.
 */
import { getJsonSetting, getSetting } from "../settings";
import { UserFacingError } from "../jobs";

export type ProviderId = "anthropic" | "openai" | "google" | "fal";

export const PROVIDERS: Record<ProviderId, { name: string; role: string; keyHelp: string; docs: string }> = {
  anthropic: {
    name: "Anthropic (Claude)",
    role: "Analyse visuelle, stratégie, rédaction, code des thèmes, contrôle qualité",
    keyHelp: "Clé API de la console Anthropic (sk-ant-…)",
    docs: "https://platform.claude.com/",
  },
  openai: {
    name: "OpenAI (images)",
    role: "Génération et retouche d'images par masque (décors autour du produit réel)",
    keyHelp: "Clé API OpenAI (sk-…) avec accès aux modèles d'image",
    docs: "https://platform.openai.com/docs/guides/image-generation",
  },
  google: {
    name: "Google Gemini API (images et vidéo Veo)",
    role: "Images de scène et plans vidéo générés à partir d'une image",
    keyHelp: "Clé Gemini API (Google AI Studio)",
    docs: "https://ai.google.dev/gemini-api/docs/video",
  },
  fal: {
    name: "fal.ai (modèles vidéo et image tiers)",
    role: "Alternative pour la vidéo image-vers-vidéo",
    keyHelp: "Clé fal.ai (Key …)",
    docs: "https://fal.ai/models",
  },
};

export type TaskId =
  | "vision_analysis"
  | "strategy"
  | "copywriting"
  | "theme_design"
  | "theme_edit"
  | "quality_control"
  | "social_planning"
  | "social_copy"
  | "classification"
  | "video_direction"
  | "image_generation"
  | "video_generation";

export const TASKS: Record<TaskId, { label: string; kind: "llm" | "image" | "video" }> = {
  vision_analysis: { label: "Analyse visuelle du produit", kind: "llm" },
  strategy: { label: "Direction de marque et stratégie", kind: "llm" },
  copywriting: { label: "Rédaction (fiches, pages, marque)", kind: "llm" },
  theme_design: { label: "Conception du thème boutique", kind: "llm" },
  theme_edit: { label: "Retouches du thème par conversation", kind: "llm" },
  quality_control: { label: "Contrôle qualité", kind: "llm" },
  social_planning: { label: "Planification éditoriale", kind: "llm" },
  social_copy: { label: "Textes des publications", kind: "llm" },
  classification: { label: "Classement des fichiers", kind: "llm" },
  video_direction: { label: "Réalisation vidéo (concept, storyboard)", kind: "llm" },
  image_generation: { label: "Génération d'images (décors)", kind: "image" },
  video_generation: { label: "Génération vidéo (plans)", kind: "video" },
};

export type Route = { provider: ProviderId; model: string; effort?: "low" | "medium" | "high" | "xhigh" | "max" };

export const DEFAULT_ROUTES: Record<TaskId, Route> = {
  vision_analysis: { provider: "anthropic", model: "claude-opus-5-5", effort: "medium" },
  strategy: { provider: "anthropic", model: "claude-opus-5-5", effort: "high" },
  copywriting: { provider: "anthropic", model: "claude-sonnet-5-5", effort: "medium" },
  theme_design: { provider: "anthropic", model: "claude-opus-5-5", effort: "high" },
  theme_edit: { provider: "anthropic", model: "claude-opus-5-5", effort: "medium" },
  quality_control: { provider: "anthropic", model: "claude-opus-5-5", effort: "low" },
  social_planning: { provider: "anthropic", model: "claude-opus-5-5", effort: "medium" },
  social_copy: { provider: "anthropic", model: "claude-sonnet-5-5", effort: "low" },
  classification: { provider: "anthropic", model: "claude-haiku-4-5" },
  video_direction: { provider: "anthropic", model: "claude-opus-5-5", effort: "medium" },
  image_generation: { provider: "openai", model: "gpt-image-1" },
  video_generation: { provider: "google", model: "veo-3.0-generate-001" },
};

/** Tarifs publics (USD) servant au calcul du coût. À vérifier et ajuster dans l'administration. */
export type Price =
  | { unit: "tokens"; inputPerM: number; outputPerM: number; imageInputPerM?: number; imageOutputPerM?: number }
  | { unit: "image"; perImage: number }
  | { unit: "video_second"; perSecond: number };

export const DEFAULT_PRICES: Record<string, Price> = {
  "anthropic:claude-fable-5-1": { unit: "tokens", inputPerM: 10, outputPerM: 50 },
  "anthropic:claude-opus-5-5": { unit: "tokens", inputPerM: 4, outputPerM: 20 },
  "anthropic:claude-sonnet-5-5": { unit: "tokens", inputPerM: 2, outputPerM: 10 },
  "anthropic:claude-haiku-4-5": { unit: "tokens", inputPerM: 1, outputPerM: 5 },
  "openai:gpt-image-1": { unit: "tokens", inputPerM: 5, outputPerM: 40, imageInputPerM: 10, imageOutputPerM: 40 },
  "google:gemini-2.5-flash-image": { unit: "image", perImage: 0.039 },
  "google:veo-3.0-generate-001": { unit: "video_second", perSecond: 0.4 },
  "google:veo-3.0-fast-generate-001": { unit: "video_second", perSecond: 0.15 },
  "fal:fal-ai/kling-video/v2.1/pro/image-to-video": { unit: "video_second", perSecond: 0.09 },
};

export function routeFor(task: TaskId): Route {
  const custom = getJsonSetting<Partial<Record<TaskId, Route>>>("ai.routes", {});
  return { ...DEFAULT_ROUTES[task], ...(custom[task] ?? {}) };
}

export function priceFor(provider: string, model: string): Price | null {
  const custom = getJsonSetting<Record<string, Price>>("ai.prices", {});
  return custom[`${provider}:${model}`] ?? DEFAULT_PRICES[`${provider}:${model}`] ?? null;
}

/** Tarifs à revérifier au-delà de ce délai (alerte dans l'administration). */
export const PRICE_REVIEW_DAYS = 90;

/** Date de la dernière vérification des tarifs par l'administration (null : jamais confirmés). */
export function pricesCheckedAt(): number | null {
  const v = Number(getSetting("ai.prices.checkedAt"));
  return Number.isFinite(v) && v > 0 ? v : null;
}

/**
 * Tarif obligatoire avant toute génération payante : un modèle sans tarif connu serait compté 0 €
 * et contournerait l'enveloppe IA des clients. La génération est donc refusée.
 */
export function requirePrice(provider: string, model: string): Price {
  const p = priceFor(provider, model);
  if (!p || !priceValid(p)) throw new UserFacingError(`Tarif inconnu pour ${provider}:${model} : renseignez-le dans l'administration (Modèles et tarifs) avant d'utiliser ce modèle.`);
  return p;
}

export function priceValid(p: Price): boolean {
  const pos = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n > 0;
  if (p.unit === "tokens") return pos(p.inputPerM) && pos(p.outputPerM);
  if (p.unit === "image") return pos(p.perImage);
  if (p.unit === "video_second") return pos(p.perSecond);
  return false;
}

export function usdToEur(): number {
  return getJsonSetting<number>("billing.usdToEur", 0.86);
}

export function providerKey(p: ProviderId): string | null {
  return getSetting(`provider.${p}.apiKey`);
}

export function providerEnabled(p: ProviderId): boolean {
  return !!providerKey(p) && getSetting(`provider.${p}.disabled`) !== "1";
}

/** Le moteur local fonctionne sans fournisseur : il ne remplace pas l'IA, il l'outille. */
export function aiAvailability() {
  const llm = providerEnabled("anthropic");
  const image = providerEnabled("openai") || providerEnabled("google");
  const video = providerEnabled("google") || providerEnabled("fal");
  // Vidéo UGC : une personne générée (images) puis animée (vidéo) ; la voix vient de Veo 3 (Google).
  const ugc = image && video;
  const ugcVoice = ugc && providerEnabled("google");
  return { llm, image, video, ugc, ugcVoice };
}
