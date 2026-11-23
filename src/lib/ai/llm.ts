import { assertStrategyInputsCurrent, selectedStrategyContext } from "../strategy-consumption";
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
import { balance, claimOperationRecovery, cleDeRelance, finishOperationRecovery, saveProviderReceipt, DemandeChangee, EUR, existingOperation, reponseDejaPayee, operationPending, recordUsage, release, requestHash, reserve, saveOperationResult, settleUncertain } from "../billing";
import {AgentBoundStop,beforeAgentTextAttempt} from './request-bounds';
import { assertAiAllowed, currentUserHasAiCredits } from "./access";
import { PermanentError, UserFacingError } from "../jobs";
import { activeProviderKey, aiAvailability, FX_SAFETY, priceFor, requirePrice, routeFor, TEXT_MODEL_LIMITS, usdToEur, type TaskId } from "./config";
import { contentLang, L, uiLang } from "../i18n-server";
import { languageDirective } from "./prompts";
import { AsyncLocalStorage } from "node:async_hooks";
import { assertUnderCostCap, CostCapReached, recordCall, redact, shortHash, skillsOfReference } from "./trace";
import { formatStrict, REFUS_DE_SCHEMA, retenirRefus, sansNullsFacultatifs, SchemaRefuse, schemaPourOpenAI, schemaRefuse, seulementContraintes } from "./sortie-stricte";
import { brainMetaOf } from "../brain/facade";
import { getJsonSetting } from "../settings";
import { route, type Difficulty, type RouteDecision, type RoutingHistory } from "../orchestrator/router";
import { modelInfo } from "../orchestrator/capabilities";
import { routingHistoryFor } from "../orchestrator/history";
import { pinnedTasks, routingMode } from "../orchestrator/text-routing";
import type { Deliverable } from "../quality/policies";
import { mapEffort, modelStatus, TEXT_MODELS, textModel, thinkingOutsideMaxOutput } from "./text-models";
import { ProviderHttpError, hasTextAdapter, textAdapters, type TextPart, type TextRequest, type TextResult, type TextTurn } from "./text-providers";

/**
 * Conversation de l'agent (SINA) : réfléchir sur le projet n'est pas une création. Elle reste possible quand les faits
 * ont changé depuis le choix de l'angle, pour que SINA puisse justement re-préparer l'angle ; chaque création payante
 * garde son propre contrôle de fraîcheur de la stratégie.
 */
const reasoningOnly = (call: { task: string }) => call.task === "agent_conversation";

export type LlmImage = { data: Buffer; label?: string };

export type LlmCall = {
  /**
   * Une réponse coupée faute de place n'est jamais redemandée (ni avec plus de place, ni en réparation) : l'étape
   * s'arrête et le dit. Pour les longues réponses déjà dimensionnées (le code d'une page : essai réel du 19 novembre
   * 2026, une réponse coupée trois fois et repayée trois fois).
   */
  sansRelanceCoupee?: boolean;
  /**
   * Appel long (plusieurs minutes, OpenAI) : déposé puis relevé au lieu d'une connexion tenue ouverte (essai réel du
   * 20 novembre 2026 : le code d'un accueil coupé en route par le réseau au bout de 2 minutes 40).
   */
  arrierePlan?: boolean;
  task: TaskId;
  /**
   * Reprise d'une tâche (essai réel du 18 novembre 2026) : si la même étape a déjà été payée avec une demande différente
   * (une règle du Studio a changé entre deux tentatives), elle devient une nouvelle action, sous une clé tirée de sa
   * demande : payée une fois, reprise ensuite sans repayer. Sans ce choix, la tâche entière restait bloquée.
   */
  nouvelleSiChangee?: boolean;
  /** Route consentie par devis serveur : un changement impose un nouveau devis, jamais un repli facturé. */
  expectedRoute?: { provider: string; model: string; effort?: string };
  /** Réparation d'une réponse mal formée (llmJson) : comptée à part dans le journal des appels (reprises à éviter). */
  motifReprise?: "forme";
  /** Remise en forme de la réponse JSON avant sa vérification (alias, forme d'une liste…). */
  prepare?: (raw: unknown) => unknown;
  userId: string;
  projectId?: string | null;
  jobId?: string | null;
  /**
   * Travail en DIFFÉRÉ (lot 2, 15 novembre 2026) : l'appel est déposé chez Anthropic et traité plus tard, à moitié
   * prix. Réservé au travail de fond (jamais une réponse attendue à l'écran). L'attente est bornée : passé le délai,
   * le dépôt est annulé (rien n'est alors facturé) et l'appel part en direct, au prix normal déjà réservé.
   */
  deferred?: boolean;
  /** Instructions spécialisées de la tâche (stables, mises en cache). */
  system: string;
  /** Contexte commun du projet (mémoire), placé avant la demande. */
  context?: string;
  /** Référence stable d'une tâche (catalogue des sections, réglages…) : mise en cache avec le contexte. */
  reference?: string;
  /**
   * Fil d'une conversation (SINA), un bloc par message, du plus ancien au plus récent. Placé juste après la référence
   * et mis en mémoire chez le fournisseur (point de mémoire sur le dernier bloc) : au pas suivant, tout le fil déjà lu
   * est repris au dixième du prix au lieu d'être relu en entier.
   */
  history?: string[];
  /**
   * Mémoire d'une heure chez le fournisseur au lieu de 5 minutes (22 novembre 2026) : pour la conversation de SINA (un
   * client qui réfléchit, une création en arrière-plan) et les tâches en différé (l'attente chez le fournisseur dépasse
   * souvent 5 minutes). L'écriture coûte 2 fois le prix d'entrée au lieu de 1,25 ; la lecture, 0,05 fois.
   */
  memoireLongue?: boolean;
  /**
   * Une consigne qui ne sert qu'une fois par projet (l'étude, la vérification, la lecture finale de la marque) : aucun
   * point de mémoire, elle se paie une fois sans le supplément d'écriture (22 novembre 2026, audit du moteur).
   */
  teteUnique?: boolean;
  prompt: string;
  images?: LlmImage[];
  /**
   * Images qui ne changent jamais d'un appel à l'autre (la planche des 50 logos aimés, 22 novembre 2026) : placées en
   * tête, avant tout ce qui change, avec leur point de mémoire. Elles sont reprises au lieu d'être relues à chaque
   * relecture, pour tous les clients. Ni le modèle ni la taille de l'image ne changent.
   */
  imagesFixes?: LlmImage[];
  /**
   * Conversation de SINA : images de ce qu'elle a déjà créé (logos, planche, site), les mêmes à chaque pas tant que rien
   * de nouveau n'est livré (22 novembre 2026). Placées après la référence et avant le fil, avec leur point de mémoire :
   * reprises au lieu d'être relues au plein prix à chaque pas.
   */
  imagesEnMemoire?: LlmImage[];
  /**
   * Effort de CETTE réponse, donné par un message à l'intérieur de la conversation (fonction en essai chez Anthropic,
   * décidée le 22 novembre 2026) : l'effort de la demande reste celui de la route, la mémoire du fil n'est plus effacée
   * aux moments forts. Refusée par le fournisseur ou éteinte dans l'administration : l'effort passe dans la demande,
   * comme avant.
   */
  effortDuTour?: string;
  maxTokens?: number;
  /** llmJson : limite de sortie au-delà de laquelle une réponse coupée n'est plus relancée plus longue (défaut 64 000). */
  maxOutputTokens?: number;
  /** Clé d'idempotence de la consommation (reprise sans double débit). */
  usageKey?: string;
  /** Serveur uniquement : reprise d'un reçu natif, interdit tout nouvel envoi s'il manque. */
  acquiredOnly?: boolean;
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
  routing?: {
    difficulty?: Difficulty; deliverable?: Deliverable; history?: RoutingHistory;
    /** Modèle choisi par l'appelant pour cet appel (ex. SINA : Haiku pour un échange simple), s'il est utilisable. */
    prefer?: { provider: "anthropic" | "openai" | "google"; model: string; effort?: string };
  };
};

/**
 * Modèle d'un appel, choisi par le Router V2 (politique centrale + route fixée par l'administration + historique).
 * Un appel arrivé ici est déjà engagé vers l'IA : jamais de bascule silencieuse vers le moteur local.
 */
const avecImages = (call: Pick<LlmCall, "images" | "imagesFixes" | "imagesEnMemoire">) => !!(call.images?.length || call.imagesFixes?.length || call.imagesEnMemoire?.length);

export function routeLlm(call: Pick<LlmCall, "task" | "images" | "imagesFixes" | "imagesEnMemoire" | "routing"> & { userId?: string }): RouteDecision {
  const pref = call.routing?.prefer;
  if (pref && pref.provider === "anthropic") {
    const info = modelInfo(pref.provider, pref.model);
    if (info && (!avecImages(call) || info.capabilities.includes("vision"))) {
      return { mode: "llm", provider: pref.provider, model: pref.model, effort: (pref.effort ?? undefined) as RouteDecision["effort"], tier: info.tier, reason: "modèle choisi par l'appelant (échange simple)", fallback: false, escalation: false, qualityTarget: null };
    }
  }
  // Autre fournisseur choisi par l'appelant (ex. rédacteur des textes du site réglé dans l'administration) : seulement
  // si le modèle est utilisable (clé active, tarif enregistré, informations confirmées) ; sinon le routage habituel.
  if (pref && pref.provider !== "anthropic") {
    const m = textModel(pref.provider, pref.model);
    if (m && modelStatus(m).usable && (!avecImages(call) || m.vision)) {
      return { mode: "llm", provider: pref.provider, model: pref.model, effort: (pref.effort ?? m.effort.default ?? undefined) as RouteDecision["effort"], tier: m.tier, reason: "modèle choisi dans l'administration pour cet usage", fallback: false, escalation: false, qualityTarget: null };
    }
  }
  const custom = getJsonSetting<Partial<Record<TaskId, unknown>>>("ai.routes", {});
  const auto = routingMode() === "auto";
  return route({
    task: call.task,
    difficulty: call.routing?.difficulty,
    deliverable: call.routing?.deliverable,
    // Historique explicite de l'appel, sinon celui de la reprise en cours (candidat ou étape du plan).
    history: call.routing?.history ?? routingHistoryFor(call.task),
    inputType: avecImages(call) ? "mixed" : "text",
    aiActive: true,
    allowLocal: false,
    // Clé Anthropic absente : l'erreur explicite vient du client (message d'administration), pas d'un repli.
    available: (p) => p === "anthropic" || !!activeProviderKey(p),
    // Mode automatique : la route fixée dans l'administration ne s'applique qu'aux tâches maintenues en manuel.
    overrides: custom[call.task] && (!auto || pinnedTasks().includes(call.task)) ? { [call.task]: routeFor(call.task) } : undefined,
    auto: auto ? { budgetLeftMicro: call.userId ? budgetLeft(call.userId) : null } : undefined,
  });
}

/** Entrée d'un dialogue texte strict : même enveloppe/messages/format que rawCall, sans API ni réservation.
 * La borne utilise les octets UTF-8 (pas une heuristique chars/2) et INCLUT le schéma structuré,
 * facturé comme entrée par maxCostMicro/otherMaxCostMicro. Images refusées : leur budget est distinct.
 */
export function strictTextQuoteInput(call: LlmCall, schema: z.ZodType): { maximumTokens: number; typicalTokens: number } {
  if (avecImages(call)) throw new UserFacingError('Le devis texte ne couvre pas des images. / Text quote does not cover images.');
  const content: unknown[] = headBlocks(call);
  const volatile = brainOf(call).volatile;
  if (volatile) content.push({ type: 'text', text: volatile });
  content.push({ type: 'text', text: call.prompt });
  const request = JSON.stringify({ system: [{ type: 'text', text: systemText(call), cache_control: pointDeMemoire(call) }], messages: [{ role: 'user', content }] });
  const format = Buffer.byteLength(JSON.stringify(zodOutputFormat(schema as any)), 'utf8');
  return { maximumTokens: Buffer.byteLength(request, 'utf8') + format + 500, typicalTokens: Math.ceil(request.length / 3.5) + format };
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
 * Disponibilité de l'IA pour l'interface et les devis : le texte est « disponible » dès qu'un fournisseur de texte
 * est prêt (Anthropic, ou OpenAI / Gemini en routage automatique), pas seulement avec Anthropic.
 */
export function aiReady() {
  return { ...aiAvailability(), llm: textProviderReady() };
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

/**
 * Blocs de tête et points de mémoire chez le fournisseur (« mise en cache »). Ce qui ne change pas passe en premier :
 *  - la référence de la tâche (cahiers, notices des outils) : la même pour tous les clients, elle passe en tête avec
 *    son point de mémoire (avant, le contexte du projet la précédait : elle n'était reprise que dans le même projet) ;
 *  - pour une tâche ordinaire, le contexte du projet ensuite, avec son propre point : identique d'un appel à l'autre du
 *    même projet (corrections, contrôles, retouches) ;
 *  - pour la conversation de SINA, le fil (un bloc par message, point de mémoire sur le dernier) : au pas suivant, tout
 *    ce qu'elle a déjà lu est repris ; le contexte (parcours, état du projet, budget) change à CHAQUE pas : il vient
 *    après, sans point, sinon tout ce qui le suit serait réécrit à chaque pas.
 * Au plus quatre points par appel (règle du fournisseur) : la consigne générale, la référence, le contexte ou le fil.
 */
export function promptHead(call: Pick<LlmCall, "task" | "context" | "reference" | "history">): { cached: string[]; history: string[]; after: string[] } {
  const history = (call.history ?? []).filter(Boolean);
  if (call.task === "agent_conversation") return { cached: [call.reference].filter(Boolean) as string[], history, after: [call.context].filter(Boolean) as string[] };
  return { cached: [call.reference, call.context].filter(Boolean) as string[], history, after: [] };
}

/** Blocs de tête d'un appel, avec leurs points de mémoire (sans les images ni la demande). */
/** Fonction en essai d'Anthropic : l'effort changé par un message dans la conversation, sans effacer la mémoire. */
export const EFFORT_PAR_MESSAGE_BETA = "mid-conversation-output-config-2026-07-01";
/** Modèles qui l'acceptent (documentation du fournisseur, 22 novembre 2026), réflexion allumée. */
const EFFORT_PAR_MESSAGE_MODELES = /^claude-(opus-5-5|opus-5|sonnet-5-5|haiku-5-5|fable-5-[12]|mythos-5-[12])$/;
/** Refus récents du fournisseur, par modèle : la fonction est mise de côté une heure, puis réessayée. */
const effortPannes = new Map<string, { at: number; why: string }>();
export const EFFORT_PANNE_MS = 60 * 60_000;
export function effortParMessageEnPanne(model: string, why: string, at = Date.now()) { effortPannes.set(model, { at, why }); }
/** Réglage « sina.effortParMessage » (allumé par défaut, s'éteint d'un geste dans l'administration). */
export function effortParMessageActif(model: string, now = Date.now()): boolean {
  if (getJsonSetting<boolean>("sina.effortParMessage", true) === false) return false;
  if (!EFFORT_PAR_MESSAGE_MODELES.test(model)) return false;
  const p = effortPannes.get(model);
  return !p || now - p.at > EFFORT_PANNE_MS;
}
/** Ce que l'administration montre : allumé ou non, et la dernière panne de la fonction. */
export function etatEffortParMessage(): { allume: boolean; panne: { model: string; at: number; why: string } | null } {
  const last = [...effortPannes.entries()].sort((a, b) => b[1].at - a[1].at)[0];
  return { allume: getJsonSetting<boolean>("sina.effortParMessage", true) !== false, panne: last ? { model: last[0], ...last[1] } : null };
}

/** Le point de mémoire d'un appel : 5 minutes, ou une heure (`memoireLongue`). */
export const pointDeMemoire = (call: Pick<LlmCall, "memoireLongue" | "teteUnique">): { type: "ephemeral"; ttl?: "1h" } | undefined => (call.teteUnique ? undefined : call.memoireLongue ? { type: "ephemeral", ttl: "1h" } : { type: "ephemeral" });

export function headBlocks(call: Pick<LlmCall, "task" | "context" | "reference" | "history" | "memoireLongue" | "teteUnique">): { type: "text"; text: string; cache_control?: { type: "ephemeral"; ttl?: "1h" } }[] {
  const { cached, history, after } = promptHead(call);
  const mark = (text: string) => ({ type: "text" as const, text, cache_control: pointDeMemoire(call) });
  return [
    ...cached.map(mark),
    ...history.map((text, i) => i === history.length - 1 ? mark(text) : { type: "text" as const, text }),
    ...after.map((text) => ({ type: "text" as const, text })),
  ];
}

export async function buildContent(call: LlmCall): Promise<Anthropic.ContentBlockParam[]> {
  // Garde central (22 novembre 2026) : une photo du client mise de côté (pas encore vérifiée, ou refusée) n'est jamais
  // lue par un appel payant ; elle est retirée de la demande, le reste part.
  if (call.projectId && (call.images?.length || call.imagesEnMemoire?.length)) {
    const { imagesLisibles } = await import("../atelier/verification-photos");
    const garder = async (l?: LlmImage[]) => { if (!l?.length) return l; const ok = await imagesLisibles(call.projectId, l.map((im) => im.data)); return l.filter((_, i) => ok[i]); };
    call = { ...call, images: await garder(call.images), imagesEnMemoire: await garder(call.imagesEnMemoire) };
  }
  // Ce qui ne change pas en tête, avec ses points de mémoire (promptHead) : repris au lieu d'être relu à chaque appel.
  const content: Anthropic.ContentBlockParam[] = [];
  // Les images fixes d'abord (même octets pour tous les clients), avec un point de mémoire sur la dernière.
  const fixes = call.imagesFixes ?? [];
  for (const [i, img] of fixes.entries()) {
    content.push({ type: "text", text: `Image jointe à part${img.label ? ` — ${img.label}` : ""} (hors numérotation) :` });
    content.push(i === fixes.length - 1 ? { ...(await imageBlock(img)), cache_control: pointDeMemoire(call) } : await imageBlock(img));
  }
  const tete = headBlocks(call), nCaches = promptHead(call).cached.length;
  content.push(...tete.slice(0, nCaches));
  // Les images déjà livrées du parcours, entre la référence et le fil, avec leur point de mémoire sur la dernière.
  const enMemoire = call.imagesEnMemoire ?? [];
  for (const [i, img] of enMemoire.entries()) {
    content.push({ type: "text", text: `Image du parcours ${i + 1}${img.label ? ` — ${img.label}` : ""} :` });
    content.push(i === enMemoire.length - 1 ? { ...(await imageBlock(img)), cache_control: pointDeMemoire(call) } : await imageBlock(img));
  }
  content.push(...tete.slice(nCaches));
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
/** La part « sortie » du coût maximal d'un appel (même formule que maxCostMicro). */
export function sortieMaxMicro(model: string, maxTokens: number): number {
  const p = requirePrice("anthropic", model);
  if (p.unit !== "tokens") return 0;
  const markup = Math.max(1, getJsonSetting<number>("billing.markup", 1));
  return Math.floor(((maxTokens * p.outputPerM) / 1e6) * usdToEur() * FX_SAFETY * EUR * markup);
}

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
  // Toute l'entrée peut être écrite en mémoire : 2 fois son prix pour une mémoire d'une heure, 1,25 sinon.
  const ecriture = /"ttl":"1h"/.test(JSON.stringify([params.system, params.messages])) ? CACHE_WRITE_1H_RATIO : CACHE_WRITE_RATIO;
  return Math.ceil(((inTok * ecriture * p.inputPerM + params.max_tokens * p.outputPerM) / 1e6) * usdToEur() * FX_SAFETY * EUR * markup);
}

/** Comptage refusé : appel bloqué, avec la réponse du fournisseur (sans secret) pour savoir quoi corriger. */
function countFailed(status: number | null, message?: string) {
  const why = `${status ? `HTTP ${status} — ` : ""}${redact(String(message ?? "")).slice(0, 200)}`.trim();
  return L(`Comptage des jetons impossible : appel bloqué par sécurité${why ? ` (${why})` : ""}.`, `Token count unavailable: call blocked for safety${why ? ` (${why})` : ""}.`);
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
    // Clé absente ou désactivée : le vrai message (administration), pas un faux problème de comptage.
    if (e instanceof UserFacingError) throw e;
    throw new PermanentError(countFailed(typeof status === "number" ? status : null, (e as Error)?.message));
  }
}

/**
 * Seule une saturation (429, rien de produit) est relancée automatiquement. Un 5xx (panne, surcharge, relais réseau)
 * n'est jamais relancé tout seul (règle du propriétaire) : arrêt net, la personne décide de recommencer.
 */
const RETRYABLE = (status: number) => status === 429;
const RETRY_DELAYS_MS = [1000, 4000];

/** Prix d'une écriture en mémoire chez Anthropic (mémoire de 5 minutes) : 1,25 fois le prix d'entrée. */
export const CACHE_WRITE_RATIO = 1.25;
/** Prix d'une écriture en mémoire d'une heure : 2 fois le prix d'entrée (grille publique). */
export const CACHE_WRITE_1H_RATIO = 2;
/**
 * Prix d'une lecture en mémoire chez Anthropic, en part du prix d'entrée (grille publique) : 0,05 pour Opus 5.5 (0,20 $
 * le million au lieu de 4 $) et Sonnet 5.5 (0,10 $ au lieu de 2 $), 0,025 pour Fable 5.1 et 5.2 ; 0,1 pour les autres.
 * Avant le 22 novembre 2026, le Studio comptait 0,1 partout : il débitait le double de ce qu'Anthropic facture pour la
 * partie reprise. Servi et demandé différents : le plus cher des deux.
 */
export function cacheReadRatio(model: string, requested = model): number {
  const r = (m: string) => /^claude-(opus|sonnet)-5-5/.test(m) ? 0.05 : /^claude-(fable|mythos)-5-[12]/.test(m) ? 0.025 : 0.1;
  return Math.max(r(model), r(requested));
}

function account(call: LlmCall, model: string, usage: Anthropic.Beta.BetaUsage | Anthropic.Usage, suffix = "", reservationId: string | null = null, requestedModel = model, discount = 1): { costMicro: number; estimated: boolean; eventId: string | null; dedup: boolean } {
  // Une réponse reçue sans usage exploitable n'est pas supposée gratuite : rawCall conserve sa réserve.
  const counts=[usage?.input_tokens,usage?.output_tokens,...[usage?.cache_creation_input_tokens,usage?.cache_read_input_tokens].filter(n=>n!=null)];
  if(counts.some(n=>!Number.isSafeInteger(n)||n!<0))throw new PermanentError(L("Usage fournisseur incomplet ou invalide : coût maximal retenu, rapprochement nécessaire avant toute relance.","Provider usage is missing or invalid: maximum cost retained; reconciliation required before retrying."));
  const p = requirePrice("anthropic", model), requested = requirePrice("anthropic", requestedModel);
  if (p.unit !== "tokens" || requested.unit !== "tokens") throw new PermanentError(L("Tarif du modèle servi incompatible : rapprochement nécessaire.", "The served model's price is incompatible: reconciliation required."));
  // Écritures d'une heure : 2 fois le prix d'entrée ; celles de 5 minutes : 1,25 (détail rendu par le fournisseur).
  const h1 = Math.min(usage.cache_creation_input_tokens ?? 0, Number((usage as { cache_creation?: { ephemeral_1h_input_tokens?: number } }).cache_creation?.ephemeral_1h_input_tokens ?? 0) || 0);
  const input = (usage.input_tokens ?? 0) + ((usage.cache_creation_input_tokens ?? 0) - h1) * CACHE_WRITE_RATIO + h1 * CACHE_WRITE_1H_RATIO + (usage.cache_read_input_tokens ?? 0) * cacheReadRatio(model, requestedModel);
  const output = usage.output_tokens ?? 0;
  const usd = (input * Math.max(p.inputPerM, requested.inputPerM) + output * Math.max(p.outputPerM, requested.outputPerM)) / 1e6;
  const costMicro = Math.round(usd * discount * usdToEur() * EUR);
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

// ---------------------------------------------------------------- travail en différé (moitié prix)

/** Remise d'Anthropic sur un appel traité en différé (tarif public : 50 % sur l'entrée et la sortie). */
export const DEFERRED_DISCOUNT = 0.5;
/** Patience du différé : par appel, puis pour toute une tâche ; au-delà, les appels partent en direct. */
export const deferredLimits = { perCallMs: 10 * 60_000, perJobMs: 30 * 60_000, pollMs: 15_000 };

/**
 * Le différé pour toute une tâche de fond (22 novembre 2026, économies : « là où le client attend de toute façon : marque,
 * angles, site, publications »). Dans `enDiffere`, un appel qui ne dit rien part en différé ; un appel qui demande
 * exprès le direct (`deferred: false`, une retouche que le client attend devant) reste en direct.
 */
const differeScope = new AsyncLocalStorage<{ patienceMs: number }>();
/**
 * `patienceMs` : patience de toute la tâche (30 minutes par défaut). Plus longue pour un travail dont personne n'attend
 * le résultat dans l'heure (les visuels du pilote des publications, prêts un à trois jours avant leur date).
 */
export const enDiffere = <T>(fn: () => Promise<T>, o: { patienceMs?: number } = {}): Promise<T> => differeScope.run({ patienceMs: o.patienceMs ?? deferredLimits.perJobMs }, fn);
export const differeActif = (): boolean => !!differeScope.getStore();
const patienceDeLaTache = (): number => differeScope.getStore()?.patienceMs ?? deferredLimits.perJobMs;
/**
 * Patience de chaque tâche, en temps RÉEL (22 novembre 2026, audit du moteur) : plusieurs appels qui attendent ensemble
 * (les équipes de noms, les stratèges des angles) ne comptent qu'une fois. Avant, leurs attentes s'additionnaient : 4
 * appels de 5 minutes mangeaient 20 minutes de patience.
 */
const deferredWaited = new Map<string, { total: number; actifs: number; depuis: number }>();
const attendu = (jobKey: string, now = Date.now()) => { const w = deferredWaited.get(jobKey); return w ? w.total + (w.actifs ? now - w.depuis : 0) : 0; };
const debutAttente = (jobKey: string) => { const w = deferredWaited.get(jobKey) ?? { total: 0, actifs: 0, depuis: 0 }; if (!w.actifs) w.depuis = Date.now(); w.actifs++; deferredWaited.set(jobKey, w); };
const finAttente = (jobKey: string) => { const w = deferredWaited.get(jobKey); if (!w) return; w.actifs = Math.max(0, w.actifs - 1); if (!w.actifs) w.total += Date.now() - w.depuis; if (deferredWaited.size > 500) { for (const [k, v] of deferredWaited) if (!v.actifs) deferredWaited.delete(k); } };
/** Remplaçable par les tests (aucun appel réel). */
export const deferredDeps: { batches?: { create: (p: any) => Promise<any>; retrieve: (id: string) => Promise<any>; cancel: (id: string) => Promise<any>; results: (id: string) => Promise<AsyncIterable<any>> }; sleep?: (ms: number) => Promise<void> } = {};
/** Temps déjà passé à attendre le différé pour une tâche (mesure montrée dans les comptes rendus d'essai). */
export const deferredWaitedMs = (jobId: string) => attendu(jobId);

/**
 * Dépose UN appel en différé et attend sa réponse. Rend le message, ou `null` quand l'appel doit partir en direct :
 * patience de la tâche épuisée, dépôt refusé, ou dépôt annulé faute de réponse à temps (rien n'est alors facturé, c'est
 * certain : aucun risque de payer deux fois). Une erreur pendant le suivi reste un résultat incertain, jamais relancé.
 */
/** Lit la réponse d'un lot déjà déposé (lecture gratuite, réponses gardées 29 jours) ; null s'il n'a jamais été traité. */
async function lotDejaDepose(batchId: string): Promise<Anthropic.Beta.BetaMessage | null> {
  const b = deferredDeps.batches ?? (client().beta.messages.batches as any), sleep = deferredDeps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let batch = await b.retrieve(batchId);
  const t0 = Date.now();
  while (batch.processing_status !== "ended") {
    if (Date.now() - t0 > deferredLimits.perCallMs) await b.cancel(batchId).catch(() => null);
    if (Date.now() - t0 > deferredLimits.perCallMs + 5 * 60_000) throw new Error("lot différé repris mais toujours en cours");
    await sleep(deferredLimits.pollMs);
    batch = await b.retrieve(batchId);
  }
  return resultatDuLot(b, batchId);
}

/** La réponse d'un lot terminé. Une demande en erreur dans un lot n'est pas facturée : elle est marquée comme telle. */
async function resultatDuLot(b: any, batchId: string): Promise<Anthropic.Beta.BetaMessage | null> {
  for await (const r of await b.results(batchId)) {
    const res = r?.result;
    if (res?.type === "succeeded") return res.message as Anthropic.Beta.BetaMessage;
    // Annulé ou expiré : jamais traité, jamais facturé.
    if (res?.type === "canceled" || res?.type === "expired") return null;
    if (res?.type === "errored") throw Object.assign(new Error(`appel en différé refusé : ${String(res.error?.error?.message ?? res.error?.message ?? "erreur").slice(0, 200)}`), { status: res.error?.error?.type === "invalid_request_error" ? 400 : 500, nonFacture: true });
  }
  throw new Error("dépôt en différé terminé sans réponse");
}

/**
 * Un dépôt annulé mais encore en cours après la grâce (10 minutes de patience, puis 5) : l'appel repart en direct au lieu
 * d'échouer (audit du site du 22 novembre 2026 : une conception longue s'arrêtait là, « Conception non faite »). Le dépôt
 * abandonné a pu être traité quand même : son coût possible (moitié prix) est retenu, à la charge du Studio.
 */
export type DepotAbandonne = { abandonne: string };

/**
 * L'AMORCE (23 novembre 2026, recette officielle d'Anthropic pour le différé avec la mémoire : « une demande avec la
 * partie commune et sa mémoire d'une heure, puis, dès qu'elle est finie, le reste »). Les demandes d'un dépôt passent
 * dans n'importe quel ordre : plusieurs demandes déposées en même temps avec la même partie commune l'écrivaient chacune
 * en mémoire (au double du prix d'entrée pour une heure) au lieu de la relire. La première qui arrive sert d'amorce ;
 * celles qui ont la même partie commune attendent qu'elle soit finie, puis partent et la relisent (au vingtième du prix).
 * Rien de plus n'est payé : l'amorce est une vraie demande du travail. Amorce ratée ou partie en direct : les autres
 * partent comme avant. Seulement pour une partie commune assez longue pour que l'attente rapporte.
 */
export const AMORCE_MIN_SIGNES = 14_000;
const AMORCE_DUREE_MS = 55 * 60_000;
const amorces = new Map<string, { fin: Promise<void>; finie: boolean; depuis: number }>();
/** La partie commune mise en mémoire pour une heure (consigne et tête jusqu'au dernier point de mémoire), ou null. */
export function partieCommune(params: { model?: string; system?: unknown; messages?: Anthropic.Beta.BetaMessageParam[] }): string | null {
  const tete: unknown[] = [];
  let derniere = -1;
  const blocs = [...(Array.isArray(params.system) ? (params.system as any[]).map((b) => ({ ...b, ou: "system" })) : []), ...(((params.messages?.[0]?.content as any[]) ?? []).map((b) => ({ ...b, ou: "message" })))];
  blocs.forEach((b, i) => { tete.push(b.type === "image" ? { image: shortHash(String(b.source?.data ?? "")) } : b); if (b.cache_control?.ttl === "1h") derniere = i; });
  if (derniere < 0) return null;
  const texte = JSON.stringify(tete.slice(0, derniere + 1));
  return texte.length >= AMORCE_MIN_SIGNES ? `${params.model ?? ""}:${shortHash(texte)}` : null;
}
/** Attend l'amorce de cette partie commune si une est en cours ; sinon, cet appel devient l'amorce (rend sa fin). */
async function amorcer(params: any, jobKey: string): Promise<(() => void) | null> {
  const cle = partieCommune(params);
  if (!cle) return null;
  const now = Date.now();
  for (const [k, v] of amorces) if (now - v.depuis > AMORCE_DUREE_MS) amorces.delete(k);
  const deja = amorces.get(cle);
  if (deja) {
    if (!deja.finie) { debutAttente(jobKey); try { await deja.fin; } finally { finAttente(jobKey); } }
    return null;
  }
  let fin!: () => void;
  const entree = { fin: new Promise<void>((r) => { fin = r; }), finie: false, depuis: now };
  amorces.set(cle, entree);
  return () => { entree.finie = true; fin(); };
}
/** Pour les essais : oublie les amorces. */
export const oublierAmorces = () => amorces.clear();

async function deferredMessage(params: any, jobKey: string, reservationId?: string): Promise<Anthropic.Beta.BetaMessage | DepotAbandonne | null> {
  if (attendu(jobKey) >= patienceDeLaTache()) return null;
  const finAmorce = await amorcer(params, jobKey);
  // Amorce ratée (rien en mémoire) : la clé est retirée, la suivante devient l'amorce ; les autres partent comme avant.
  try {
    const r = await deposer(params, jobKey, reservationId);
    if (finAmorce && !(r && !("abandonne" in r))) amorces.delete(partieCommune(params) ?? "");
    return r;
  } catch (e) {
    if (finAmorce) amorces.delete(partieCommune(params) ?? "");
    throw e;
  } finally { finAmorce?.(); }
}

async function deposer(params: any, jobKey: string, reservationId?: string): Promise<Anthropic.Beta.BetaMessage | DepotAbandonne | null> {
  if (attendu(jobKey) >= patienceDeLaTache()) return null;
  const b = deferredDeps.batches ?? (client().beta.messages.batches as any), sleep = deferredDeps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let batch: any;
  try { batch = await b.create({ requests: [{ custom_id: "appel", params }] }); }
  catch (e) {
    // Dépôt refusé net par le fournisseur (4xx) : rien n'existe, l'appel part en direct. Toute autre erreur remonte.
    const status = (e as { status?: unknown })?.status;
    if (typeof status === "number" && status >= 400 && status < 500 && status !== 429) return null;
    throw e;
  }
  // Le numéro du lot, gardé comme reçu : après une coupure, sa réponse est reprise au lieu d'être repayée.
  if (reservationId) { try { saveProviderReceipt(reservationId, { differe: batch.id }); } catch { /* reçu facultatif */ } }
  const t0 = Date.now();
  let cancelled = false, misses = 0;
  debutAttente(jobKey);
  try {
    while (batch.processing_status !== "ended") {
      if (!cancelled && Date.now() - t0 > deferredLimits.perCallMs) { await b.cancel(batch.id); cancelled = true; }
      if (cancelled && Date.now() - t0 > deferredLimits.perCallMs + 5 * 60_000) return { abandonne: batch.id };
      await sleep(deferredLimits.pollMs);
      try { batch = await b.retrieve(batch.id); misses = 0; } catch (e) { if (++misses >= 5) throw e; }
    }
  } finally { finAttente(jobKey); }
  return resultatDuLot(b, batch.id);
}
/** Ce que le journal des appels retient de la forme de la réponse : sortie stricte, réparation d'une réponse mal formée. */
const suiviDeSortie = (call: Pick<LlmCall, "motifReprise">, format: unknown): Record<string, string> | null =>
  format || call.motifReprise ? { ...(format ? { sortie: "stricte" } : {}), ...(call.motifReprise ? { reprise: call.motifReprise } : {}) } : null;
/** Un coût inconnu reste bloquant pour les moteurs, quelle que soit la langue du message. */
function uncertainProviderFailure(message:string){return Object.assign(new PermanentError(message),{uncertain:true as const});}

async function rawCall(call: LlmCall, messages: Anthropic.Beta.BetaMessageParam[], format?: unknown, suffix = "", callTry = 0): Promise<RawResult> {
  const operation = { task: call.task, projectId: call.projectId, usageKey: call.usageKey ? `${call.usageKey}${suffix}` : undefined, requestHash: requestHash({ system: systemText(call), messages, format, maxTokens: call.maxTokens }) };
  let previous: ReturnType<typeof existingOperation>;
  try { previous = existingOperation(call.userId, operation); }
  catch (e) {
    if (e instanceof DemandeChangee && process.env.STUDIO_RECUS_SEULEMENT === "1" && process.env.STUDIO_REJEU_ANCIENNES === "1") {
      // Diagnostic sur une copie : la réponse d'avant, pour voir la suite de la tâche sans rien payer.
      const old = reponseDejaPayee(call.userId, operation);
      if (old) { console.error(`[rejeu] réponse d'avant reprise : ${call.promptKey ?? "?"}`); return JSON.parse(old) as RawResult; }
    }
    if (!(e instanceof DemandeChangee) || !call.nouvelleSiChangee || !operation.usageKey) throw e;
    operation.usageKey = `${operation.usageKey}~${String(operation.requestHash).slice(0, 12)}`;
    previous = existingOperation(call.userId, operation);
  }
  // Relance accordée par le client : l'appel coupé en plein milieu se renvoie une fois, sous sa clé de relance.
  const relance = cleDeRelance(previous, operation.usageKey);
  if (relance) { operation.usageKey = relance; previous = existingOperation(call.userId, operation); }
  // Un appel déposé en différé avant une coupure (redémarrage du travailleur) : sa réponse est lue chez le fournisseur,
  // sans nouveau dépôt ni nouvelle réservation (22 novembre 2026, audit du moteur : il était repayé).
  let reprise: { msg: Anthropic.Beta.BetaMessage | null; reservation: string } | null = null;
  if (previous && !previous.result) {
    const recu = (() => { try { return previous.provider_receipt ? JSON.parse(previous.provider_receipt) as { differe?: string } : null; } catch { return null; } })();
    if (recu?.differe && claimOperationRecovery(previous.id)) {
      try { reprise = { msg: await lotDejaDepose(recu.differe), reservation: previous.id }; } finally { finishOperationRecovery(previous.id); }
      // Lot annulé ou expiré : jamais traité, jamais facturé ; la réservation est rendue et l'appel repart normalement.
      if (!reprise.msg) { release(previous.id, "lot différé annulé ou expiré : rien facturé"); reprise = null; previous = undefined; }
    }
  }
  if (previous && !reprise) {
    if (previous.result) return JSON.parse(previous.result) as RawResult;
    operationPending();
  }
  // Rejouer une tâche sans rien payer (diagnostic sur une copie, 18 novembre 2026) : seules les réponses déjà payées
  // sont rendues ; tout appel nouveau est refusé avant l'envoi.
  if (process.env.STUDIO_RECUS_SEULEMENT === "1" && !call.acquiredOnly) console.error(`[reçus seulement] appel non acquis : ${call.promptKey ?? "?"} · ${operation.usageKey ?? "sans clé"}`);
  if (call.acquiredOnly || process.env.STUDIO_RECUS_SEULEMENT === "1") throw new UserFacingError(L("Le reçu acquis n’est pas disponible. Aucun nouvel appel envoyé.", "The acquired receipt is unavailable. No new request sent."));
  if (call.projectId && !reasoningOnly(call)) assertStrategyInputsCurrent(call.projectId);
  const decision = routeLlm(call);
  if (call.expectedRoute && (decision.provider !== call.expectedRoute.provider || decision.model !== call.expectedRoute.model || (decision.effort ?? '') !== (call.expectedRoute.effort ?? '')))
    throw new UserFacingError(L("La route IA a changé : demandez un nouveau devis. Aucun appel envoyé.", "The AI route changed: request a new quote. No request sent."));
  const route = { provider: decision.provider, model: decision.model, effort: decision.effort };
  // OpenAI et Gemini : même autorisation, même réservation, même trace, même facturation (aucun contournement).
  if (hasTextAdapter(route.provider)) return otherCall(call, decision, messages, format, suffix, callTry, operation);
  if (route.provider !== "anthropic") throw new PermanentError(L(`La tâche ${call.task} est routée vers ${route.provider}, qui n'est pas un modèle de langage pris en charge.`, `Task ${call.task} is routed to ${route.provider}, which is not a supported language model.`));
  // Droits du compte vérifiés à chaque appel (forfait, budget), dans une tâche de fond ou non.
  assertAiAllowed(call.userId, call.projectId);
  // Seul Haiku 4.5 n'a pas d'effort réglable (réflexion par budget de jetons) ; Haiku 5.5 suit le chemin commun.
  const isHaiku = route.model === "claude-haiku-4-5";
  const effort = mapEffort("anthropic", route.model, route.effort ?? "medium") ?? "medium";
  const { brain } = brainOf(call);
  const params: any = {
    model: route.model,
    // Avec réflexion, la limite couvre aussi la réflexion : une limite trop basse coupe la réponse et la fait repayer.
    // Seuls les jetons produits sont facturés, une limite plus haute ne coûte rien de plus.
    max_tokens: isHaiku ? (call.maxTokens ?? 32000) : Math.max(call.maxTokens ?? 32000, 8000),
    system: [{ type: "text", text: systemText(call), cache_control: pointDeMemoire(call) }],
    messages,
  };
  // Coût maximal de l'appel : plafond de la tâche (demande du client, benchmark) puis réservation atomique sur le
  // budget du compte, AVANT l'envoi. Rien ne part si le maximum ne peut pas être couvert.
  // Aucun repli serveur (`fallbacks`) : un modèle de repli serait facturé à son propre tarif, non couvert.
  const maxMicro = await maxCostMicro(route.model, params, format);
  assertUnderCostCap(maxMicro);
  if (call.projectId && !reasoningOnly(call)) assertStrategyInputsCurrent(call.projectId);
  // Une réponse coupée ou mal formée redemandée (callTry > 0) : une reprise du Studio, jamais débitée au client.
  const reservation = reprise?.reservation ?? reserve(call.userId, maxMicro, { ...operation, provider: "anthropic", model: route.model, jobId: call.jobId, studio: callTry > 0 });
  if (!isHaiku) {
    params.thinking = { type: "adaptive" };
    params.output_config = { effort, ...(format ? { format } : {}) };
  } else if (format) {
    params.output_config = { format };
  }
  // Effort de la réponse par un message dans la conversation (jamais en différé : le lot n'accepte pas la fonction).
  const tour = !isHaiku && call.effortDuTour ? mapEffort("anthropic", route.model, call.effortDuTour) : null;
  const parMessage = !!tour && tour !== effort && !(call.deferred ?? differeActif()) && effortParMessageActif(route.model);
  /** Retour à la façon d'avant : l'effort de la réponse dans la demande, sans message ni fonction en essai. */
  const commeAvant = () => { params.messages = messages; delete params.betas; params.output_config = { ...params.output_config, effort: tour }; };
  if (parMessage) {
    params.messages = [...messages, { role: "system", content: [], output_config: { effort: tour } }];
    params.betas = [EFFORT_PAR_MESSAGE_BETA];
  } else if (tour && tour !== effort) commeAvant();
  let msg: Anthropic.Beta.BetaMessage;
  // Appel réellement servi en différé (moitié prix) ; faux quand il est parti en direct.
  let servedDeferred = false;
  // Sortie stricte et réparations d'une réponse mal formée, comptées dans le journal des appels (reprises à éviter).
  const sortie = suiviDeSortie(call, format);
  // Trace de l'appel (jamais le prompt ni les images : clé et empreinte du prompt système seulement).
  const counter = { n: 0 };
  const started = Date.now();
  const trace = {
    skills: skillsOfReference(call.reference),
    userId: call.userId,
    projectId: call.projectId,
    jobId: call.jobId,
    task: call.task,
    provider: "anthropic",
    requestedModel: route.model,
    unit: "tokens" as const,
    effort: isHaiku ? null : tour && tour !== effort ? `${tour}${parMessage ? " (par message)" : ""}` : effort,
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
    // Relances maison, dans la MÊME réservation, uniquement sur une saturation 429 (rien de produit ni facturé). Une coupure après le début de la réponse n'est jamais relancée ici (résultat incertain).
    // Jamais de différé pour un petit contrôle (Haiku) : il gagnerait un dixième de centime et ferait attendre le site.
    const depot = reprise?.msg ?? ((call.deferred ?? differeActif()) && !/haiku/.test(route.model) ? await deferredMessage(params, call.jobId ?? call.userId, reservation) : null);
    if (depot && "abandonne" in depot) {
      // Le dépôt abandonné a pu être traité : son coût possible (moitié prix) est retenu à la charge du Studio, jamais du client.
      const abandon = reserve(call.userId, Math.ceil(maxMicro / 2), { ...operation, usageKey: operation.usageKey ? `${operation.usageKey}:depot-abandonne` : undefined, provider: "anthropic", model: route.model, jobId: call.jobId, studio: true });
      settleUncertain(abandon, `dépôt en différé ${depot.abandonne} annulé mais encore en cours : l'appel est reparti en direct`);
    }
    const later = depot && !("abandonne" in depot) ? depot : null;
    if (later) servedDeferred = true;
    msg = later ?? await httpCounter.run(counter, async () => {
      for (let attempt = 0; ; attempt++) {
        try {
          beforeAgentTextAttempt(call.userId,call.jobId,attempt);
          const stream = isHaiku ? client().messages.stream(params) : client().beta.messages.stream(params);
          return (await stream.finalMessage()) as Anthropic.Beta.BetaMessage;
        } catch (e) {
          const status = (e as { status?: unknown })?.status;
          // La fonction en essai refusée (400 : rien n'est produit ni facturé) : retour immédiat à la façon d'avant, sans
          // panne pour le client, et la fonction est mise de côté une heure.
          if (params.betas?.includes(EFFORT_PAR_MESSAGE_BETA) && status === 400) {
            effortParMessageEnPanne(route.model, redact(String((e as Error)?.message ?? e)).slice(0, 200));
            commeAvant();
            trace.effort = `${tour} (retour à l'effort dans la demande)`;
            continue;
          }
          if (typeof status !== "number" || !RETRYABLE(status) || attempt >= RETRY_DELAYS_MS.length) throw e;
          await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
        }
      }
    });
  } catch (e) {
    // Seuls les refus nets 4xx hors délai prouvent que l'appel n'a pas produit de résultat.
    const status = (e as { status?: unknown })?.status;
    // Une demande en erreur dans un lot n'est pas facturée (page du différé d'Anthropic) : la réservation est rendue.
    const uncertain = !(e instanceof AgentBoundStop || (e as { nonFacture?: boolean })?.nonFacture || typeof status === "number" && providerRefused(status));
    if (!uncertain) release(reservation, `refus du fournisseur (${status})`);
    // Une erreur du fournisseur rendue AVANT toute réponse (500, 529 surcharge) : aucune réponse n'a pu être produite ; au
    // plus l'envoi a pu être compté. Seul ce coût est retenu, pas le plafond entier (22 novembre 2026, audit du moteur ;
    // la page officielle ne dit pas si ces erreurs sont facturées : la prudence reste, la retenue est juste).
    else settleUncertain(reservation, redact(String((e as Error)?.message ?? e)).slice(0, 160), typeof status === "number" && status >= 500 ? Math.max(0, maxMicro - sortieMaxMicro(route.model, params.max_tokens)) : undefined);
    // L'appel n'est plus en cours : un lot déposé peut être repris dès la prochaine tentative (sa réponse lue, jamais repayée).
    if (uncertain) finishOperationRecovery(reservation);
    recordCall({ ...trace, ...(sortie ? { details: sortie } : {}), latencyMs: Date.now() - started, httpAttempts: counter.n || null, status: /timeout|timed out/i.test(String((e as Error)?.message)) ? "timeout" : "error", errorKind: `${(e as Error)?.name ?? "Error"}: ${redact(String((e as Error)?.message ?? e)).slice(0, 200)}` });
    if (e instanceof Anthropic.AuthenticationError) throw new PermanentError(L("La clé Anthropic configurée est refusée. Vérifiez-la dans l'administration.", "The configured Anthropic key was rejected. Check it in the admin settings."));
    if (e instanceof Anthropic.BadRequestError) throw new (format && REFUS_DE_SCHEMA.test(e.message) ? SchemaRefuse : PermanentError)(L(`Requête refusée par le fournisseur : ${e.message}`, `Request rejected by the provider: ${e.message}`));
    if (e instanceof Anthropic.NotFoundError) throw new PermanentError(L(`Modèle introuvable (${route.model}). Corrigez le routage dans l'administration.`, `Model not found (${route.model}). Fix the routing in the admin settings.`));
    // Coupure réseau, délai dépassé, flux interrompu : le coût maximal vient d'être retenu ; une relance par la file
    // de tâches repaierait (nouvelle réservation, nouvel appel). Arrêt net, comme pour les autres fournisseurs.
    if (uncertain) {
      const why = redact(String((e as Error)?.message ?? e)).slice(0, 200);
      throw uncertainProviderFailure(L(`Résultat incertain chez Anthropic (${why}) : coût maximal retenu par prudence, aucune relance automatique. Vérifiez la consommation chez le fournisseur avant de recommencer.`, `Uncertain result at Anthropic (${why}): maximum cost kept as a precaution, no automatic retry. Check the provider's usage before trying again.`));
    }
    throw e; // 429 (saturation, réservation rendue) : la file de tâches réessaie plus tard.
  }
  // Modèle servi différent du modèle demandé (ne devrait pas arriver sans repli) : compté au plus cher des deux.
  const served = msg.model || route.model;
  let billed: ReturnType<typeof account>;
  try {
    // Un identifiant servi inconnu n'est jamais supposé gratuit ni au tarif du modèle demandé.
    if (msg.model && !priceFor("anthropic", msg.model)) throw new PermanentError(L("Tarif du modèle servi inconnu : coût maximal retenu, rapprochement nécessaire avant toute relance.", "The served model's price is unknown: maximum cost kept; reconciliation is required before retrying."));
    billed = account(call, served, msg.usage, suffix, reservation, route.model, servedDeferred ? DEFERRED_DISCOUNT : 1);
  } catch (e) {
    // Réponse reçue (donc facturée) mais comptabilisation impossible : coût maximal retenu.
    settleUncertain(reservation, `comptabilisation impossible : ${String((e as Error)?.message ?? e).slice(0, 120)}`);
    throw uncertainProviderFailure(redact(String((e as Error)?.message??e)));
  }
  // Ce qui sert à mesurer le vrai gain dans l'administration (audit du moteur, 22 novembre 2026).
  const ecrit1h = Number((msg.usage as { cache_creation?: { ephemeral_1h_input_tokens?: number } } | undefined)?.cache_creation?.ephemeral_1h_input_tokens ?? 0) || 0;
  const voulu = (call.deferred ?? differeActif()) && !/haiku/.test(route.model);
  recordCall({
    ...trace,
    details: { ...(ecrit1h ? { ecrit1h } : {}), ...(voulu ? { differe: servedDeferred ? "servi" : "rate" } : {}), placeDemandee: params.max_tokens, ...sortie },
    ...(servedDeferred ? { routingReason: `${decision.reason} · différé (moitié prix)` } : {}),
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
  const result = { text, stop: msg.stop_reason, model: msg.model };
  saveOperationResult(reservation, result);
  return result;
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
    if (e instanceof UserFacingError) throw e;
    throw new PermanentError(countFailed(e instanceof ProviderHttpError ? e.status : null, (e as Error)?.message));
  }
  if (!Number.isFinite(counted) || counted <= 0) throw new PermanentError(L("Comptage des jetons impossible : appel bloqué par sécurité.", "Token count unavailable: call blocked for safety."));
  const formatTokens = req.jsonSchema ? Buffer.byteLength(JSON.stringify(req.jsonSchema), "utf8") : 0;
  const inTok = Math.ceil((counted + formatTokens) * INPUT_MARGIN.ratio) + INPUT_MARGIN.tokens;
  if (inTok + req.maxOutput > m.limits.context || inTok > m.limits.flatPriceUpTo) throw new UserFacingError(L(`Demande trop longue (${counted} jetons) pour ${m.label} : raccourcissez-la.`, `Request too long (${counted} tokens) for ${m.label}: shorten it.`));
  const outTok = req.maxOutput + (thinkingOutsideMaxOutput(provider) && req.effort ? m.limits.maxOutput : 0);
  const markup = Math.max(1, getJsonSetting<number>("billing.markup", 1));
  return Math.ceil(((inTok * p.inputPerM + outTok * p.outputPerM) / 1e6) * usdToEur() * FX_SAFETY * EUR * markup);
}

/** Refus net du fournisseur (4xx hors délai) : rien n'a été produit ni facturé. */
const providerRefused = (status: number) => status >= 400 && status < 500 && status !== 408;

/** Adaptateurs remplaçables dans les tests (aucun appel réel). */
export const textDeps = { adapters: textAdapters as Record<"openai" | "google", { count: (r: TextRequest, key: string) => Promise<number>; send: (r: TextRequest, key: string) => Promise<TextResult> }> };

/** Appel OpenAI / Gemini : mêmes garde-fous que rawCall (droits, plafond de tâche, réservation, trace, facturation). */
async function otherCall(call: LlmCall, decision: RouteDecision, messages: Anthropic.Beta.BetaMessageParam[], format: unknown, suffix: string, callTry: number, operation: { task: string; projectId?: string | null; usageKey?: string; requestHash: string }): Promise<RawResult> {
  const provider = decision.provider as "openai" | "google";
  const model = decision.model;
  const m = textModel(provider, model);
  if (!m) throw new PermanentError(L(`Modèle ${provider}:${model} absent du catalogue des modèles de texte.`, `Model ${provider}:${model} isn't in the text model catalog.`));
  const key = activeProviderKey(provider);
  if (!key) throw new UserFacingError(L(`La clé ${provider} est absente ou désactivée dans l'administration.`, `The ${provider} key is missing or disabled in the admin settings.`));
  assertAiAllowed(call.userId, call.projectId);
  const adapter = textDeps.adapters[provider];
  const effort = mapEffort(provider, model, decision.effort ?? null);
  const schema = format && typeof format === "object" && (format as any).schema ? ((format as any).schema as Record<string, unknown>) : null;
  const req: TextRequest = { model, system: systemText(call), turns: toTurns(messages), maxOutput: Math.min(m.limits.maxOutput, Math.max(call.maxTokens ?? 16000, 4000)), effort, jsonSchema: schema && provider === "openai" ? schemaPourOpenAI(schema) : schema, ...(call.arrierePlan && provider === "openai" ? { arrierePlan: true } : {}) };
  const { brain } = brainOf(call);
  const maxMicro = await otherMaxCostMicro(provider, req, (r) => adapter.count(r, key));
  assertUnderCostCap(maxMicro);
  if (call.projectId && !reasoningOnly(call)) assertStrategyInputsCurrent(call.projectId);
  const reservation = reserve(call.userId, maxMicro, { ...operation, provider, model, jobId: call.jobId, studio: callTry > 0 });
  const started = Date.now(), sortie = suiviDeSortie(call, format);
  let attempts = 0;
  const trace = {
    skills: skillsOfReference(call.reference),
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
        beforeAgentTextAttempt(call.userId,call.jobId,attempt);
        res = await adapter.send(req, key);
        break;
      } catch (e) {
        // Seule une saturation (429, rien de produit) est relancée. Un 5xx (souvent un relais réseau : « upstream
        // request failed ») ne prouve pas que rien n'a été facturé : jamais de relance automatique.
        if (!(e instanceof ProviderHttpError) || e.status !== 429 || attempt >= RETRY_DELAYS_MS.length) throw e;
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      }
    }
  } catch (e) {
    // Refus net (4xx hors délai) : rien n'a été produit ni facturé, la réservation est rendue. 5xx, délai, coupure :
    // résultat incertain, coût maximal retenu, et l'étape s'arrête (aucune relance par la file de tâches).
    const uncertain = !(e instanceof AgentBoundStop || e instanceof ProviderHttpError && providerRefused(e.status));
    if (!uncertain) release(reservation, `refus du fournisseur (${(e as ProviderHttpError).status})`);
    else settleUncertain(reservation, redact(`${e instanceof ProviderHttpError ? `HTTP ${e.status} — ` : ""}${String((e as Error)?.message ?? e)}`).slice(0, 160));
    recordCall({ ...trace, ...(sortie ? { details: sortie } : {}), latencyMs: Date.now() - started, httpAttempts: attempts, status: /timeout|timed out|abort/i.test(String((e as Error)?.message)) ? "timeout" : "error", errorKind: `${(e as Error)?.name ?? "Error"}: ${redact(String((e as Error)?.message ?? e)).slice(0, 200)}` });
    if (e instanceof ProviderHttpError && (e.status === 401 || e.status === 403)) throw new PermanentError(L(`La clé ${provider} configurée est refusée. Vérifiez-la dans l'administration.`, `The configured ${provider} key was rejected. Check it in the admin settings.`));
    if (e instanceof ProviderHttpError && e.status === 404) throw new PermanentError(L(`Modèle introuvable (${model}). Corrigez le routage dans l'administration.`, `Model not found (${model}). Fix the routing in the admin settings.`));
    if (e instanceof ProviderHttpError && e.status >= 400 && e.status < 500 && e.status !== 429 && e.status !== 408) throw new (req.jsonSchema && e.status === 400 && REFUS_DE_SCHEMA.test(e.message) ? SchemaRefuse : PermanentError)(L(`Requête refusée par le fournisseur : ${e.message}`, `Request rejected by the provider: ${e.message}`));
    if (uncertain) {
      const why = redact(`${e instanceof ProviderHttpError ? `HTTP ${e.status} — ` : ""}${String((e as Error)?.message ?? e)}`).slice(0, 200);
      throw uncertainProviderFailure(L(`Résultat incertain chez ${provider} (${why}) : coût maximal retenu par prudence, aucune relance automatique. Vérifiez la consommation chez le fournisseur avant de recommencer.`, `Uncertain result at ${provider} (${why}): maximum cost kept as a precaution, no automatic retry. Check the provider's usage before trying again.`));
    }
    throw e;
  }
  let billed: { costMicro: number; estimated: boolean; eventId: string | null; dedup: boolean };
  try {
    const requested = requirePrice(provider, model), served = res!.model ? requirePrice(provider, res!.model) : requested;
    if (requested.unit !== "tokens" || served.unit !== "tokens") throw new PermanentError(L("Tarif du modèle servi incompatible : rapprochement nécessaire.", "The served model's price is incompatible: reconciliation required."));
    const p = { ...requested, inputPerM: Math.max(requested.inputPerM, served.inputPerM), outputPerM: Math.max(requested.outputPerM, served.outputPerM) };
    // Entrée mise en cache comptée au tarif plein (remise du fournisseur non supposée : jamais sous le coût réel).
    const usd = p && p.unit === "tokens" ? (res!.usage.input * p.inputPerM + res!.usage.output * p.outputPerM) / 1e6 : 0;
    const costMicro = Math.round(usd * usdToEur() * EUR);
    const b = recordUsage({ userId: call.userId, projectId: call.projectId, jobId: call.jobId, task: call.task, provider, model, unit: "tokens", inputUnits: res!.usage.input, outputUnits: res!.usage.output, costMicro, estimated: !p, idempotencyKey: call.usageKey ? `${call.usageKey}${suffix}` : undefined }, { reservationId: reservation });
    billed = { costMicro, estimated: !p, ...b };
  } catch (e) {
    settleUncertain(reservation, `comptabilisation impossible : ${String((e as Error)?.message ?? e).slice(0, 120)}`);
    throw uncertainProviderFailure(redact(String((e as Error)?.message??e)));
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
    ...(sortie ? { details: sortie } : {}),
    status: res!.stop === "refusal" ? "refused" : "ok",
  });
  if (res!.stop === "refusal") throw new UserFacingError(L("Le modèle a décliné cette demande. Reformulez-la ou retirez l'élément en cause.", "The model declined this request. Rephrase it or remove the element at issue."));
  const result = { text: res!.text, stop: res!.stop, model: res!.model };
  saveOperationResult(reservation, result);
  return result;
}

/** Message d'une réponse coupée qui n'est pas redemandée (sansRelanceCoupee). */
const REPONSE_COUPEE = () => L("La réponse de l'IA a été coupée faute de place : elle n'est pas redemandée d'office (rien de plus n'est payé). La suite se décide avec le client.", "The AI response was cut for lack of room: it is not requested again automatically (nothing more is paid).");
/** Plafond de sortie (réflexion comprise) quand une réponse JSON a été coupée faute de place. */
const MAX_OUTPUT_TOKENS = 64000;

/** Nombre maximal d'appels de llmJson pour une même demande (réponses coupées, une réparation de format). */
export const JSON_ATTEMPTS = 4;
/** Jetons ajoutés par la consigne de réparation (liste des écarts, au plus cinq) : borne large. */
const JSON_FIX_PROMPT_TOKENS = 600;

/**
 * Suite de llmJson après une réponse non exploitable, null = abandon. Règle unique, partagée par l'exécution et par
 * le devis (jsonCallBounds) : une réponse coupée est redemandée avec deux fois plus de place tant que la limite `cap`
 * n'est pas atteinte (sans renvoyer le texte coupé) ; sinon UNE réparation, qui renvoie la réponse précédente.
 */
/**
 * Place de sortie RÉELLEMENT envoyée pour une limite demandée (audit des publications, 22 novembre 2026) : chez Anthropic
 * (sauf Haiku 4.5), jamais moins de 8 000 jetons ; ailleurs, jamais moins de 4 000 ni plus que le modèle. Une réponse
 * coupée se redemande à partir de cette place-là : doubler une limite demandée de 2 000 donnait 4 000 puis 8 000, soit
 * trois fois la même place envoyée, donc deux appels repayés pour être très probablement coupés au même endroit.
 */
export function placeReelle(provider: string, model: string, maxTokens: number): number {
  if (provider === "anthropic") return model === "claude-haiku-4-5" ? maxTokens : Math.max(maxTokens, 8000);
  const m = textModel(provider as "openai" | "google", model);
  return m ? Math.min(m.limits.maxOutput, Math.max(maxTokens, 4000)) : maxTokens;
}

/** Place de départ d'un llmJson : celle que le modèle routé recevra vraiment (voir placeReelle). */
function placeDeDepart(call: LlmCall): number {
  const asked = call.maxTokens ?? 32000;
  try { const r = routeLlm(call); return r.mode === "llm" ? placeReelle(r.provider, r.model, asked) : asked; } catch { return asked; }
}

export function jsonRetry(s: { attempt: number; budget: number; fixes: number }, cut: boolean, cap: number): { attempt: number; budget: number; fixes: number; resend: boolean } | null {
  if (s.attempt + 1 >= JSON_ATTEMPTS) return null;
  if (cut && s.budget < cap) return { attempt: s.attempt + 1, budget: Math.min(cap, s.budget * 2), fixes: s.fixes, resend: false };
  if (s.fixes >= 1) return null;
  return { attempt: s.attempt + 1, budget: s.budget, fixes: s.fixes + 1, resend: true };
}

/**
 * Toutes les suites d'appels possibles d'un llmJson (pire cas compris) : pour chaque appel, sa limite de sortie et
 * les jetons d'entrée ajoutés par les réparations (réponse renvoyée + consigne).
 */
export function jsonCallPaths(maxTokens: number, cap: number): { budget: number; extraInput: number }[][] {
  const out: { budget: number; extraInput: number }[][] = [];
  const go = (s: { attempt: number; budget: number; fixes: number }, extra: number, done: { budget: number; extraInput: number }[]) => {
    const seq = [...done, { budget: s.budget, extraInput: extra }];
    out.push(seq);
    for (const cut of [true, false]) {
      const n = jsonRetry(s, cut, cap);
      if (n) go(n, n.resend ? extra + s.budget + JSON_FIX_PROMPT_TOKENS : extra, seq);
    }
  };
  go({ attempt: 0, budget: maxTokens, fixes: 0 }, 0, []);
  return out;
}

/**
 * Coût MAXIMAL (micro-euros, coefficient compris) d'un appel dont l'entrée ne dépasse pas `inputTokens`, avec les
 * mêmes règles que la réservation faite avant l'envoi (maxCostMicro, otherMaxCostMicro). null : tarif ou limites
 * inconnus, coût impossible à encadrer.
 */
export function callCostBoundMicro(provider: string, model: string, inputTokens: number, maxTokens: number, effort: string | null): number | null {
  const p = priceFor(provider, model);
  if (!p || p.unit !== "tokens") return null;
  const markup = Math.max(1, getJsonSetting<number>("billing.markup", 1));
  const inTok = Math.ceil(inputTokens * INPUT_MARGIN.ratio) + INPUT_MARGIN.tokens;
  if (provider === "anthropic") {
    if (!TEXT_MODEL_LIMITS[model]) return null;
    const out = model === "claude-haiku-4-5" ? maxTokens : Math.max(maxTokens, 8000);
    return Math.ceil(((inTok * 1.25 * p.inputPerM + out * p.outputPerM) / 1e6) * usdToEur() * FX_SAFETY * EUR * markup);
  }
  const m = textModel(provider as "openai" | "google", model);
  if (!m) return null;
  const out = Math.min(m.limits.maxOutput, Math.max(maxTokens, 4000)) + (thinkingOutsideMaxOutput(provider as "openai" | "google") && effort ? m.limits.maxOutput : 0);
  return Math.ceil(((inTok * p.inputPerM + out * p.outputPerM) / 1e6) * usdToEur() * FX_SAFETY * EUR * markup);
}

/** Estimation (pas un plafond) d'un appel au déroulé habituel : jetons donnés, tarif et coefficient, sans marges. */
export function estimateCallMicro(provider: string, model: string, inputTokens: number, outputTokens: number): number | null {
  const p = priceFor(provider, model);
  if (!p || p.unit !== "tokens") return null;
  const markup = Math.max(1, getJsonSetting<number>("billing.markup", 1));
  return Math.ceil(((inputTokens * p.inputPerM + outputTokens * p.outputPerM) / 1e6) * usdToEur() * EUR * markup);
}

/** Pire cas d'un llmJson : maximum, sur toutes les suites possibles, de la somme des coûts maximaux de ses appels. */
export function jsonCallMaxMicro(provider: string, model: string, inputTokens: number, maxTokens: number, cap: number, effort: string | null): { maxMicro: number; maxCalls: number } | null {
  let maxMicro = 0;
  let maxCalls = 0;
  // Même départ que l'exécution : la place réellement envoyée (placeReelle), puis doublée.
  for (const seq of jsonCallPaths(placeReelle(provider, model, maxTokens), Math.min(MAX_OUTPUT_TOKENS, cap))) {
    let sum = 0;
    for (const c of seq) {
      const one = callCostBoundMicro(provider, model, inputTokens + c.extraInput, c.budget, effort);
      if (one == null) return null;
      sum += one;
    }
    maxMicro = Math.max(maxMicro, sum);
    maxCalls = Math.max(maxCalls, seq.length);
  }
  return { maxMicro, maxCalls };
}

/** Also covers specialized calls which do not yet request a Brain view. */
export function withSelectedStrategy(call: LlmCall): LlmCall {
  if (!call.projectId) return call;
  const selected = selectedStrategyContext(call.projectId);
  if (!selected || call.context?.includes(selected)) return call;
  if (/<strategie_marketing_active\b/.test(call.context ?? "")) {
    throw new UserFacingError("Le contexte de cette rédaction appartient à une ancienne stratégie. Préparez de nouveau la demande avant toute dépense ; les contenus acquis sont conservés.");
  }
  return { ...call, context: [call.context, selected].filter(Boolean).join("\n\n") };
}

/** Une tâche en différé attend souvent plus de 5 minutes chez le fournisseur : sa mémoire dure une heure. */
const avecMemoire = (call: LlmCall): LlmCall => (call.memoireLongue == null && !call.teteUnique && (call.deferred ?? differeActif()) ? { ...call, memoireLongue: true } : call);

/** Texte libre (rédaction). */
export async function llmText(call: LlmCall): Promise<string> {
  call = avecMemoire(withSelectedStrategy(call));
  const content = await buildContent(call);
  const r = await rawCall(call, [{ role: "user", content: content as any }]);
  return r.text.trim();
}

/**
 * JSON validé. Sortie STRICTE par défaut (23 novembre 2026) : le schéma est envoyé au fournisseur, qui doit répondre
 * dans sa forme ; plus de reprise payée pour une réponse mal formée. Le schéma part en JSON libre (validé par Zod, une
 * réparation guidée par l'erreur) quand il ne peut pas partir strict sans rien perdre (sortie-stricte.ts), quand une
 * remise en forme (`prepare`) précède la validation, quand `strict: false` est demandé, ou en secours : schéma refusé
 * net par le fournisseur (rien facturé), plafond de la tâche qui ne couvre pas le schéma, réponse déjà payée en libre
 * (reprise d'une tâche commencée avant ce changement, relue sans repayer). `strict: true` : strict sans secours.
 */
export async function llmJson<S extends z.ZodType>(call: LlmCall, schema: S, opts: { strict?: boolean } = {}): Promise<z.infer<S>> {
  call = avecMemoire(withSelectedStrategy(call));
  const content = await buildContent(call);
  const auto = opts.strict === undefined;
  const format = opts.strict === true ? zodOutputFormat(schema as any) : auto && !call.prepare ? formatStrict(schema) : null;
  const cleRefus = format ? `${(() => { try { return routeLlm(call).provider; } catch { return "?"; } })()}:${shortHash(JSON.stringify(format.schema))}` : "";
  if (format && !(auto && (schemaRefuse(cleRefus) || dejaPayeEnLibre(call, content)))) {
    const etat = { attempt: 0 };
    try { return await jsonStrict(call, content, schema, format, etat); }
    catch (e) {
      // Secours, seulement avant toute dépense de cette demande : refus net du schéma (rien facturé) ou plafond.
      if (!auto || etat.attempt > 0 || !(e instanceof SchemaRefuse || e instanceof CostCapReached)) throw e;
      if (e instanceof SchemaRefuse) retenirRefus(cleRefus);
      console.info(`[ia] ${call.task} : sortie stricte ${e instanceof SchemaRefuse ? "refusée par le fournisseur" : "au-delà du plafond"}, la demande part en JSON libre`);
    }
  }
  return jsonLibre(call, content, schema);
}

/** Demande en JSON libre : le contenu, suivi de la consigne de forme. */
const messagesLibres = (content: Anthropic.ContentBlockParam[]): Anthropic.Beta.BetaMessageParam[] => [{ role: "user", content: [...(content as any[]), { type: "text", text: "Réponds uniquement avec un objet JSON valide, sans texte autour ni bloc de code." }] }];

/** Cette demande a déjà été payée en JSON libre (tâche reprise après le passage à la sortie stricte) : relue, jamais repayée. */
function dejaPayeEnLibre(call: LlmCall, content: Anthropic.ContentBlockParam[]): boolean {
  if (!call.usageKey) return false;
  const hash = requestHash({ system: systemText(call), messages: messagesLibres(content), format: undefined, maxTokens: placeDeDepart(call) });
  const cles = [call.usageKey, ...(call.nouvelleSiChangee ? [`${call.usageKey}~${String(hash).slice(0, 12)}`] : [])];
  return cles.some((usageKey) => { try { return !!existingOperation(call.userId, { task: call.task, projectId: call.projectId, usageKey, requestHash: hash }); } catch { return false; } });
}

async function jsonStrict<S extends z.ZodType>(call: LlmCall, content: Anthropic.ContentBlockParam[], schema: S, format: ReturnType<typeof zodOutputFormat>, etat: { attempt: number }): Promise<z.infer<S>> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: content as any }];
  // Même schéma envoyé au fournisseur, sans le parseur local du SDK (il ne doit pas lever avant l'enregistrement de la
  // réponse et de l'usage, et une demande doit pouvoir être copiée telle quelle). La validation stricte reste obligatoire juste après.
  // Réponse coupée faute de place : même demande avec plus de place, jusqu'à maxOutputTokens (essai réel du
  // 10 novembre 2026 : le plan des textes, coupé à 10 000 jetons, n'était jamais relancé en sortie structurée).
  const cap = Math.min(MAX_OUTPUT_TOKENS, call.maxOutputTokens ?? MAX_OUTPUT_TOKENS);
  let budget = placeDeDepart(call), attempt = 0, fixes = 0, reparation = false;
  for (;;) {
    etat.attempt = attempt;
    const r = await rawCall({ ...call, maxTokens: budget, ...(reparation ? { motifReprise: "forme" as const } : {}) }, messages, { type: format.type, schema: format.schema }, attempt ? `:fix${attempt}` : "", attempt);
    if (r.stop === "max_tokens" && call.sansRelanceCoupee) throw new PermanentError(REPONSE_COUPEE());
    reparation = false;
    if (r.stop === "max_tokens" && budget < cap) { budget = Math.min(cap, budget * 2); attempt++; continue; }
    // Un écart de pure forme (un texte un peu trop long, une liste trop longue) ne fait plus perdre un appel
    // payé : il est réparé comme en JSON libre (essai réel du 16 novembre 2026 : une correction de plus de
    // 400 signes avait fait sauter toute une relecture). Un écart de fond lève toujours l'erreur du schéma.
    const data = sansNullsFacultatifs(JSON.parse(r.text), format.schema as Record<string, unknown>), direct = schema.safeParse(data);
    if (direct.success) return direct.data;
    const repaired = salvage(schema as z.ZodType<unknown>, data);
    if (repaired.ok) return repaired.data as z.infer<S>;
    // Ce que le fournisseur ne garantit pas (longueur minimale, règle écrite en code) : UNE réparation, comme en libre.
    if (!fixes && attempt + 1 < JSON_ATTEMPTS && seulementContraintes(direct.error.issues)) {
      const issue = direct.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      messages.push({ role: "assistant", content: r.text || "{}" });
      messages.push({ role: "user", content: `Le JSON ne respecte pas le format attendu (${issue}). Renvoie l'objet complet corrigé, de façon concise.` });
      fixes = 1; attempt++; reparation = true;
      continue;
    }
    return schema.parse(data);
  }
}

async function jsonLibre<S extends z.ZodType>(call: LlmCall, content: Anthropic.ContentBlockParam[], schema: S): Promise<z.infer<S>> {
  const messages = messagesLibres(content);
  let last = "";
  let lastIssue = "";
  const cap = Math.min(MAX_OUTPUT_TOKENS, call.maxOutputTokens ?? MAX_OUTPUT_TOKENS);
  let step = { attempt: 0, budget: placeDeDepart(call), fixes: 0 }, reparation = false;
  for (;;) {
    const r = await rawCall({ ...call, maxTokens: step.budget, ...(reparation ? { motifReprise: "forme" as const } : {}) }, messages, undefined, step.attempt ? `:fix${step.attempt}` : "", step.attempt);
    last = r.text;
    // Réponse coupée faute de place (réflexion longue, beaucoup de photos) : même demande avec plus de place,
    // sans renvoyer le début tronqué au modèle (jsonRetry).
    const cut = r.stop === "max_tokens";
    if (cut && call.sansRelanceCoupee) throw new PermanentError(REPONSE_COUPEE());
    let issue = "";
    if (!(cut && step.budget < cap)) {
      const parsed = call.prepare ? call.prepare(extractJson(r.text)) : extractJson(r.text);
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
      issue = res.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    }
    const next = jsonRetry(step, cut, cap);
    if (!next) break;
    if (next.resend) {
      messages.push({ role: "assistant", content: r.text || "{}" });
      messages.push({ role: "user", content: `Le JSON ne respecte pas le format attendu (${issue || "JSON illisible"}). Renvoie l'objet complet corrigé, uniquement le JSON, de façon concise.` });
    }
    step = next; reparation = next.resend;
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
