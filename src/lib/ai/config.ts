/**
 * Fournisseurs, modèles et routage des tâches.
 * Tout est modifiable dans l'administration ; ces valeurs sont des points de
 * départ. Les clients n'ont jamais besoin de clé : E-COM STUDIO IA fournit l'IA.
 */
import { getJsonSetting, getSetting } from "../settings";
import { UserFacingError } from "../jobs";
import { L } from "../i18n-server";

export type ProviderId = "anthropic" | "openai" | "google" | "fal" | "pexels" | "pixabay";

// Libellés affichés dans l'administration : accesseurs évalués à la lecture, dans la langue de l'interface.
const provider = (name: { fr: string; en: string }, role: { fr: string; en: string }, keyHelp: { fr: string; en: string }, docs: string) => ({
  get name() {
    return L(name.fr, name.en);
  },
  get role() {
    return L(role.fr, role.en);
  },
  get keyHelp() {
    return L(keyHelp.fr, keyHelp.en);
  },
  docs,
});

export const PROVIDERS: Record<ProviderId, { readonly name: string; readonly role: string; readonly keyHelp: string; docs: string }> = {
  anthropic: provider(
    { fr: "Anthropic (Claude)", en: "Anthropic (Claude)" },
    { fr: "Analyse visuelle, stratégie, rédaction, code des thèmes, contrôle qualité", en: "Visual analysis, strategy, copywriting, theme code, quality control" },
    { fr: "Clé API de la console Anthropic (sk-ant-…)", en: "API key from the Anthropic Console (sk-ant-…)" },
    "https://platform.claude.com/",
  ),
  openai: provider(
    { fr: "OpenAI (images)", en: "OpenAI (images)" },
    { fr: "Génération et retouche d'images par masque (décors autour du produit réel)", en: "Mask-based image generation and editing (backgrounds around the real product)" },
    { fr: "Clé API OpenAI (sk-…) avec accès aux modèles d'image", en: "OpenAI API key (sk-…) with access to image models" },
    "https://platform.openai.com/docs/guides/image-generation",
  ),
  google: provider(
    { fr: "Google Gemini API (images et vidéo Veo)", en: "Google Gemini API (images and Veo video)" },
    { fr: "Images de scène et plans vidéo générés à partir d'une image", en: "Scene images and video shots generated from an image" },
    { fr: "Clé Gemini API (Google AI Studio)", en: "Gemini API key (Google AI Studio)" },
    "https://ai.google.dev/gemini-api/docs/video",
  ),
  fal: provider(
    { fr: "fal.ai (modèles vidéo et image tiers)", en: "fal.ai (third-party video and image models)" },
    { fr: "Alternative pour la vidéo image-vers-vidéo", en: "Alternative for image-to-video generation" },
    { fr: "Clé fal.ai (Key …)", en: "fal.ai key (Key …)" },
    "https://fal.ai/models",
  ),
  pexels: provider(
    { fr: "Pexels (photos libres de droits)", en: "Pexels (royalty-free photos)" },
    { fr: "Vraies photos du métier, gratuites, avant toute image payante (entreprises de services)", en: "Real trade photos, free, before any paid image (service businesses)" },
    { fr: "Clé API Pexels (gratuite)", en: "Pexels API key (free)" },
    "https://www.pexels.com/api/",
  ),
  pixabay: provider(
    { fr: "Pixabay (photos libres de droits)", en: "Pixabay (royalty-free photos)" },
    { fr: "Deuxième banque de photos gratuites, en complément de Pexels", en: "Second free photo library, alongside Pexels" },
    { fr: "Clé API Pixabay (gratuite)", en: "Pixabay API key (free)" },
    "https://pixabay.com/api/docs/",
  ),
};

export type TaskId =
  | "vision_analysis"
  | "strategy"
  | "copywriting"
  | "theme_design"
  | "theme_edit"
  | "theme_custom"
  | "quality_control"
  | "photo_triage"
  | "cutout_check"
  | "logo_symbol"
  | "social_planning"
  | "social_copy"
  | "classification"
  | "video_direction"
  | "art_direction"
  | "ad_creative"
  | "blog_topics"
  | "blog_writing"
  | "image_generation"
  | "video_generation";

const task = (fr: string, en: string, kind: "llm" | "image" | "video") => ({
  get label() {
    return L(fr, en);
  },
  kind,
});

/** Tâches et libellés (dans la langue de l'interface, évalués à la lecture). */
export const TASKS: Record<TaskId, { readonly label: string; kind: "llm" | "image" | "video" }> = {
  vision_analysis: task("Analyse visuelle du produit", "Product visual analysis", "llm"),
  strategy: task("Direction de marque et stratégie", "Brand direction and strategy", "llm"),
  copywriting: task("Rédaction (fiches, pages, marque)", "Copywriting (product pages, pages, brand)", "llm"),
  theme_design: task("Conception du thème boutique", "Store theme design", "llm"),
  theme_edit: task("Retouches du thème par conversation", "Theme edits via chat", "llm"),
  theme_custom: task("Thème entièrement sur mesure (plan et sections)", "Fully custom theme (plan and sections)", "llm"),
  quality_control: task("Contrôle qualité", "Quality control", "llm"),
  photo_triage: task("Tri des photos du produit avant détourage", "Product photo sorting before cutout", "llm"),
  cutout_check: task("Contrôle visuel des détourages", "Visual check of cutouts", "llm"),
  logo_symbol: task("Symbole de logo sur mesure (dessin vectoriel)", "Custom logo symbol (vector drawing)", "llm"),
  social_planning: task("Planification éditoriale", "Content planning", "llm"),
  social_copy: task("Textes des publications", "Social post copy", "llm"),
  classification: task("Classement des fichiers", "File organization", "llm"),
  video_direction: task("Réalisation vidéo (concept, storyboard)", "Video direction (concept, storyboard)", "llm"),
  art_direction: task("Direction artistique des images (briefs photo)", "Image art direction (photo briefs)", "llm"),
  ad_creative: task("Publicités (audiences, accroches, annonces, plan de test)", "Ads (audiences, hooks, ad copy, test plan)", "llm"),
  blog_topics: task("Sujets d'articles de blog", "Blog post topics", "llm"),
  blog_writing: task("Rédaction des articles de blog", "Blog post writing", "llm"),
  image_generation: task("Génération d'images (décors)", "Image generation (backgrounds)", "image"),
  video_generation: task("Génération vidéo (plans)", "Video generation (shots)", "video"),
};

export type Route = { provider: ProviderId; model: string; effort?: "low" | "medium" | "high" | "xhigh" | "max" };

export const DEFAULT_ROUTES: Record<TaskId, Route> = {
  vision_analysis: { provider: "anthropic", model: "claude-opus-5-5", effort: "medium" },
  strategy: { provider: "anthropic", model: "claude-opus-5-5", effort: "high" },
  // Textes de vente (accueil, fiche produit, FAQ) : enjeu direct sur la conversion, réflexion plus poussée.
  copywriting: { provider: "anthropic", model: "claude-sonnet-5-5", effort: "high" },
  theme_design: { provider: "anthropic", model: "claude-opus-5-5", effort: "high" },
  theme_edit: { provider: "anthropic", model: "claude-opus-5-5", effort: "medium" },
  theme_custom: { provider: "anthropic", model: "claude-opus-5-5", effort: "high" },
  // Contrôles (images, plans vidéo, relectures) : grille fixe, réponse courte — modèle solide mais moins cher que la création.
  quality_control: { provider: "anthropic", model: "claude-sonnet-5-5", effort: "low" },
  photo_triage: { provider: "anthropic", model: "claude-haiku-4-5" },
  cutout_check: { provider: "anthropic", model: "claude-sonnet-5-5", effort: "low" },
  logo_symbol: { provider: "anthropic", model: "claude-opus-5-5", effort: "medium" },
  social_planning: { provider: "anthropic", model: "claude-opus-5-5", effort: "medium" },
  // Reprises ciblées du calendrier et réécritures de l'éditeur : rédaction de community manager, effort moyen.
  social_copy: { provider: "anthropic", model: "claude-sonnet-5-5", effort: "medium" },
  classification: { provider: "anthropic", model: "claude-haiku-4-5" },
  video_direction: { provider: "anthropic", model: "claude-opus-5-5", effort: "medium" },
  // Brief photo : quelques centaines de mots, mais il conditionne une image payante (~0,17 $) — modèle fort, effort moyen.
  art_direction: { provider: "anthropic", model: "claude-opus-5-5", effort: "medium" },
  // Campagne de test complète (stratégie + annonces) : modèle fort, effort moyen ; une relecture notée et au plus une reprise.
  ad_creative: { provider: "anthropic", model: "claude-opus-5-5", effort: "medium" },
  // Sujets d'articles : stratégie de mots-clés et intention de recherche (Haiku trop superficiel), appel court.
  blog_topics: { provider: "anthropic", model: "claude-sonnet-5-5", effort: "low" },
  blog_writing: { provider: "anthropic", model: "claude-sonnet-5-5", effort: "medium" },
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
  if (!p || !priceValid(p)) throw new UserFacingError(L(`Tarif inconnu pour ${provider}:${model} : renseignez-le dans l'administration (Modèles et tarifs) avant d'utiliser ce modèle.`, `Unknown price for ${provider}:${model}. Enter it in the admin settings (Models and pricing) before using this model.`));
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

/**
 * Clés lues aussi dans l'environnement (ex. secrets GitHub Codespaces) : elles survivent à un codespace recréé,
 * sans passer par la base. La clé saisie dans l'administration reste prioritaire.
 */
const ENV_KEYS: Record<ProviderId, string[]> = { anthropic: ["ANTHROPIC_API_KEY"], openai: ["OPENAI_API_KEY"], google: ["GOOGLE_API_KEY", "GEMINI_API_KEY"], fal: ["FAL_KEY", "FAL_API_KEY"], pexels: ["PEXELS_API_KEY"], pixabay: ["PIXABAY_API_KEY"] };
export const providerEnvKey = (p: ProviderId): string | null => ENV_KEYS[p].map((k) => process.env[k]?.trim()).find(Boolean) ?? null;

export function providerKey(p: ProviderId): string | null {
  // Espaces ou retour à la ligne copiés avec la clé : retirés (sinon le fournisseur la refuse).
  return getSetting(`provider.${p}.apiKey`)?.trim() || providerEnvKey(p);
}

export function providerEnabled(p: ProviderId): boolean {
  return !!providerKey(p) && getSetting(`provider.${p}.disabled`) !== "1";
}

/**
 * Clé à utiliser pour un appel : aucune si le fournisseur est désactivé dans l'administration
 * (le bouton « Désactiver » coupe vraiment les appels, y compris avec une clé venant de l'environnement).
 */
export function activeProviderKey(p: ProviderId): string | null {
  return providerEnabled(p) ? providerKey(p) : null;
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
