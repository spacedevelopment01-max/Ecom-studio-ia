/**
 * Catalogue des modèles de TEXTE utilisables par le studio (Anthropic, OpenAI, Google Gemini).
 *
 * Seul endroit qui décrit, pour chaque modèle : identifiant exact, niveau (léger, standard, fort), capacités,
 * réglage de réflexion propre au fournisseur (effort Anthropic, `reasoning.effort` OpenAI, `thinkingLevel`
 * Gemini) avec les SEULES valeurs acceptées par ce modèle, limites (fenêtre, sortie maximale, seuil d'un autre
 * barème), latence relative et usage recommandé. Les tarifs restent dans config.ts (DEFAULT_PRICES, modifiables
 * dans l'administration).
 *
 * Règle de sécurité : un modèle dont le coût maximal ne peut pas être borné (limites ou tarif inconnus, sortie
 * non plafonnable) n'est jamais proposé ni appelé. Les modèles non vérifiés sur les pages officielles sont
 * marqués `verified: false` et restent inutilisables tant que l'administration ne les a pas confirmés.
 */
import type { Tier } from "../orchestrator/capabilities";
import { getJsonSetting } from "../settings";
import { L } from "../i18n-server";
import { activeProviderKey, priceFor, priceValid } from "./config";

export type TextProvider = "anthropic" | "openai" | "google";

/** Paramètre de réflexion propre au fournisseur. */
export type EffortKind = "anthropic_effort" | "openai_reasoning" | "gemini_thinking_level" | "none";

export type TextModel = {
  provider: TextProvider;
  model: string;
  label: string;
  tier: Exclude<Tier, "local">;
  vision: boolean;
  structured: boolean;
  /** Réglage de réflexion et valeurs acceptées par CE modèle (vide : aucun réglage à afficher). */
  effort: { kind: EffortKind; values: string[]; default: string | null };
  /** Fenêtre d'entrée, sortie maximale (réflexion comprise) et seuil au-delà duquel un autre barème s'applique. */
  limits: { context: number; maxOutput: number; flatPriceUpTo: number };
  /** Latence relative (1 = la plus rapide) : départage seulement. */
  latency: 1 | 2 | 3;
  /** Comptage exact des jetons d'entrée avant l'envoi (endpoint gratuit du fournisseur). */
  exactCount: boolean;
  /** Identifiant, tarif et paramètres confirmés sur la documentation officielle. */
  verified: boolean;
  /** Source officielle des informations (affichée dans l'administration). */
  source: string;
  use: { fr: string; en: string };
};

const ANTHROPIC_EFFORT = ["low", "medium", "high", "xhigh", "max"];

export const TEXT_MODELS: TextModel[] = [
  {
    provider: "anthropic",
    model: "claude-opus-5-5",
    label: "Claude Opus 5.5",
    tier: "strong",
    vision: true,
    structured: true,
    effort: { kind: "anthropic_effort", values: ANTHROPIC_EFFORT, default: "medium" },
    limits: { context: 1_000_000, maxOutput: 128_000, flatPriceUpTo: 200_000 },
    latency: 3,
    exactCount: true,
    verified: true,
    source: "https://platform.claude.com/docs/en/about-claude/models/overview",
    use: { fr: "Stratégie de marque, direction artistique, thème sur mesure : quand la qualité créative décide du résultat.", en: "Brand strategy, art direction, custom theme: when creative quality decides the result." },
  },
  {
    provider: "anthropic",
    model: "claude-sonnet-5-5",
    label: "Claude Sonnet 5.5",
    tier: "standard",
    vision: true,
    structured: true,
    effort: { kind: "anthropic_effort", values: ANTHROPIC_EFFORT, default: "high" },
    limits: { context: 1_000_000, maxOutput: 128_000, flatPriceUpTo: 200_000 },
    latency: 2,
    exactCount: true,
    verified: true,
    source: "https://platform.claude.com/docs/en/about-claude/models/overview",
    use: { fr: "Rédaction, contrôles qualité à grille, articles : très bon rapport qualité / prix.", en: "Copywriting, grid-based quality checks, articles: very good value." },
  },
  {
    provider: "anthropic",
    model: "claude-haiku-5-5",
    label: "Claude Haiku 5.5",
    tier: "light",
    vision: true,
    structured: true,
    effort: { kind: "anthropic_effort", values: ANTHROPIC_EFFORT, default: "medium" },
    limits: { context: 1_000_000, maxOutput: 128_000, flatPriceUpTo: 100_000 },
    latency: 1,
    exactCount: true,
    verified: true,
    source: "https://platform.claude.com/docs/en/about-claude/models/overview",
    use: { fr: "Tri des photos, classement, contrôles courts : rapide et très économique.", en: "Photo sorting, classification, short checks: fast and very cheap." },
  },
  {
    provider: "anthropic",
    model: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    tier: "light",
    vision: true,
    structured: true,
    // Génération précédente : réflexion par budget de jetons uniquement, aucun effort réglable.
    effort: { kind: "none", values: [], default: null },
    limits: { context: 200_000, maxOutput: 64_000, flatPriceUpTo: 200_000 },
    latency: 1,
    exactCount: true,
    verified: true,
    source: "https://platform.claude.com/docs/en/about-claude/models/overview",
    use: { fr: "Modèle léger actuel du routage manuel ; Haiku 5.5 est 10 fois moins cher.", en: "Current light model of manual routing; Haiku 5.5 is 10 times cheaper." },
  },
  // OpenAI : identifiants présents dans la spécification officielle de l'API (openai-openapi, enum des modèles).
  // Tarifs, limites et valeurs d'effort acceptées par modèle NON VÉRIFIÉS (pages officielles inaccessibles depuis
  // l'environnement de développement) : verrouillés jusqu'à confirmation dans l'administration.
  // `max_output_tokens` inclut la réflexion (spécification officielle) : le coût maximal est borné une fois le
  // tarif confirmé ; comptage exact gratuit par POST /v1/responses/input_tokens.
  {
    provider: "openai",
    // Présent dans la liste des modèles du compte (GET /v1/models). Tarif public relevé sur des sources non
    // officielles (4 $ / 20 $ ou 5 $ / 30 $ par million) : à saisir et confirmer dans l'administration.
    model: "gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    tier: "strong",
    vision: true,
    structured: true,
    effort: { kind: "openai_reasoning", values: ["low", "medium", "high"], default: "medium" },
    limits: { context: 128_000, maxOutput: 32_000, flatPriceUpTo: 128_000 },
    latency: 3,
    exactCount: true,
    verified: false,
    source: "https://raw.githubusercontent.com/openai/openai-openapi/master/openapi.yaml",
    use: { fr: "Candidat pour la direction artistique et la stratégie de marque, à comparer à Opus 5.5 après essai réel.", en: "Candidate for art direction and brand strategy, to compare with Opus 5.5 after a real trial." },
  },
  {
    provider: "openai",
    model: "gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    tier: "standard",
    vision: true,
    structured: true,
    // Sous-ensemble prudent (accepté par les modèles de raisonnement GPT-5) ; valeurs propres au modèle à confirmer.
    effort: { kind: "openai_reasoning", values: ["low", "medium", "high"], default: "medium" },
    // Limites prudentes tant que les vraies ne sont pas confirmées (une demande plus longue est refusée, jamais facturée).
    limits: { context: 128_000, maxOutput: 32_000, flatPriceUpTo: 128_000 },
    latency: 2,
    exactCount: true,
    verified: false,
    source: "https://raw.githubusercontent.com/openai/openai-openapi/master/openapi.yaml",
    use: { fr: "Candidat pour la rédaction et les contrôles à grille, à comparer à Sonnet 5.5 après essai réel.", en: "Candidate for copywriting and grid checks, to compare with Sonnet 5.5 after a real trial." },
  },
  {
    provider: "openai",
    model: "gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    tier: "light",
    vision: true,
    structured: true,
    effort: { kind: "openai_reasoning", values: ["low", "medium", "high"], default: "low" },
    limits: { context: 128_000, maxOutput: 16_000, flatPriceUpTo: 128_000 },
    latency: 1,
    exactCount: true,
    verified: false,
    source: "https://raw.githubusercontent.com/openai/openai-openapi/master/openapi.yaml",
    use: { fr: "Candidat pour le tri et le classement, à comparer à Haiku 5.5.", en: "Candidate for sorting and classification, to compare with Haiku 5.5." },
  },
  // Google Gemini : `thinkingLevel` (MINIMAL, LOW, MEDIUM, HIGH) confirmé par le document de découverte officiel de
  // l'API ; comptage exact gratuit (countTokens). Identifiants exacts, tarifs de l'API Gemini et prise en compte de
  // la réflexion dans `maxOutputTokens` NON VÉRIFIÉS : le coût maximal réservé compte donc la réflexion EN PLUS de
  // la sortie (borne prudente), et le modèle reste verrouillé jusqu'à confirmation.
  {
    provider: "google",
    model: "gemini-3.8-flash",
    label: "Gemini 3.8 Flash",
    tier: "standard",
    vision: true,
    structured: true,
    effort: { kind: "gemini_thinking_level", values: ["minimal", "low", "medium", "high"], default: "medium" },
    limits: { context: 128_000, maxOutput: 32_000, flatPriceUpTo: 128_000 },
    latency: 1,
    exactCount: true,
    verified: false,
    source: "https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta",
    use: { fr: "Candidat rapide pour la rédaction courte, les sujets d'articles et les contrôles, à comparer à Sonnet 5.5.", en: "Fast candidate for short copy, blog topics and checks, to compare with Sonnet 5.5." },
  },
  {
    provider: "google",
    model: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash-Lite",
    tier: "light",
    vision: true,
    structured: true,
    effort: { kind: "gemini_thinking_level", values: ["minimal", "low", "medium", "high"], default: "low" },
    limits: { context: 128_000, maxOutput: 16_000, flatPriceUpTo: 128_000 },
    latency: 1,
    exactCount: true,
    verified: false,
    source: "https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta",
    use: { fr: "Candidat pour le tri et le classement à très grand volume, à comparer à Haiku 5.5.", en: "Candidate for very high-volume sorting and classification, to compare with Haiku 5.5." },
  },
];

/** Réflexion facturée en plus du plafond de sortie (Gemini : non confirmé) : comptée dans le coût maximal. */
export const thinkingOutsideMaxOutput = (provider: string) => provider === "google";

export const textModel = (provider: string, model: string): TextModel | null => TEXT_MODELS.find((m) => m.provider === provider && m.model === model) ?? null;

/** Réglages de l'administration par modèle (« ai.textModels ») : activation pour le routage automatique, confirmation. */
export type ModelAdmin = { enabled?: boolean; confirmedAt?: number };
export const modelAdmin = (): Record<string, ModelAdmin> => getJsonSetting<Record<string, ModelAdmin>>("ai.textModels", {});

export type ModelStatus = { key: string; usable: boolean; autoEligible: boolean; confirmed: boolean; enabled: boolean; reasons: string[] };

/**
 * État réel d'un modèle : utilisable seulement si sa clé est active, son tarif connu et valide, et ses informations
 * vérifiées (documentation officielle ou confirmation de l'administration). Éligible au routage automatique
 * seulement s'il est en plus activé (Anthropic : activé par défaut ; OpenAI et Gemini : jamais par défaut).
 */
export function modelStatus(m: TextModel, admin: Record<string, ModelAdmin> = modelAdmin()): ModelStatus {
  const key = `${m.provider}:${m.model}`;
  const a = admin[key] ?? {};
  const reasons: string[] = [];
  if (!activeProviderKey(m.provider)) reasons.push(L("clé du fournisseur absente ou désactivée", "provider key missing or disabled"));
  const p = priceFor(m.provider, m.model);
  if (!p || !priceValid(p) || p.unit !== "tokens") reasons.push(L("tarif non renseigné", "price not set"));
  const confirmed = m.verified || !!a.confirmedAt;
  if (!confirmed) reasons.push(L("identifiant, tarif et limites à confirmer", "ID, price and limits to confirm"));
  const usable = reasons.length === 0;
  const enabled = a.enabled ?? m.provider === "anthropic";
  return { key, usable, confirmed, enabled, autoEligible: usable && enabled, reasons };
}

/** Valeurs d'effort réellement acceptées par un modèle (vide : ne rien afficher, ne rien envoyer). */
export function effortValues(provider: string, model: string): string[] {
  return textModel(provider, model)?.effort.values ?? [];
}

/** Effort valide pour ce modèle, sinon null (jamais une valeur que le fournisseur refuserait). */
export function validEffort(provider: string, model: string, effort: string | null | undefined): string | null {
  if (!effort) return null;
  return effortValues(provider, model).includes(effort) ? effort : null;
}

/**
 * Traduit un effort exprimé sur l'échelle de la politique (low → max) vers la valeur la plus proche acceptée par
 * le modèle, sans jamais descendre sous le niveau demandé quand une valeur supérieure existe (la qualité d'abord).
 */
export function mapEffort(provider: string, model: string, wanted: string | null | undefined): string | null {
  const values = effortValues(provider, model);
  if (!values.length) return null;
  const want = wanted ?? textModel(provider, model)?.effort.default ?? null;
  if (!want) return null;
  if (values.includes(want)) return want;
  const scale = ["none", "minimal", "low", "medium", "high", "xhigh", "max"];
  const rank = (v: string) => scale.indexOf(v);
  const up = values.filter((v) => rank(v) >= rank(want)).sort((a, b) => rank(a) - rank(b))[0];
  return up ?? values.filter((v) => rank(v) >= 0).sort((a, b) => rank(b) - rank(a))[0] ?? null;
}
