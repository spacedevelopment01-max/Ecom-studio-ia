/**
 * Fournisseurs, modèles et routage des tâches.
 * Tout est modifiable dans l'administration ; ces valeurs sont des points de
 * départ. Les clients n'ont jamais besoin de clé : E-COM STUDIO IA fournit l'IA.
 */
import { getJsonSetting, getSetting } from "../settings";
import { UserFacingError } from "../jobs";
import { L } from "../i18n-server";
import { POLICY_ROUTES } from "../orchestrator/policy";
import { GATEWAY_KEY, gatewayProviders } from "./gateway";
export { bearer, falAuth, GATEWAY_KEY, gatewayProviders, isGatewayKey } from "./gateway";

export type ProviderId = "anthropic" | "openai" | "google" | "fal" | "alibaba" | "pexels" | "pixabay" | "vertex" | "kling" | "byteplus" | "runware" | "bfl";

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
  // Fabricants vidéo accordés par le propriétaire (référence, partie 16 : 18 novembre 2026 ; Seedance le 21). Inactifs
  // tant que leur clé n'est pas saisie ici ; chaque modèle attend aussi la confirmation de l'administration.
  vertex: provider({ fr: "Google Vertex AI (vidéo Veo 3.1)", en: "Google Vertex AI (Veo 3.1 video)" }, { fr: "Plans vidéo Veo 3.1 Fast et Lite, image de départ et de fin, personnes interdites sans accord (calcul aux États-Unis)", en: "Veo 3.1 Fast and Lite video shots, start and end frame, people disallowed without consent (computed in the United States)" }, { fr: "Clé d'API Google Cloud (mode express) ; ou jeton d'accès avec l'identifiant du projet ci-dessous", en: "Google Cloud API key (express mode); or access token with the project ID below" }, "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/veo/3-1-generate"),
  kling: provider({ fr: "Kling en direct (vidéo)", en: "Kling direct (video)" }, { fr: "Plans vidéo Kling 4.0, durée toujours envoyée, fichiers copiés tout de suite (gardés 30 jours chez Kling)", en: "Kling 4.0 video shots, duration always sent, files copied right away (kept 30 days at Kling)" }, { fr: "Clé d'API de la console Kling", en: "API key from the Kling console" }, "https://kling.ai/document-api/llms.txt"),
  byteplus: provider({ fr: "BytePlus ModelArk (vidéo Seedance)", en: "BytePlus ModelArk (Seedance video)" }, { fr: "Plans vidéo Seedance, identifiant haché du client envoyé à chaque appel, brouillon avant la version finale", en: "Seedance video shots, hashed customer ID sent with each call, draft before the final version" }, { fr: "Clé d'API ModelArk (région Asie du Sud-Est)", en: "ModelArk API key (Southeast Asia region)" }, "https://docs.byteplus.com/en/docs/modelark/model-list"),
  // Black Forest Labs (Flux), accordé le 18 novembre 2026 (contrat européen) : seulement au choix du client dans
  // l'atelier (retouche guidée, agrandir le cadre, scène avec référence). Inactif tant que sa clé n'est pas saisie ici.
  bfl: provider({ fr: "Black Forest Labs (images Flux)", en: "Black Forest Labs (Flux images)" }, { fr: "Atelier : retouche guidée (Kontext), version story ou carrée (agrandir le cadre), scène avec la photo du produit (FLUX.2) ; point d'accès européen", en: "Workshop: guided edits (Kontext), story or square version (expand the frame), scene from the product photo (FLUX.2); European endpoint" }, { fr: "Clé d'API de Black Forest Labs (en-tête x-key)", en: "Black Forest Labs API key (x-key header)" }, "https://docs.bfl.ai"),
  runware: provider({ fr: "Runware (secours vidéo)", en: "Runware (video backup)" }, { fr: "Seul intermédiaire accordé, en secours quand un fabricant est en panne ; coût exact de chaque appel", en: "Only approved intermediary, as backup when a maker is down; exact cost of each call" }, { fr: "Clé d'API Runware", en: "Runware API key" }, "https://runware.ai/docs/llms.txt"),
  anthropic: provider(
    { fr: "Anthropic (Claude)", en: "Anthropic (Claude)" },
    { fr: "Compréhension de l’offre, stratégie, rédaction, code des thèmes, contrôle qualité", en: "Offer understanding, strategy, copywriting, theme code, quality control" },
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
  alibaba: provider(
    { fr: "Alibaba Cloud — Images & Vidéos (Model Studio)", en: "Alibaba Cloud — Images & Videos (Model Studio)" },
    { fr: "Images Qwen-Image et vidéos Wan uniquement (aucun texte, aucun SEO)", en: "Qwen-Image images and Wan videos only (no text, no SEO)" },
    { fr: "Clé API Model Studio (DashScope, sk-…) de la région choisie ci-dessous", en: "Model Studio (DashScope) API key (sk-…) for the region chosen below" },
    "https://www.alibabacloud.com/help/en/model-studio/",
  ),
  pexels: provider(
    { fr: "Pexels (photos libres de droits)", en: "Pexels (royalty-free photos)" },
    { fr: "Vraies photos du métier, gratuites, avant toute image payante (entreprises de services)", en: "Real trade photos, free, before any paid image (service businesses)" },
    { fr: "Clé API Pexels (gratuite ; nouvelles clés parfois suspendues par Pexels : Pixabay fait aussi photos et vidéos)", en: "Pexels API key (free; Pexels sometimes suspends new keys: Pixabay also provides photos and videos)" },
    "https://www.pexels.com/api/",
  ),
  pixabay: provider(
    { fr: "Pixabay (photos libres de droits)", en: "Pixabay (royalty-free photos)" },
    { fr: "Photos et vidéos libres de droits, gratuites (montages vidéo, visuels)", en: "Free royalty-free photos and videos (video edits, visuals)" },
    { fr: "Clé API Pixabay (gratuite)", en: "Pixabay API key (free)" },
    "https://pixabay.com/api/docs/",
  ),
};

export type TaskId =
  | 'agent_conversation'
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
  agent_conversation: task('Dialogue de l’agent central', 'Central assistant conversation', 'llm'),
  // Commun aux produits et aux services (#204) : lecture de la description, du lien et des photos éventuelles.
  vision_analysis: task("Compréhension de l’offre (texte et photos)", "Offer understanding (text and photos)", "llm"),
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

/**
 * Effort : valeur propre au fournisseur et au modèle (Anthropic `output_config.effort`, OpenAI `reasoning.effort`,
 * Gemini `thinkingLevel`), validée par le catalogue des modèles de texte (text-models.ts).
 */
export type Route = { provider: ProviderId; model: string; effort?: string };

/**
 * Routage par défaut de chaque tâche : dérivé de la politique centrale (src/lib/orchestrator/policy.ts), seul
 * endroit qui décrit capacité, niveau et effort par tâche. Le réglage « ai.routes » de l'administration prime.
 */
export const DEFAULT_ROUTES: Record<TaskId, Route> = POLICY_ROUTES;

/** Tarifs publics (USD) servant au calcul du coût. À vérifier et ajuster dans l'administration. */
export type Price =
  | { unit: "tokens"; inputPerM: number; outputPerM: number; imageInputPerM?: number; imageOutputPerM?: number }
  /**
   * Image au forfait. `perImage` est la borne de réservation (le plafond de la carte) ; quand le fournisseur rend ses
   * jetons (OpenAI), le coût compté est celui des jetons réels : texte `inputPerM`, image jointe `imageInputPerM`, sortie
   * `outputPerM` (22 novembre 2026 : 0,12 $ comptés par image quand la facture en dit environ deux fois moins).
   */
  | { unit: "image"; perImage: number; inputPerM?: number; imageInputPerM?: number; outputPerM?: number }
  | { unit: "video_second"; perSecond: number }
  /** Outil facturé à l'appel (ex. recherche web OpenAI : `openai:web_search`). */
  | { unit: "call"; perCall: number };

export const DEFAULT_PRICES: Record<string, Price> = {
  "anthropic:claude-fable-5-1": { unit: "tokens", inputPerM: 10, outputPerM: 50 },
  "anthropic:claude-opus-5-5": { unit: "tokens", inputPerM: 4, outputPerM: 20 },
  "anthropic:claude-sonnet-5-5": { unit: "tokens", inputPerM: 2, outputPerM: 10 },
  "anthropic:claude-haiku-5-5": { unit: "tokens", inputPerM: 0.1, outputPerM: 0.5 },
  "anthropic:claude-haiku-4-5": { unit: "tokens", inputPerM: 1, outputPerM: 5 },
  "openai:gpt-image-2.5-sunburst": { unit: "tokens", inputPerM: 5, outputPerM: 30, imageInputPerM: 8, imageOutputPerM: 30 },
  // GPT Image 2.6 (relevé du 10 novembre 2026, pages officielles des modèles : texte entrée 5 $/M, image entrée 8 $/M,
  // sortie 30 $/M, comme le 2.5 ; consommation « high » inchangée, « low » et « medium » environ 4 fois plus) : borne PAR
  // IMAGE, la table des jetons de sortie du 2.6 n'étant pas publiée. Mesuré en réel sur le 2.5 Flare « high » : 1 372 à
  // 1 909 jetons de sortie, soit ≈ 0,06 $ ; borne 0,12 $ par prudence, à ajuster après les premiers appels réels.
  "openai:gpt-image-2.6-flare": { unit: "image", perImage: 0.12, inputPerM: 5, imageInputPerM: 8, outputPerM: 30 },
  "openai:gpt-image-2.6-sunburst": { unit: "image", perImage: 0.12, inputPerM: 5, imageInputPerM: 8, outputPerM: 30 },
  "openai:gpt-image-1": { unit: "tokens", inputPerM: 5, outputPerM: 40, imageInputPerM: 10, imageOutputPerM: 40 },
  "google:gemini-2.5-flash-image": { unit: "image", perImage: 0.039, inputPerM: 0.3 },
  "google:veo-3.0-generate-001": { unit: "video_second", perSecond: 0.4 },
  "google:veo-3.0-fast-generate-001": { unit: "video_second", perSecond: 0.15 },
  "fal:fal-ai/kling-video/v2.1/pro/image-to-video": { unit: "video_second", perSecond: 0.09 },
  // Vidéo en direct (rapport 09, prix officiels lus le 22 novembre 2026, 720p sans son) : à confirmer dans l'administration.
  "vertex:veo-3.1-fast-generate-001": { unit: "video_second", perSecond: 0.08 },
  "vertex:veo-3.1-lite-generate-001": { unit: "video_second", perSecond: 0.03 },
  "kling:kling-4.0": { unit: "video_second", perSecond: 0.157 },
  "kling:kling-4.0-flash": { unit: "video_second", perSecond: 0.094 },
  "byteplus:dreamina-seedance-2-0-mini-260615": { unit: "video_second", perSecond: 0.08 },
  "byteplus:dreamina-seedance-2-0-fast-260128": { unit: "video_second", perSecond: 0.12 },
  "byteplus:dreamina-seedance-2-5-260628": { unit: "video_second", perSecond: 0.231 },
  // Black Forest Labs (Flux), prix officiels relevés par le rapport 10 du 22 novembre 2026 (https://bfl.ai/pricing),
  // 1 mégapixel : à confirmer dans l'administration avant tout usage.
  "bfl:flux-kontext-pro": { unit: "image", perImage: 0.04 },
  "bfl:flux-2-pro": { unit: "image", perImage: 0.045 },
  "bfl:flux-pro-1.0-expand": { unit: "image", perImage: 0.05 },
  "bfl:flux-pro-1.0-fill": { unit: "image", perImage: 0.05 },
  "runware:alibaba:wan@2.6-flash": { unit: "video_second", perSecond: 0.025 },
  "runware:google:veo@3.1-lite": { unit: "video_second", perSecond: 0.03 },
  "runware:klingai:6@1": { unit: "video_second", perSecond: 0.042 },
  "runware:bytedance:seedance@2.0-mini": { unit: "video_second", perSecond: 0.081 },
  // Alibaba Cloud Model Studio (région internationale) : tarifs lus dans l'API officielle des modèles le 15/10/2026.
  // Qwen-Image 3.0 : facturé par image produite (1K / 2K) + 0,003 $ par image d'entrée. Borne retenue : sortie 2K
  // + deux images d'entrée (le studio en envoie au plus deux) → jamais dépassée.
  "alibaba:qwen-image-3.0-pro": { unit: "image", perImage: 0.081 },
  "alibaba:qwen-image-3.0": { unit: "image", perImage: 0.036 },
  "alibaba:qwen-image-2.1-turbo": { unit: "image", perImage: 0.016 },
  "alibaba:qwen-image-2.1-pro": { unit: "image", perImage: 0.04 },
  "alibaba:qwen-image-2.0": { unit: "image", perImage: 0.035 },
  "alibaba:qwen-image-2.0-pro": { unit: "image", perImage: 0.075 },
  "alibaba:wan2.2-i2v-flash": { unit: "video_second", perSecond: 0.036 },
  // 1080P sans son (demandé ainsi par le studio) : tarif de l'API officielle « 1080P_no_audio », vérifié le 15/10/2026.
  "alibaba:wan2.6-i2v-flash": { unit: "video_second", perSecond: 0.0375 },
  "alibaba:wan2.7-i2v": { unit: "video_second", perSecond: 0.1 },
  "alibaba:wan2.7-t2v": { unit: "video_second", perSecond: 0.1 },
  "alibaba:wan3.0-video": { unit: "video_second", perSecond: 0.1 },
  "alibaba:wan3.0-video-prime": { unit: "video_second", perSecond: 0.14 },
};

/**
 * Fournisseurs quittés par le propriétaire (22 novembre 2026 : Higgsfield, remplacé par Runware comme seul intermédiaire
 * de secours). Un réglage déjà enregistré en base qui en choisit un est ignoré : le Studio retombe sur le réglage par
 * défaut, sans rien changer à la base.
 */
export const FOURNISSEURS_QUITTES: ReadonlySet<string> = new Set(["higgsfield"]);

export function routeFor(task: TaskId): Route {
  const custom = getJsonSetting<Partial<Record<TaskId, Route>>>("ai.routes", {});
  const own = custom[task];
  return { ...DEFAULT_ROUTES[task], ...(own && !FOURNISSEURS_QUITTES.has(String(own.provider ?? "")) ? own : {}) };
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
  assertPricesFresh();
  return p;
}

/**
 * Tarifs (et taux USD → EUR) jamais confirmés ou confirmés il y a plus de PRICE_REVIEW_DAYS jours : un tarif
 * périmé pourrait sous-estimer la dépense réelle chez le fournisseur. Toute génération payante est alors refusée
 * (jamais d'estimation optimiste) jusqu'à la confirmation dans l'administration (« J'ai vérifié les tarifs »).
 */
export function assertPricesFresh() {
  const at = pricesCheckedAt();
  if (at && Date.now() - at <= PRICE_REVIEW_DAYS * 86400_000) return;
  throw new UserFacingError(
    at
      ? L(`Tarifs des fournisseurs d'IA vérifiés il y a plus de ${PRICE_REVIEW_DAYS} jours : générations payantes suspendues jusqu'à leur vérification dans l'administration.`, `AI provider prices were checked more than ${PRICE_REVIEW_DAYS} days ago: paid generations are paused until they're checked in the admin settings.`)
      : L("Tarifs des fournisseurs d'IA jamais confirmés : générations payantes suspendues jusqu'à leur vérification dans l'administration.", "AI provider prices have never been confirmed: paid generations are paused until they're checked in the admin settings."),
  );
}

/**
 * Limites réelles des modèles de texte (documentation Anthropic) : fenêtre d'entrée, sortie maximale, et seuil
 * au-delà duquel un autre barème peut s'appliquer (au-delà, l'appel est refusé : barème non garanti).
 * Modèle absent de cette table : refusé (limites inconnues = coût non borné).
 */
export const TEXT_MODEL_LIMITS: Record<string, { context: number; maxOutput: number; flatPriceUpTo: number }> = {
  "claude-fable-5-1": { context: 1_000_000, maxOutput: 128_000, flatPriceUpTo: 200_000 },
  "claude-opus-5-5": { context: 1_000_000, maxOutput: 128_000, flatPriceUpTo: 200_000 },
  "claude-sonnet-5-5": { context: 1_000_000, maxOutput: 128_000, flatPriceUpTo: 200_000 },
  "claude-haiku-5-5": { context: 1_000_000, maxOutput: 128_000, flatPriceUpTo: 100_000 },
  "claude-haiku-4-5": { context: 200_000, maxOutput: 64_000, flatPriceUpTo: 200_000 },
};

/** Marge de change appliquée au coût MAXIMAL réservé (le fournisseur facture en dollars). */
export const FX_SAFETY = 1.05;

export function priceValid(p: Price): boolean {
  const pos = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n > 0;
  if (p.unit === "tokens") return pos(p.inputPerM) && pos(p.outputPerM);
  if (p.unit === "image") return pos(p.perImage);
  if (p.unit === "video_second") return pos(p.perSecond);
  if (p.unit === "call") return pos(p.perCall);
  return false;
}

export function usdToEur(): number {
  return getJsonSetting<number>("billing.usdToEur", 0.86);
}

/**
 * Clés lues aussi dans l'environnement (ex. secrets GitHub Codespaces) : elles survivent à un codespace recréé,
 * sans passer par la base. La clé saisie dans l'administration reste prioritaire.
 */
const ENV_KEYS: Record<ProviderId, string[]> = { vertex: [], kling: [], byteplus: [], runware: [], bfl: [], anthropic: ["ANTHROPIC_API_KEY"], openai: ["OPENAI_API_KEY"], google: ["GOOGLE_API_KEY", "GEMINI_API_KEY"], fal: ["FAL_KEY", "FAL_API_KEY"], alibaba: ["DASHSCOPE_API_KEY", "ALIBABA_MODEL_STUDIO_API_KEY"], pexels: ["PEXELS_API_KEY"], pixabay: ["PIXABAY_API_KEY"] };
export const providerEnvKey = (p: ProviderId): string | null => ENV_KEYS[p].map((k) => process.env[k]?.trim()).find(Boolean) ?? null;

export function providerKey(p: ProviderId): string | null {
  // Espaces ou retour à la ligne copiés avec la clé : retirés (sinon le fournisseur la refuse).
  return getSetting(`provider.${p}.apiKey`)?.trim() || providerEnvKey(p) || (gatewayProviders().includes(p) ? GATEWAY_KEY : null);
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
  const image = providerEnabled("openai") || providerEnabled("google") || providerEnabled("alibaba");
  const video = providerEnabled("google") || providerEnabled("fal") || providerEnabled("alibaba") || providerEnabled("vertex") || providerEnabled("kling") || providerEnabled("byteplus") || providerEnabled("runware");
  // Vidéo UGC : une personne générée (images) puis animée (vidéo) ; la voix vient de Veo 3 (Google).
  const ugc = image && video;
  const ugcVoice = ugc && providerEnabled("google");
  return { llm, image, video, ugc, ugcVoice };
}
