/**
 * Appels Claude (Anthropic SDK) avec :
 *  - routage par tâche (modèle et effort réglables dans l'administration),
 *  - sorties JSON validées par Zod (sorties structurées ou réparation guidée),
 *  - images de référence (vision),
 *  - comptabilisation exacte des tokens dans l'enveloppe IA du client,
 *  - coût MAXIMAL réservé avant l'envoi, à partir du comptage officiel des jetons (count_tokens) ;
 *  - aucun repli serveur vers un autre modèle (son tarif ne serait pas couvert par la réservation) ;
 *  - aucune relance automatique du SDK (chaque requête facturable est couverte par une réservation).
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import sharp from "sharp";
import type { z } from "zod";
import { balance, EUR, recordUsage, release, reserve, settleUncertain } from "../billing";
import { assertAiAllowed, currentUserHasAiCredits } from "./access";
import { PermanentError, UserFacingError } from "../jobs";
import { activeProviderKey, FX_SAFETY, priceFor, requirePrice, routeFor, TEXT_MODEL_LIMITS, usdToEur, type TaskId } from "./config";
import { contentLang, L, uiLang } from "../i18n-server";
import { languageDirective } from "./prompts";
import { AsyncLocalStorage } from "node:async_hooks";
import { assertUnderCostCap, recordCall, redact, shortHash } from "./trace";
import { brainMetaOf } from "../brain/facade";
import { getJsonSetting } from "../settings";
import { route, type Difficulty, type RouteDecision, type RoutingHistory } from "../orchestrator/router";
import { routingHistoryFor } from "../orchestrator/history";
import { pinnedTasks, routingMode } from "../orchestrator/text-routing";
import type { Deliverable } from "../quality/policies";
import { mapEffort, modelStatus, TEXT_MODELS, textModel, thinkingOutsideMaxOutput } from "./text-models";
import { ProviderHttpError, hasTextAdapter, textAdapters, type TextPart, type TextRequest, type TextResult, type TextTurn } from "./text-providers";

export type LlmImage = { data: Buffer; label?: string };

export type LlmCall = {
  task: TaskId;
  userId: string;
  projectId?: string | null;
  jobId?: string | null;
  /** Instructions spécialisées de la tâche (stables, mises en cache). */
  system: string;
  /** Contexte commun du projet (mémoire), placé avant la demande. */
  context?: string;
  /** Référence stable d'une tâche (catalogue des sections, réglages…) : mise en cache avec le contexte. */
  reference?: string;
  prompt: string;
  images?: LlmImage[];
  maxTokens?: number;
  /** Clé d'idempotence de la consommation (reprise sans double débit). */
  usageKey?: string;
  /** Nom du prompt système (trace) ; à défaut, la tâche. Le texte du prompt n'est jamais enregistré. */
  promptKey?: string;
  /**
   * Contexte VOLATIL (créations récentes…) : placé après le point de cache, il ne change jamais le préfixe mis en
   * cache. À défaut, celui du Project Brain associé au contexte (projectContext) est utilisé.
   */
  volatile?: string;
  /** Portée, empreinte et version du Project Brain (trace) ; à défaut, déduites du contexte projectContext. */
  brain?: { scope: string; hash: string; version: string };
  /**
   * Router V2 : difficulté, livrable contrôlé et historique de l'étape (note précédente, verdict, cause d'échec).
   * Absent : le routage par défaut de la tâche (identique à celui d'avant la phase 3).
   */
  routing?: { difficulty?: Difficulty; deliverable?: Deliverable; history?: RoutingHistory };
};

/**
 * Modèle d'un appel, choisi par le Router V2 (politique centrale + route fixée par l'administration + historique).
 * Un appel arrivé ici est déjà engagé vers l'IA : jamais de bascule silencieuse vers le moteur local.
 */
export function routeLlm(call: Pick<LlmCall, "task" | "images" | "routing"> & { userId?: string }): RouteDecision {
  const custom = getJsonSetting<Partial<Record<TaskId, unknown>>>("ai.routes", {});
  const auto = routingMode() === "auto";
  return route({
    task: call.task,
    difficulty: call.routing?.difficulty,
    deliverable: call.routing?.deliverable,
    // Historique explicite de l'appel, sinon celui de la reprise en cours (candidat ou étape du plan).
    history: call.routing?.history ?? routingHistoryFor(call.task),
    inputType: call.images?.length ? "mixed" : "text",
    aiActive: true,
    allowLocal: false,
    // Clé Anthropic absente : l'erreur explicite vient du client (message d'administration), pas d'un repli.
    available: (p) => p === "anthropic" || !!activeProviderKey(p),
    // Mode automatique : la route fixée dans l'administration ne s'applique qu'aux tâches maintenues en manuel.
    overrides: custom[call.task] && (!auto || pinnedTasks().includes(call.task)) ? { [call.task]: routeFor(call.task) } : undefined,
    auto: auto ? { budgetLeftMicro: call.userId ? budgetLeft(call.userId) : null } : undefined,
  });
}

/** Reste disponible du budget IA du client (micro-euros), null si inconnu. */
function budgetLeft(userId: string): number | null {
  try {
    return balance(userId).available;
  } catch {
    return null;
  }
}

/** Contexte Brain d'un appel : explicite, sinon retrouvé à partir du bloc <contexte_projet> de projectContext. */
function brainOf(call: LlmCall): { brain: LlmCall["brain"] | null; volatile: string } {
  const meta = brainMetaOf(call.context, call.projectId);
  return {
    brain: call.brain ?? (meta ? { scope: meta.scope, hash: meta.hash, version: meta.version } : null),
    volatile: call.volatile ?? meta?.volatile ?? "",
  };
}

/** Requêtes HTTP réellement envoyées pendant un appel (relances automatiques du SDK comprises). */
const httpCounter = new AsyncLocalStorage<{ n: number }>();
const countingFetch: typeof fetch = (input, init) => {
  const c = httpCounter.getStore();
  if (c) c.n++;
  return fetch(input, init);
};

let cached: { key: string; client: Anthropic } | null = null;
function client(): Anthropic {
  const key = activeProviderKey("anthropic");
  if (!key) throw new UserFacingError(L("Aucun fournisseur d'IA de langage n'est configuré. L'administration doit renseigner la clé Anthropic.", "No language AI provider is configured. An administrator needs to add the Anthropic key."));
  if (cached?.key !== key) cached = { key, client: new Anthropic({ apiKey: key, maxRetries: 0, timeout: 10 * 60_000, fetch: countingFetch }) };
  return cached.client;
}

/** IA texte utilisable pour la tâche en cours : fournisseur configuré et crédits disponibles (sinon moteur local). */
export function llmConfigured() {
  return textProviderReady() && currentUserHasAiCredits();
}

/**
 * Au moins un fournisseur de texte prêt : Anthropic configuré, ou — en routage automatique — un modèle OpenAI ou
 * Gemini confirmé, tarifé et activé (le studio ne dépend plus exclusivement d'Anthropic).
 */
export function textProviderReady(): boolean {
  if (activeProviderKey("anthropic")) return true;
  if (routingMode() !== "auto") return false;
  return TEXT_MODELS.some((m) => m.provider !== "anthropic" && modelStatus(m).autoEligible);
}

async function imageBlock(img: LlmImage): Promise<Anthropic.ImageBlockParam> {
  const jpeg = await sharp(img.data, { failOn: "none" })
    .rotate()
    .flatten({ background: "#ffffff" })
    .resize(1568, 1568, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer();
  return { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpeg.toString("base64") } };
}

async function buildContent(call: LlmCall): Promise<Anthropic.ContentBlockParam[]> {
  const content: Anthropic.ContentBlockParam[] = [];
  // Contexte du projet puis référence de la tâche en tête : identiques d'un appel à l'autre (corrections,
  // contrôles, retouches successives), ils sont mis en cache — réponses plus rapides et moins coûteuses.
  const stable = [call.context, call.reference].filter(Boolean) as string[];
  stable.forEach((text, i) => content.push(i === stable.length - 1 ? { type: "text", text, cache_control: { type: "ephemeral" } } : { type: "text", text }));
  // Après le point de cache : le contexte volatil (créations récentes) peut changer sans invalider le préfixe.
  const { volatile } = brainOf(call);
  if (volatile) content.push({ type: "text", text: volatile });
  for (const [i, img] of (call.images ?? []).entries()) {
    content.push({ type: "text", text: `Image ${i + 1}${img.label ? ` — ${img.label}` : ""} :` });
    content.push(await imageBlock(img));
  }
  content.push({ type: "text", text: call.prompt });
  return content;
}

/**
 * Message système complet : consigne de langue de sortie en tête (langue des contenus et de l'interface
 * de l'exécution en cours), puis instructions de la tâche. Le texte ne dépend que de ces deux langues et
 * de la tâche : le préfixe mis en cache reste identique d'un appel à l'autre pour une même combinaison.
 */
export function systemText(call: Pick<LlmCall, "system">): string {
  return `${languageDirective(contentLang(), uiLang())}\n\n${call.system}`;
}

/** Marge sur l'entrée comptée : consignes ajoutées par le fournisseur (format de sortie, réflexion), non comptées. */
const INPUT_MARGIN = { ratio: 1.02, tokens: 512 };

/**
 * Coût MAXIMAL d'un appel (réservé avant l'envoi), en micro-euros, coefficient compris :
 *  - entrée = nombre EXACT de jetons donné par le fournisseur pour ce modèle (count_tokens : texte, images,
 *    système), + octets du schéma de sortie imposé, + marge, au tarif d'écriture en cache (×1,25, le plus cher) ;
 *  - sortie = `max_tokens` (la réflexion est comptée dedans et ne peut pas le dépasser), au tarif de sortie ;
 *  - change USD → EUR majoré de FX_SAFETY.
 * Bloqué (jamais d'estimation) si : tarif inconnu ou non confirmé, modèle aux limites inconnues, comptage
 * impossible, entrée au-delà de la fenêtre du modèle ou du seuil où un autre barème peut s'appliquer.
 */
export async function maxCostMicro(model: string, params: { system?: { type: "text"; text: string }[]; messages: Anthropic.Beta.BetaMessageParam[]; max_tokens: number }, format?: unknown, count: (p: { model: string; system?: unknown; messages: unknown }) => Promise<number> = countInputTokens) {
  const p = requirePrice("anthropic", model);
  if (p.unit !== "tokens") throw new UserFacingError(L(`Tarif « jetons » attendu pour anthropic:${model} : corrigez-le dans l'administration.`, `A per-token price is expected for anthropic:${model}. Fix it in the admin settings.`));
  const limits = TEXT_MODEL_LIMITS[model];
  if (!limits) throw new PermanentError(L(`Limites du modèle ${model} inconnues : coût maximal non garanti, appel bloqué. Choisissez un modèle pris en charge dans l'administration.`, `Limits of model ${model} are unknown: maximum cost can't be guaranteed, call blocked. Pick a supported model in the admin settings.`));
  if (!(params.max_tokens > 0) || params.max_tokens > limits.maxOutput) throw new PermanentError(L(`Limite de sortie invalide pour ${model}.`, `Invalid output limit for ${model}.`));
  const counted = await count({ model, system: params.system, messages: params.messages });
  if (!Number.isFinite(counted) || counted <= 0) throw new PermanentError(L("Comptage des jetons impossible : appel bloqué par sécurité.", "Token count unavailable: call blocked for safety."));
  const formatTokens = format ? Buffer.byteLength(JSON.stringify(format), "utf8") : 0;
  const inTok = Math.ceil((counted + formatTokens) * INPUT_MARGIN.ratio) + INPUT_MARGIN.tokens;
  if (inTok + params.max_tokens > limits.context || inTok > limits.flatPriceUpTo) throw new UserFacingError(L(`Demande trop longue (${counted} jetons) : au-delà de ${limits.flatPriceUpTo} jetons, le tarif du fournisseur n'est pas garanti. Raccourcissez-la.`, `Request too long (${counted} tokens): above ${limits.flatPriceUpTo} tokens the provider's price isn't guaranteed. Shorten it.`));
  const markup = Math.max(1, getJsonSetting<number>("billing.markup", 1));
  return Math.ceil(((inTok * 1.25 * p.inputPerM + params.max_tokens * p.outputPerM) / 1e6) * usdToEur() * FX_SAFETY * EUR * markup);
}

/** Nombre exact de jetons d'entrée pour ce modèle (endpoint gratuit du fournisseur). Échec : appel bloqué. */
async function countInputTokens(p: { model: string; system?: unknown; messages: unknown }): Promise<number> {
  try {
    const r = await client().messages.countTokens(p as Anthropic.MessageCountTokensParams);
    return r.input_tokens;
  } catch (e) {
    const status = (e as { status?: unknown })?.status;
    // Saturation passagère : la file de tâches réessaiera. Autre échec : bloqué (aucune estimation de repli).
    if (typeof status === "number" && (status === 429 || status >= 500)) throw e;
    throw new PermanentError(L("Comptage des jetons impossible : appel bloqué par sécurité.", "Token count unavailable: call blocked for safety."));
  }
}

/** Réponses d'erreur HTTP du fournisseur relançables (rien n'a été produit ni facturé). */
const RETRYABLE = (status: number) => status === 429 || status === 529 || status >= 500;
const RETRY_DELAYS_MS = [1000, 4000];

function pricier(a: string, b: string) {
  const pa = priceFor("anthropic", a);
  const pb = priceFor("anthropic", b);
  if (!pa || pa.unit !== "tokens") return false;
  return !pb || pb.unit !== "tokens" || pa.outputPerM > pb.outputPerM || pa.inputPerM > pb.inputPerM;
}

function account(call: LlmCall, model: string, usage: Anthropic.Beta.BetaUsage | Anthropic.Usage, suffix = "", reservationId: string | null = null): { costMicro: number; estimated: boolean; eventId: string | null; dedup: boolean } {
  const p = priceFor("anthropic", model);
  const input = (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) * 1.25 + (usage.cache_read_input_tokens ?? 0) * 0.1;
  const output = usage.output_tokens ?? 0;
  const usd = p && p.unit === "tokens" ? (input * p.inputPerM + output * p.outputPerM) / 1e6 : 0;
  const costMicro = Math.round(usd * usdToEur() * EUR);
  const billed = recordUsage({
    userId: call.userId,
    projectId: call.projectId,
    jobId: call.jobId,
    task: call.task,
    provider: "anthropic",
    model,
    unit: "tokens",
    inputUnits: (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0),
    outputUnits: output,
    costMicro,
    estimated: !p,
    idempotencyKey: call.usageKey ? `${call.usageKey}${suffix}` : undefined,
  }, { reservationId });
  return { costMicro, estimated: !p, ...billed };
}

type RawResult = { text: string; stop: string | null; model: string };

async function rawCall(call: LlmCall, messages: Anthropic.Beta.BetaMessageParam[], format?: unknown, suffix = "", callTry = 0): Promise<RawResult> {
  const decision = routeLlm(call);
  const route = { provider: decision.provider, model: decision.model, effort: decision.effort };
  // OpenAI et Gemini : même autorisation, même réservation, même trace, même facturation (aucun contournement).
  if (hasTextAdapter(route.provider)) return otherCall(call, decision, messages, format, suffix, callTry);
  if (route.provider !== "anthropic") throw new PermanentError(L(`La tâche ${call.task} est routée vers ${route.provider}, qui n'est pas un modèle de langage pris en charge.`, `Task ${call.task} is routed to ${route.provider}, which is not a supported language model.`));
  // Droits du compte vérifiés à chaque appel (forfait, budget), dans une tâche de fond ou non.
  assertAiAllowed(call.userId);
  // Seul Haiku 4.5 n'a pas d'effort réglable (réflexion par budget de jetons) ; Haiku 5.5 suit le chemin commun.
  const isHaiku = route.model === "claude-haiku-4-5";
  const effort = mapEffort("anthropic", route.model, route.effort ?? "medium") ?? "medium";
  const { brain } = brainOf(call);
  const params: any = {
    model: route.model,
    // Avec réflexion, la limite couvre aussi la réflexion : une limite trop basse coupe la réponse et la fait repayer.
    // Seuls les jetons produits sont facturés, une limite plus haute ne coûte rien de plus.
    max_tokens: isHaiku ? (call.maxTokens ?? 32000) : Math.max(call.maxTokens ?? 32000, 8000),
    system: [{ type: "text", text: systemText(call), cache_control: { type: "ephemeral" } }],
    messages,
  };
  // Coût maximal de l'appel : plafond de la tâche (demande du client, benchmark) puis réservation atomique sur le
  // budget du compte, AVANT l'envoi. Rien ne part si le maximum ne peut pas être couvert.
  // Aucun repli serveur (`fallbacks`) : un modèle de repli serait facturé à son propre tarif, non couvert.
  const maxMicro = await maxCostMicro(route.model, params, format);
  assertUnderCostCap(maxMicro);
  const reservation = reserve(call.userId, maxMicro, { task: call.task, provider: "anthropic", model: route.model, jobId: call.jobId, projectId: call.projectId });
  if (!isHaiku) {
    params.thinking = { type: "adaptive" };
    params.output_config = { effort, ...(format ? { format } : {}) };
  } else if (format) {
    params.output_config = { format };
  }
  let msg: Anthropic.Beta.BetaMessage;
  // Trace de l'appel (jamais le prompt ni les images : clé et empreinte du prompt système seulement).
  const counter = { n: 0 };
  const started = Date.now();
  const trace = {
    userId: call.userId,
    projectId: call.projectId,
    jobId: call.jobId,
    task: call.task,
    provider: "anthropic",
    requestedModel: route.model,
    unit: "tokens" as const,
    effort: isHaiku ? null : effort,
    usageKey: call.usageKey ? `${call.usageKey}${suffix}` : null,
    promptKey: call.promptKey ?? call.task,
    promptHash: shortHash(params.system[0].text),
    callTry,
    // Project Brain : comparer coût, cache et qualité par portée et par version du contexte.
    brainScope: brain?.scope ?? null,
    brainHash: brain?.hash ?? null,
    brainVersion: brain?.version ?? null,
    // Router V2 : raison synthétique, repli, escalade (jamais de raisonnement détaillé).
    routingReason: decision.reason,
    fallback: decision.fallback,
    escalation: decision.escalation,
  };
  try {
    // Relances maison, dans la MÊME réservation, uniquement sur une réponse d'erreur HTTP (rien de produit ni
    // facturé). Une coupure après le début de la réponse n'est jamais relancée ici (résultat incertain).
    msg = await httpCounter.run(counter, async () => {
      for (let attempt = 0; ; attempt++) {
        try {
          const stream = isHaiku ? client().messages.stream(params) : client().beta.messages.stream(params);
          return (await stream.finalMessage()) as Anthropic.Beta.BetaMessage;
        } catch (e) {
          const status = (e as { status?: unknown })?.status;
          if (typeof status !== "number" || !RETRYABLE(status) || attempt >= RETRY_DELAYS_MS.length) throw e;
          await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
        }
      }
    });
  } catch (e) {
    // Réponse d'erreur du fournisseur (4xx, 429, 5xx) : rien n'a été produit ni facturé, la réservation est rendue.
    // Coupure réseau, délai dépassé, flux interrompu : résultat incertain, le coût maximal est retenu par prudence.
    const status = (e as { status?: unknown })?.status;
    if (typeof status === "number") release(reservation, `refus du fournisseur (${status})`);
    else settleUncertain(reservation, redact(String((e as Error)?.message ?? e)).slice(0, 160));
    recordCall({ ...trace, latencyMs: Date.now() - started, httpAttempts: counter.n || null, status: /timeout|timed out/i.test(String((e as Error)?.message)) ? "timeout" : "error", errorKind: `${(e as Error)?.name ?? "Error"}: ${redact(String((e as Error)?.message ?? e)).slice(0, 200)}` });
    if (e instanceof Anthropic.AuthenticationError) throw new PermanentError(L("La clé Anthropic configurée est refusée. Vérifiez-la dans l'administration.", "The configured Anthropic key was rejected. Check it in the admin settings."));
    if (e instanceof Anthropic.BadRequestError) throw new PermanentError(L(`Requête refusée par le fournisseur : ${e.message}`, `Request rejected by the provider: ${e.message}`));
    if (e instanceof Anthropic.NotFoundError) throw new PermanentError(L(`Modèle introuvable (${route.model}). Corrigez le routage dans l'administration.`, `Model not found (${route.model}). Fix the routing in the admin settings.`));
    throw e; // 429 / 5xx / réseau : la file de tâches réessaie.
  }
  // Modèle servi différent du modèle demandé (ne devrait pas arriver sans repli) : compté au plus cher des deux.
  const served = msg.model && msg.model !== route.model && pricier(msg.model, route.model) ? msg.model : route.model;
  let billed: ReturnType<typeof account>;
  try {
    billed = account(call, served, msg.usage, suffix, reservation);
  } catch (e) {
    // Réponse reçue (donc facturée) mais comptabilisation impossible : coût maximal retenu.
    settleUncertain(reservation, `comptabilisation impossible : ${String((e as Error)?.message ?? e).slice(0, 120)}`);
    throw e;
  }
  recordCall({
    ...trace,
    servedModel: msg.model ?? null,
    inputTokens: msg.usage?.input_tokens ?? 0,
    cacheReadTokens: msg.usage?.cache_read_input_tokens ?? 0,
    cacheWriteTokens: msg.usage?.cache_creation_input_tokens ?? 0,
    outputTokens: msg.usage?.output_tokens ?? 0,
    latencyMs: Date.now() - started,
    httpAttempts: counter.n || null,
    stopReason: msg.stop_reason ?? null,
    costMicro: billed.costMicro,
    estimated: billed.estimated,
    usageEventId: billed.eventId,
    billingDedup: billed.dedup,
    status: msg.stop_reason === "refusal" ? "refused" : "ok",
  });
  if (msg.stop_reason === "refusal") throw new UserFacingError(L("Le modèle a décliné cette demande. Reformulez-la ou retirez l'élément en cause.", "The model declined this request. Rephrase it or remove the element at issue."));
  const text = msg.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("");
  return { text, stop: msg.stop_reason, model: msg.model };
}

/** Conversation au format neutre des adaptateurs (texte et images JPEG déjà préparées). */
function toTurns(messages: Anthropic.Beta.BetaMessageParam[]): TextTurn[] {
  return messages.map((m) => {
    const blocks = typeof m.content === "string" ? [{ type: "text", text: m.content }] : (m.content as any[]);
    const parts: TextPart[] = [];
    for (const b of blocks) {
      if (b?.type === "text" && typeof b.text === "string") parts.push({ type: "text", text: b.text });
      else if (b?.type === "image" && b.source?.type === "base64") parts.push({ type: "image", jpegBase64: b.source.data });
    }
    return { role: m.role === "assistant" ? "assistant" : "user", parts };
  });
}

/**
 * Coût MAXIMAL d'un appel OpenAI ou Gemini, en micro-euros, coefficient compris — mêmes principes qu'Anthropic :
 *  - entrée = comptage EXACT du fournisseur (endpoint gratuit) + octets du schéma imposé + marge, tout au tarif
 *    d'entrée plein (aucune remise de cache supposée) ;
 *  - sortie = plafond envoyé (réflexion comprise chez OpenAI) ; chez Gemini, la réflexion est comptée EN PLUS
 *    (prise en compte dans le plafond non confirmée), jusqu'à la sortie maximale du modèle ;
 *  - bloqué si le modèle n'est pas confirmé, le tarif inconnu, le comptage impossible ou la demande trop longue.
 */
export async function otherMaxCostMicro(provider: string, req: TextRequest, count: (r: TextRequest) => Promise<number>) {
  const m = textModel(provider, req.model);
  if (!m) throw new PermanentError(L(`Modèle ${provider}:${req.model} absent du catalogue : coût maximal non garanti, appel bloqué.`, `Model ${provider}:${req.model} isn't in the catalog: maximum cost can't be guaranteed, call blocked.`));
  const st = modelStatus(m);
  if (!st.confirmed) throw new PermanentError(L(`Modèle ${m.label} non confirmé dans l'administration (identifiant, tarif, limites) : appel bloqué.`, `Model ${m.label} isn't confirmed in the admin settings (ID, price, limits): call blocked.`));
  const p = requirePrice(provider, req.model);
  if (p.unit !== "tokens") throw new UserFacingError(L(`Tarif « jetons » attendu pour ${provider}:${req.model}.`, `A per-token price is expected for ${provider}:${req.model}.`));
  if (!(req.maxOutput > 0) || req.maxOutput > m.limits.maxOutput) throw new PermanentError(L(`Limite de sortie invalide pour ${req.model}.`, `Invalid output limit for ${req.model}.`));
  let counted: number;
  try {
    counted = await count(req);
  } catch (e) {
    if (e instanceof ProviderHttpError && (e.status === 429 || e.status >= 500)) throw e;
    throw new PermanentError(L("Comptage des jetons impossible : appel bloqué par sécurité.", "Token count unavailable: call blocked for safety."));
  }
  if (!Number.isFinite(counted) || counted <= 0) throw new PermanentError(L("Comptage des jetons impossible : appel bloqué par sécurité.", "Token count unavailable: call blocked for safety."));
  const formatTokens = req.jsonSchema ? Buffer.byteLength(JSON.stringify(req.jsonSchema), "utf8") : 0;
  const inTok = Math.ceil((counted + formatTokens) * INPUT_MARGIN.ratio) + INPUT_MARGIN.tokens;
  if (inTok + req.maxOutput > m.limits.context || inTok > m.limits.flatPriceUpTo) throw new UserFacingError(L(`Demande trop longue (${counted} jetons) pour ${m.label} : raccourcissez-la.`, `Request too long (${counted} tokens) for ${m.label}: shorten it.`));
  const outTok = req.maxOutput + (thinkingOutsideMaxOutput(provider) && req.effort ? m.limits.maxOutput : 0);
  const markup = Math.max(1, getJsonSetting<number>("billing.markup", 1));
  return Math.ceil(((inTok * p.inputPerM + outTok * p.outputPerM) / 1e6) * usdToEur() * FX_SAFETY * EUR * markup);
}

/** Adaptateurs remplaçables dans les tests (aucun appel réel). */
export const textDeps = { adapters: textAdapters as Record<"openai" | "google", { count: (r: TextRequest, key: string) => Promise<number>; send: (r: TextRequest, key: string) => Promise<TextResult> }> };

/** Appel OpenAI / Gemini : mêmes garde-fous que rawCall (droits, plafond de tâche, réservation, trace, facturation). */
async function otherCall(call: LlmCall, decision: RouteDecision, messages: Anthropic.Beta.BetaMessageParam[], format: unknown, suffix: string, callTry: number): Promise<RawResult> {
  const provider = decision.provider as "openai" | "google";
  const model = decision.model;
  const m = textModel(provider, model);
  if (!m) throw new PermanentError(L(`Modèle ${provider}:${model} absent du catalogue des modèles de texte.`, `Model ${provider}:${model} isn't in the text model catalog.`));
  const key = activeProviderKey(provider);
  if (!key) throw new UserFacingError(L(`La clé ${provider} est absente ou désactivée dans l'administration.`, `The ${provider} key is missing or disabled in the admin settings.`));
  assertAiAllowed(call.userId);
  const adapter = textDeps.adapters[provider];
  const effort = mapEffort(provider, model, decision.effort ?? null);
  const schema = format && typeof format === "object" && (format as any).schema ? ((format as any).schema as Record<string, unknown>) : null;
  const req: TextRequest = { model, system: systemText(call), turns: toTurns(messages), maxOutput: Math.min(m.limits.maxOutput, Math.max(call.maxTokens ?? 16000, 4000)), effort, jsonSchema: schema };
  const { brain } = brainOf(call);
  const maxMicro = await otherMaxCostMicro(provider, req, (r) => adapter.count(r, key));
  assertUnderCostCap(maxMicro);
  const reservation = reserve(call.userId, maxMicro, { task: call.task, provider, model, jobId: call.jobId, projectId: call.projectId });
  const started = Date.now();
  let attempts = 0;
  const trace = {
    userId: call.userId,
    projectId: call.projectId,
    jobId: call.jobId,
    task: call.task,
    provider,
    requestedModel: model,
    unit: "tokens" as const,
    effort,
    usageKey: call.usageKey ? `${call.usageKey}${suffix}` : null,
    promptKey: call.promptKey ?? call.task,
    promptHash: shortHash(req.system),
    callTry,
    brainScope: brain?.scope ?? null,
    brainHash: brain?.hash ?? null,
    brainVersion: brain?.version ?? null,
    routingReason: decision.reason,
    fallback: decision.fallback,
    escalation: decision.escalation,
  };
  let res: TextResult;
  try {
    for (let attempt = 0; ; attempt++) {
      attempts++;
      try {
        res = await adapter.send(req, key);
        break;
      } catch (e) {
        if (!(e instanceof ProviderHttpError) || !RETRYABLE(e.status) || attempt >= RETRY_DELAYS_MS.length) throw e;
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      }
    }
  } catch (e) {
    // Réponse d'erreur HTTP : rien n'a été produit ni facturé, la réservation est rendue. Sinon : coût maximal retenu.
    if (e instanceof ProviderHttpError) release(reservation, `refus du fournisseur (${e.status})`);
    else settleUncertain(reservation, redact(String((e as Error)?.message ?? e)).slice(0, 160));
    recordCall({ ...trace, latencyMs: Date.now() - started, httpAttempts: attempts, status: /timeout|timed out|abort/i.test(String((e as Error)?.message)) ? "timeout" : "error", errorKind: `${(e as Error)?.name ?? "Error"}: ${redact(String((e as Error)?.message ?? e)).slice(0, 200)}` });
    if (e instanceof ProviderHttpError && (e.status === 401 || e.status === 403)) throw new PermanentError(L(`La clé ${provider} configurée est refusée. Vérifiez-la dans l'administration.`, `The configured ${provider} key was rejected. Check it in the admin settings.`));
    if (e instanceof ProviderHttpError && e.status === 404) throw new PermanentError(L(`Modèle introuvable (${model}). Corrigez le routage dans l'administration.`, `Model not found (${model}). Fix the routing in the admin settings.`));
    if (e instanceof ProviderHttpError && e.status >= 400 && e.status < 500 && e.status !== 429) throw new PermanentError(L(`Requête refusée par le fournisseur : ${e.message}`, `Request rejected by the provider: ${e.message}`));
    throw e;
  }
  let billed: { costMicro: number; estimated: boolean; eventId: string | null; dedup: boolean };
  try {
    const p = priceFor(provider, model);
    // Entrée mise en cache comptée au tarif plein (remise du fournisseur non supposée : jamais sous le coût réel).
    const usd = p && p.unit === "tokens" ? (res!.usage.input * p.inputPerM + res!.usage.output * p.outputPerM) / 1e6 : 0;
    const costMicro = Math.round(usd * usdToEur() * EUR);
    const b = recordUsage({ userId: call.userId, projectId: call.projectId, jobId: call.jobId, task: call.task, provider, model, unit: "tokens", inputUnits: res!.usage.input, outputUnits: res!.usage.output, costMicro, estimated: !p, idempotencyKey: call.usageKey ? `${call.usageKey}${suffix}` : undefined }, { reservationId: reservation });
    billed = { costMicro, estimated: !p, ...b };
  } catch (e) {
    settleUncertain(reservation, `comptabilisation impossible : ${String((e as Error)?.message ?? e).slice(0, 120)}`);
    throw e;
  }
  recordCall({
    ...trace,
    servedModel: res!.model,
    inputTokens: Math.max(0, res!.usage.input - res!.usage.cachedInput),
    cacheReadTokens: res!.usage.cachedInput,
    cacheWriteTokens: 0,
    outputTokens: res!.usage.output,
    latencyMs: Date.now() - started,
    httpAttempts: attempts,
    stopReason: res!.stop,
    costMicro: billed.costMicro,
    estimated: billed.estimated,
    usageEventId: billed.eventId,
    billingDedup: billed.dedup,
    status: res!.stop === "refusal" ? "refused" : "ok",
  });
  if (res!.stop === "refusal") throw new UserFacingError(L("Le modèle a décliné cette demande. Reformulez-la ou retirez l'élément en cause.", "The model declined this request. Rephrase it or remove the element at issue."));
  return { text: res!.text, stop: res!.stop === "max_tokens" ? "max_tokens" : res!.stop === "end_turn" ? "end_turn" : res!.stop, model: res!.model };
}

/** Plafond de sortie (réflexion comprise) quand une réponse JSON a été coupée faute de place. */
const MAX_OUTPUT_TOKENS = 64000;

/** Texte libre (rédaction). */
export async function llmText(call: LlmCall): Promise<string> {
  const content = await buildContent(call);
  const r = await rawCall(call, [{ role: "user", content: content as any }]);
  return r.text.trim();
}

/**
 * JSON validé. `strict` = sorties structurées (schéma figé) ; sinon JSON libre
 * validé par Zod avec une tentative de correction guidée par l'erreur.
 */
export async function llmJson<S extends z.ZodType>(call: LlmCall, schema: S, opts: { strict?: boolean } = {}): Promise<z.infer<S>> {
  const content = await buildContent(call);
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: content as any }];
  if (opts.strict) {
    const r = await rawCall(call, messages, zodOutputFormat(schema as any));
    return schema.parse(JSON.parse(r.text));
  }
  messages[0].content = [
    ...(content as any[]),
    { type: "text", text: "Réponds uniquement avec un objet JSON valide, sans texte autour ni bloc de code." },
  ];
  let last = "";
  let budget = call.maxTokens ?? 32000;
  let fixes = 0;
  let lastIssue = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await rawCall({ ...call, maxTokens: budget }, messages, undefined, attempt ? `:fix${attempt}` : "", attempt);
    last = r.text;
    // Réponse coupée faute de place (réflexion longue, beaucoup de photos) : même demande avec plus de place,
    // sans renvoyer le début tronqué au modèle.
    if (r.stop === "max_tokens" && budget < MAX_OUTPUT_TOKENS) {
      budget = Math.min(MAX_OUTPUT_TOKENS, budget * 2);
      continue;
    }
    const parsed = extractJson(r.text);
    const res = schema.safeParse(parsed);
    if (res.success) return res.data;
    // Écarts de forme (liste trop longue, texte trop long, valeur hors liste, nombre en texte) : réparés ici,
    // gratuitement, plutôt que de repayer une réponse ou de faire échouer l'étape.
    const saved = salvage(schema as z.ZodType<z.output<S>>, parsed);
    if (saved.ok) {
      console.info(`[ia] ${call.task} : réponse réparée sans nouvel appel (${saved.fixes.slice(0, 5).join(" ; ")})`);
      return saved.data;
    }
    lastIssue = res.error.issues.slice(0, 3).map((i) => `${i.path.join(".") || "racine"} : ${i.message}`).join(" ; ");
    if (fixes++ >= 1) break;
    const issue = res.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    messages.push({ role: "assistant", content: r.text || "{}" });
    messages.push({ role: "user", content: `Le JSON ne respecte pas le format attendu (${issue || "JSON illisible"}). Renvoie l'objet complet corrigé, uniquement le JSON, de façon concise.` });
  }
  // Détail complet dans les journaux du serveur ; au client, la raison courte (pas le JSON brut).
  console.error(`[ia] ${call.task} : réponse inexploitable (${lastIssue || "JSON illisible"})\n${last.slice(0, 4000)}`);
  throw new PermanentError(L(`L'IA a renvoyé une réponse incomplète (${lastIssue || "format illisible"}). Cliquez sur « Reprendre » pour relancer cette étape.`, `The AI returned an incomplete response (${lastIssue || "unreadable format"}). Click "Resume" to run this step again.`));
}

type Path = (string | number)[];
const getAt = (root: any, path: Path) => path.reduce((o, k) => (o == null ? o : o[k]), root);
const setAt = (root: any, path: Path, v: unknown) => {
  const parent = getAt(root, path.slice(0, -1));
  if (parent != null) parent[path[path.length - 1] as any] = v;
};

/**
 * Répare une réponse de l'IA qui ne respecte pas le schéma pour des détails de forme : liste tronquée au maximum,
 * texte coupé sur un mot, nombre ramené dans ses bornes, valeur hors liste remplacée par la valeur permise la plus
 * proche (casse) ou retirée de sa liste, nombre ou texte converti. Ne touche pas au fond ; échoue s'il reste un écart.
 */
export function salvage<T>(schema: z.ZodType<T>, data: unknown, rounds = 15): { ok: true; data: T; fixes: string[] } | { ok: false } {
  if (data == null || typeof data !== "object") return { ok: false };
  const root = structuredClone(data) as any;
  const fixes: string[] = [];
  for (let round = 0; round < rounds; round++) {
    const res = schema.safeParse(root);
    if (res.success) return { ok: true, data: res.data, fixes };
    let changed = false;
    const removals: { arr: Path; index: number }[] = [];
    for (const issue of res.error.issues as any[]) {
      const path = issue.path as Path;
      const value = getAt(root, path);
      const where = path.join(".") || "racine";
      // Une liste trop longue n'est tronquée qu'une fois ses éléments invalides retirés (on garde les bons).
      const hasBadItems = (res.error.issues as any[]).some((o) => o !== issue && o.path.length > path.length && path.every((k, i) => o.path[i] === k));
      if (issue.code === "too_big" && issue.origin === "array" && Array.isArray(value)) {
        if (hasBadItems) continue;
        value.length = Number(issue.maximum);
        fixes.push(`${where} tronqué à ${issue.maximum}`);
        changed = true;
      } else if (issue.code === "too_big" && issue.origin === "string" && typeof value === "string") {
        const max = Number(issue.maximum);
        const cut = value.slice(0, max);
        const word = cut.replace(/\s+\S*$/, "");
        setAt(root, path, (word.length > max * 0.6 ? word : cut).replace(/[\s,;:–-]+$/, ""));
        fixes.push(`${where} raccourci`);
        changed = true;
      } else if ((issue.code === "too_big" || issue.code === "too_small") && issue.origin === "number" && typeof value === "number") {
        setAt(root, path, Number(issue.code === "too_big" ? issue.maximum : issue.minimum));
        fixes.push(`${where} ramené dans ses bornes`);
        changed = true;
      } else if (issue.code === "invalid_type" && issue.expected === "number" && typeof value === "string" && value.trim() && Number.isFinite(Number(value.replace(",", ".")))) {
        setAt(root, path, Number(value.replace(",", ".")));
        changed = true;
      } else if (issue.code === "invalid_type" && value === undefined && (issue.expected === "string" || issue.expected === "array")) {
        // Champ oublié : vide plutôt qu'un échec (un champ vide reste « à compléter », rien n'est inventé).
        setAt(root, path, issue.expected === "string" ? "" : []);
        fixes.push(`${where} absent, laissé vide`);
        changed = true;
      } else if (issue.code === "invalid_type" && issue.expected === "string" && (typeof value === "number" || typeof value === "boolean")) {
        setAt(root, path, String(value));
        changed = true;
      } else if (issue.code === "invalid_value" && Array.isArray(issue.values) && typeof value === "string" && issue.values.some((v: unknown) => typeof v === "string" && v.toLowerCase() === value.trim().toLowerCase())) {
        setAt(root, path, issue.values.find((v: unknown) => typeof v === "string" && v.toLowerCase() === value.trim().toLowerCase()));
        changed = true;
      } else {
        // Élément d'une liste qui ne convient pas : retiré de la liste (le reste de la réponse est gardé).
        const at = path.map((k, i) => (typeof k === "number" ? i : -1)).filter((i) => i >= 0).pop();
        if (at !== undefined && Array.isArray(getAt(root, path.slice(0, at)))) removals.push({ arr: path.slice(0, at), index: path[at] as number });
        else if (issue.code === "invalid_value" && Array.isArray(issue.values) && issue.values.length) {
          setAt(root, path, issue.values[0]);
          fixes.push(`${where} remplacé par « ${issue.values[0]} »`);
          changed = true;
        }
      }
    }
    // Retraits du plus grand indice au plus petit (les indices restent justes), un retrait par élément.
    const seen = new Set<string>();
    for (const r of removals.sort((a, b) => b.index - a.index)) {
      const key = `${r.arr.join(".")}#${r.index}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const arr = getAt(root, r.arr) as unknown[];
      if (Array.isArray(arr) && r.index < arr.length) {
        arr.splice(r.index, 1);
        fixes.push(`${r.arr.join(".")}[${r.index}] retiré`);
        changed = true;
      }
    }
    if (!changed) return { ok: false };
  }
  const last = schema.safeParse(root);
  return last.success ? { ok: true, data: last.data, fixes } : { ok: false };
}

export function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  try {
    return JSON.parse(t);
  } catch {
    const start = t.search(/[[{]/);
    const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(t.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/** Test de connexion depuis l'administration. */
/** Vérification de clé depuis l'administration : comptage de jetons (gratuit), aucune génération facturée. */
export async function pingAnthropic(model: string) {
  const r = await client().messages.countTokens({ model, messages: [{ role: "user", content: "OK" }] });
  return { model, ok: r.input_tokens > 0 };
}
