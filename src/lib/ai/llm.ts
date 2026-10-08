/**
 * Appels Claude (Anthropic SDK) avec :
 *  - routage par tâche (modèle et effort réglables dans l'administration),
 *  - sorties JSON validées par Zod (sorties structurées ou réparation guidée),
 *  - images de référence (vision),
 *  - comptabilisation exacte des tokens dans l'enveloppe IA du client,
 *  - repli serveur en cas de refus de sécurité.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import sharp from "sharp";
import type { z } from "zod";
import { assertCanSpend, EUR, recordUsage } from "../billing";
import { assertAiAllowed, currentUserHasAiCredits } from "./access";
import { PermanentError, UserFacingError } from "../jobs";
import { activeProviderKey, priceFor, requirePrice, routeFor, usdToEur, type TaskId } from "./config";
import { contentLang, L, uiLang } from "../i18n-server";
import { languageDirective } from "./prompts";
import { AsyncLocalStorage } from "node:async_hooks";
import { assertUnderCostCap, recordCall, redact, shortHash } from "./trace";
import { brainMetaOf } from "../brain/facade";
import { getJsonSetting } from "../settings";
import { route, type Difficulty, type RouteDecision, type RoutingHistory } from "../orchestrator/router";
import { routingHistoryFor } from "../orchestrator/history";
import type { Deliverable } from "../quality/policies";

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
export function routeLlm(call: Pick<LlmCall, "task" | "images" | "routing">): RouteDecision {
  const custom = getJsonSetting<Partial<Record<TaskId, unknown>>>("ai.routes", {});
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
    overrides: custom[call.task] ? { [call.task]: routeFor(call.task) } : undefined,
  });
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
  if (cached?.key !== key) cached = { key, client: new Anthropic({ apiKey: key, maxRetries: 3, timeout: 10 * 60_000, fetch: countingFetch }) };
  return cached.client;
}

/** IA texte utilisable pour la tâche en cours : fournisseur configuré et crédits disponibles (sinon moteur local). */
export function llmConfigured() {
  return !!activeProviderKey("anthropic") && currentUserHasAiCredits();
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

function estimateMicro(call: LlmCall, model: string) {
  // Sans tarif « jetons » connu, l'appel est refusé (sinon il serait compté 0 € hors enveloppe).
  const p = requirePrice("anthropic", model);
  if (p.unit !== "tokens") throw new UserFacingError(L(`Tarif « jetons » attendu pour anthropic:${model} : corrigez-le dans l'administration.`, `A per-token price is expected for anthropic:${model}. Fix it in the admin settings.`));
  const inTok = (systemText(call).length + (call.context?.length ?? 0) + (call.reference?.length ?? 0) + brainOf(call).volatile.length + call.prompt.length) / 3.2 + (call.images?.length ?? 0) * 1600;
  const outTok = Math.min(call.maxTokens ?? 16000, 6000);
  return Math.round(((inTok * p.inputPerM + outTok * p.outputPerM) / 1e6) * usdToEur() * EUR);
}

function account(call: LlmCall, model: string, usage: Anthropic.Beta.BetaUsage | Anthropic.Usage, suffix = ""): { costMicro: number; estimated: boolean; eventId: string | null; dedup: boolean } {
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
  });
  return { costMicro, estimated: !p, ...billed };
}

type RawResult = { text: string; stop: string | null; model: string };

async function rawCall(call: LlmCall, messages: Anthropic.Beta.BetaMessageParam[], format?: unknown, suffix = "", callTry = 0): Promise<RawResult> {
  const decision = routeLlm(call);
  const route = { provider: decision.provider, model: decision.model, effort: decision.effort };
  if (route.provider !== "anthropic") throw new PermanentError(L(`La tâche ${call.task} est routée vers ${route.provider}, qui n'est pas un modèle de langage pris en charge.`, `Task ${call.task} is routed to ${route.provider}, which is not a supported language model.`));
  // Droits du compte vérifiés à chaque appel (forfait, budget), dans une tâche de fond ou non.
  assertAiAllowed(call.userId);
  const est = estimateMicro(call, route.model);
  // Plafond de dépense de la tâche (benchmark) : vérifié AVANT l'envoi.
  assertUnderCostCap(est);
  assertCanSpend(call.userId, est);
  const isHaiku = route.model.startsWith("claude-haiku");
  const { brain } = brainOf(call);
  const params: any = {
    model: route.model,
    // Avec réflexion, la limite couvre aussi la réflexion : une limite trop basse coupe la réponse et la fait repayer.
    // Seuls les jetons produits sont facturés, une limite plus haute ne coûte rien de plus.
    max_tokens: isHaiku ? (call.maxTokens ?? 32000) : Math.max(call.maxTokens ?? 32000, 8000),
    system: [{ type: "text", text: systemText(call), cache_control: { type: "ephemeral" } }],
    messages,
  };
  if (!isHaiku) {
    params.thinking = { type: "adaptive" };
    params.output_config = { effort: route.effort ?? "medium", ...(format ? { format } : {}) };
    params.betas = ["server-side-fallback-2026-07-01"];
    params.fallbacks = "default";
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
    effort: isHaiku ? null : (route.effort ?? "medium"),
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
    msg = await httpCounter.run(counter, async () => {
      const stream = isHaiku ? client().messages.stream(params) : client().beta.messages.stream(params);
      return (await stream.finalMessage()) as Anthropic.Beta.BetaMessage;
    });
  } catch (e) {
    recordCall({ ...trace, latencyMs: Date.now() - started, httpAttempts: counter.n || null, status: /timeout|timed out/i.test(String((e as Error)?.message)) ? "timeout" : "error", errorKind: `${(e as Error)?.name ?? "Error"}: ${redact(String((e as Error)?.message ?? e)).slice(0, 200)}` });
    if (e instanceof Anthropic.AuthenticationError) throw new PermanentError(L("La clé Anthropic configurée est refusée. Vérifiez-la dans l'administration.", "The configured Anthropic key was rejected. Check it in the admin settings."));
    if (e instanceof Anthropic.BadRequestError) throw new PermanentError(L(`Requête refusée par le fournisseur : ${e.message}`, `Request rejected by the provider: ${e.message}`));
    if (e instanceof Anthropic.NotFoundError) throw new PermanentError(L(`Modèle introuvable (${route.model}). Corrigez le routage dans l'administration.`, `Model not found (${route.model}). Fix the routing in the admin settings.`));
    throw e; // 429 / 5xx / réseau : la file de tâches réessaie.
  }
  // Réponse d'un modèle de repli sans prix connu : coût compté au prix du modèle demandé (jamais 0 €).
  const served = msg.model && priceFor("anthropic", msg.model) ? msg.model : route.model;
  const billed = account(call, served, msg.usage, suffix);
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
export async function pingAnthropic(model: string) {
  const r = await client().messages.create({ model, max_tokens: 16, messages: [{ role: "user", content: "Réponds OK." }] } as any);
  return { model: (r as any).model, ok: true };
}
