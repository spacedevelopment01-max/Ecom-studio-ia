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
import { currentUserHasAiCredits } from "./access";
import { PermanentError, UserFacingError } from "../jobs";
import { priceFor, providerKey, requirePrice, routeFor, usdToEur, type TaskId } from "./config";
import { contentLang, L, uiLang } from "../i18n-server";
import { languageDirective } from "./prompts";

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
};

let cached: { key: string; client: Anthropic } | null = null;
function client(): Anthropic {
  const key = providerKey("anthropic");
  if (!key) throw new UserFacingError(L("Aucun fournisseur d'IA de langage n'est configuré. L'administration doit renseigner la clé Anthropic.", "No language AI provider is configured. An administrator needs to add the Anthropic key."));
  if (cached?.key !== key) cached = { key, client: new Anthropic({ apiKey: key, maxRetries: 3, timeout: 10 * 60_000 }) };
  return cached.client;
}

/** IA texte utilisable pour la tâche en cours : fournisseur configuré et crédits disponibles (sinon moteur local). */
export function llmConfigured() {
  return !!providerKey("anthropic") && currentUserHasAiCredits();
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
  const inTok = (systemText(call).length + (call.context?.length ?? 0) + (call.reference?.length ?? 0) + call.prompt.length) / 3.2 + (call.images?.length ?? 0) * 1600;
  const outTok = Math.min(call.maxTokens ?? 16000, 6000);
  return Math.round(((inTok * p.inputPerM + outTok * p.outputPerM) / 1e6) * usdToEur() * EUR);
}

function account(call: LlmCall, model: string, usage: Anthropic.Beta.BetaUsage | Anthropic.Usage, suffix = "") {
  const p = priceFor("anthropic", model);
  const input = (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) * 1.25 + (usage.cache_read_input_tokens ?? 0) * 0.1;
  const output = usage.output_tokens ?? 0;
  const usd = p && p.unit === "tokens" ? (input * p.inputPerM + output * p.outputPerM) / 1e6 : 0;
  recordUsage({
    userId: call.userId,
    projectId: call.projectId,
    jobId: call.jobId,
    task: call.task,
    provider: "anthropic",
    model,
    unit: "tokens",
    inputUnits: (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0),
    outputUnits: output,
    costMicro: Math.round(usd * usdToEur() * EUR),
    estimated: !p,
    idempotencyKey: call.usageKey ? `${call.usageKey}${suffix}` : undefined,
  });
}

type RawResult = { text: string; stop: string | null; model: string };

async function rawCall(call: LlmCall, messages: Anthropic.Beta.BetaMessageParam[], format?: unknown, suffix = ""): Promise<RawResult> {
  const route = routeFor(call.task);
  if (route.provider !== "anthropic") throw new PermanentError(L(`La tâche ${call.task} est routée vers ${route.provider}, qui n'est pas un modèle de langage pris en charge.`, `Task ${call.task} is routed to ${route.provider}, which is not a supported language model.`));
  assertCanSpend(call.userId, estimateMicro(call, route.model));
  const isHaiku = route.model.startsWith("claude-haiku");
  const params: any = {
    model: route.model,
    max_tokens: call.maxTokens ?? 32000,
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
  try {
    const stream = isHaiku ? client().messages.stream(params) : client().beta.messages.stream(params);
    msg = (await stream.finalMessage()) as Anthropic.Beta.BetaMessage;
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new PermanentError(L("La clé Anthropic configurée est refusée. Vérifiez-la dans l'administration.", "The configured Anthropic key was rejected. Check it in the admin settings."));
    if (e instanceof Anthropic.BadRequestError) throw new PermanentError(L(`Requête refusée par le fournisseur : ${e.message}`, `Request rejected by the provider: ${e.message}`));
    if (e instanceof Anthropic.NotFoundError) throw new PermanentError(L(`Modèle introuvable (${route.model}). Corrigez le routage dans l'administration.`, `Model not found (${route.model}). Fix the routing in the admin settings.`));
    throw e; // 429 / 5xx / réseau : la file de tâches réessaie.
  }
  account(call, msg.model || route.model, msg.usage, suffix);
  if (msg.stop_reason === "refusal") throw new UserFacingError(L("Le modèle a décliné cette demande. Reformulez-la ou retirez l'élément en cause.", "The model declined this request. Rephrase it or remove the element at issue."));
  const text = msg.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("");
  return { text, stop: msg.stop_reason, model: msg.model };
}

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
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await rawCall(call, messages, undefined, attempt ? `:fix${attempt}` : "");
    last = r.text;
    const parsed = extractJson(r.text);
    const res = schema.safeParse(parsed);
    if (res.success) return res.data;
    const issue = res.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    messages.push({ role: "assistant", content: r.text || "{}" });
    messages.push({ role: "user", content: `Le JSON ne respecte pas le format attendu (${issue || "JSON illisible"}). Renvoie l'objet complet corrigé, uniquement le JSON.` });
  }
  throw new PermanentError(L(`Réponse IA inexploitable après correction : ${last.slice(0, 200)}`, `Unusable AI response after correction: ${last.slice(0, 200)}`));
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
