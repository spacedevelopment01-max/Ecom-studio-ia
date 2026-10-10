/**
 * Fournisseurs de génération d'images et de vidéo.
 * Principe de fidélité : le produit n'est jamais « réinventé ».
 *  - OpenAI : retouche par masque — seul le décor autour du produit est peint,
 *    puis les pixels d'origine du produit sont replacés par-dessus.
 *  - Gemini : génération d'un décor vide (sans produit), sur lequel le
 *    détourage réel est composé.
 *  - Vidéo (Veo / fal) : plans d'ambiance générés à partir d'une scène
 *    contenant le produit réel ; ils sont vérifiés puis intégrés au montage.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import { EUR, recordUsage, release, reserve, settleUncertain } from "../billing";
import { assertAiAllowed, currentAiUser, currentQuotaScope, currentUserHasAiCredits } from "./access";
import { assertQuota, consumeQuota, refundQuota, userPlan } from "../quotas";
import { all } from "../db";
import { PLANS } from "../plans";
import { PermanentError, UserFacingError } from "../jobs";
import { activeProviderKey, FX_SAFETY, requirePrice, routeFor, usdToEur } from "./config";
import { assertUnderCostCap, recordCall, redact } from "./trace";
import { L } from "../i18n-server";
import { getJsonSetting } from "../settings";
import { putFile } from "../storage";
import { route, type InputType, type RouteDecision } from "../orchestrator/router";
import { balance } from "../billing";
import { mediaBackup, mediaStatus, modelForProvider, selectMedia, USAGE_INFO, usageBackup, usageExplicit, usageOff, type MediaChoice, type MediaNeed, type MediaUsage } from "./media-routing";
import { mediaModel, type MediaKind } from "./media-models";

/** brain : contexte du Brain d'où vient la consigne de la génération (portée, empreinte, version), tracé dans ai_calls. */
type Ctx = { userId: string; projectId: string; jobId?: string | null; usageKey?: string; brain?: { scope: string; hash: string; version: string } };
const brainCols = (c?: Ctx) => ({ brainScope: c?.brain?.scope ?? null, brainHash: c?.brain?.hash ?? null, brainVersion: c?.brain?.version ?? null });
/** Raison, repli et escalade du Router V2 pour la génération en cours. */
const routingCols = (t?: MediaTrace) => (t?.routing ? { routingReason: t.routing.reason, fallback: t.routing.fallback, escalation: t.routing.escalation } : {});

/** Quota du forfait concerné par une génération (selon la portée de la tâche en cours), null si rien n'est décompté. */
function quotaFor(media: "image" | "video") {
  const scope = currentQuotaScope();
  if (scope === "ugc") return null; // la vidéo UGC est décomptée une fois, en entier
  if (media === "image") return scope === "creation" ? null : "visuals";
  return "aiVideos";
}

/**
 * Trace d'une génération (observabilité) : ouverte par `traced()`, complétée par `gate()` (fournisseur, modèle,
 * départ du chronomètre) puis par `recordMedia()` (succès) ; une génération partie puis échouée (refus, délai
 * dépassé) est tracée aussi. Aucune image ni consigne n'est enregistrée.
 */
type MediaTrace = { task: "image_generation" | "video_generation"; ctx?: Ctx; provider?: string; model?: string; unit?: "image" | "video_second" | "tokens"; started?: number; recorded?: boolean; reservation?: string; sent?: boolean; rejected?: boolean; routing?: { reason: string; fallback: boolean; escalation: boolean }; choice?: MediaChoice; usage?: MediaUsage; callId?: string | null };
const mediaTrace = new AsyncLocalStorage<MediaTrace>();

function traced<A extends [Ctx, ...any[]], R>(task: MediaTrace["task"], fn: (...a: A) => Promise<R>): (...a: A) => Promise<R> {
  return (...args: A) => {
    const t: MediaTrace = { task, ctx: args[0] };
    return mediaTrace.run(t, async () => {
      try {
        const out = await fn(...args);
        keepPaidImage(t, out);
        return out;
      } catch (e) {
        // Réservation du coût maximal : rendue si rien n'est parti ou si le fournisseur a refusé la demande ; sinon
        // (délai dépassé, coupure, erreur après acceptation ou réponse), coût maximal retenu par prudence.
        if (t.reservation && !t.recorded) {
          const status = (e as { status?: unknown })?.status;
          if (!t.sent) release(t.reservation, "aucune demande envoyée au fournisseur");
          else if (t.rejected || typeof status === "number") release(t.reservation, `refus du fournisseur${typeof status === "number" ? ` (${status})` : ""}`);
          else settleUncertain(t.reservation, redact(String((e as Error)?.message ?? e)).slice(0, 160));
          // Rien n'a été facturé (réservation rendue) : un secours compatible peut prendre le relais sans double coût.
          if (!t.sent || t.rejected || typeof status === "number") markReleased(e, t);
        }
        // Échec après le départ de la demande au fournisseur : l'appel a eu lieu, il est tracé (coût inconnu = 0, signalé).
        if (t.provider && !t.recorded) {
          const msg = String((e as Error)?.message ?? e);
          recordCall({ userId: t.ctx!.userId, projectId: t.ctx!.projectId, jobId: t.ctx!.jobId, task, provider: t.provider, requestedModel: t.model ?? "", unit: t.unit ?? "image", latencyMs: t.started ? Date.now() - t.started : null, usageKey: t.ctx!.usageKey ?? null, estimated: true, status: /délai|timeout|timed out/i.test(msg) ? "timeout" : "error", errorKind: `${(e as Error)?.name ?? "Error"}: ${redact(msg).slice(0, 200)}` , ...brainCols(t.ctx), ...routingCols(t) });
        }
        throw e;
      }
    });
  };
}

/** Clé de stockage de l'image d'origine d'un appel payé (diagnostic) : ai-originals/<projet>/<appel>.<ext>. */
export function paidImageKey(projectId: string, callId: string, data: Buffer): string {
  const ext = data.subarray(0, 4).toString("hex") === "89504e47" ? ".png" : data.subarray(0, 3).toString("hex") === "ffd8ff" ? ".jpg" : data.subarray(8, 12).toString("ascii") === "WEBP" ? ".webp" : ".bin";
  return `ai-originals/${projectId.replace(/[^\w-]/g, "_")}/${callId}${ext}`;
}

/**
 * Toute image PAYÉE est conservée telle que le fournisseur l'a renvoyée, sous l'identifiant de son appel (ai_calls),
 * avant vectorisation, retouche ou contrôle qualité — même si elle est rejetée ensuite. Elle n'entre pas dans la
 * bibliothèque du client (jamais réutilisée automatiquement) : elle sert au diagnostic. Ne fait jamais échouer la
 * génération déjà payée.
 */
function keepPaidImage(t: MediaTrace, out: unknown) {
  if (t.task !== "image_generation" || !t.recorded || !t.callId || !t.ctx?.projectId || !Buffer.isBuffer(out)) return;
  try {
    putFile(paidImageKey(t.ctx.projectId, t.callId, out), out);
  } catch (e) {
    console.warn("[images] original payé non conservé :", (e as Error).message);
  }
}

/** Échec sans coût (réservation rendue) : le secours peut être tenté ; on retient le modèle qui a échoué. */
function markReleased(e: unknown, t: MediaTrace) {
  if (e && typeof e === "object") Object.assign(e as object, { mediaReleased: true, mediaFailed: t.provider && t.model ? `${t.provider}:${t.model}` : null });
}

/** Relais en cours : modèle en échec écarté, et SEUL le secours choisi par l'administration peut être appelé. */
const mediaExclude = new AsyncLocalStorage<{ exclude: string[]; only: string }>();

/** Secours utilisable pour cet usage (sinon ce type) : confirmé, tarifé, clé active, adaptateur réel (coût couvert). */
function usableBackup(kind: MediaKind, usage?: MediaUsage): { provider: string; model: string } | null {
  const b = usage ? usageBackup(usage) : mediaBackup(kind);
  const m = b ? mediaModel(b.provider, b.model) : null;
  return b && m && mediaStatus(m).usable ? b : null;
}

/**
 * Secours en cas d'échec SANS COÛT du principal (refus ou panne du fournisseur, réservation rendue) : la même
 * génération est relancée une fois, le modèle en échec étant écarté. Le secours passe par sa propre réservation
 * (son coût maximal est couvert avant l'envoi). Un résultat incertain (coût retenu) n'est jamais relancé.
 */
function withMediaBackup<A extends [Ctx, ...any[]], R>(kind: MediaKind, fn: (...a: A) => Promise<R>, opts: { usage?: (...a: A) => MediaUsage | undefined; providers?: string[] } = {}): (...a: A) => Promise<R> {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      const failed = (e as { mediaReleased?: boolean; mediaFailed?: string | null }) ?? {};
      // Secours de l'USAGE de la génération (logo, image produit…), sinon celui du type.
      const backup = usableBackup(kind, opts.usage?.(...args));
      if (!failed.mediaReleased || !failed.mediaFailed || !backup || `${backup.provider}:${backup.model}` === failed.mediaFailed || mediaExclude.getStore()) throw e;
      // Chemin branché pour certains fournisseurs seulement (retouche par masque : OpenAI).
      if (opts.providers && !opts.providers.includes(backup.provider)) throw e;
      return mediaExclude.run({ exclude: [failed.mediaFailed], only: `${backup.provider}:${backup.model}` }, () => fn(...args));
    }
  };
}

/** Reste du budget IA du compte (micro-euros) pour le mode automatique, null si inconnu. */
function budgetLeft(userId?: string): number | null {
  try {
    return userId ? balance(userId).available : null;
  } catch {
    return null;
  }
}

/** Modèle à appeler chez ce fournisseur pour la génération en cours (choix tracé, sinon modèle historique). */
function pickModel(provider: string, kind: MediaKind): string {
  const t = mediaTrace.getStore();
  return modelForProvider(provider, kind, t?.choice ?? null, t?.usage);
}

/** Intervalles d'interrogation des générations longues (réduits dans les tests). */
export const mediaPoll = { veoMs: 10_000, falVideoMs: 6000, falImageMs: 3000 };

/** Marge prudente sur le coût d'une génération (jetons d'image variables selon la taille et la qualité). */
const MEDIA_MAX_FACTOR = 1.25;

/**
 * Avant une génération : quota du forfait (message clair s'il est épuisé), plafond de la tâche, puis réservation
 * atomique du coût MAXIMAL sur le budget du compte. Rien ne part si le maximum ne peut pas être couvert.
 */
function gate(ctx: Ctx, micro: number, media: "image" | "video", provider: string, model: string) {
  // Droits du compte vérifiés à chaque génération (forfait, budget), dans une tâche de fond ou non.
  assertAiAllowed(ctx.userId);
  const q = quotaFor(media);
  if (q) assertQuota(ctx.userId, q);
  const max = Math.ceil(micro * MEDIA_MAX_FACTOR * FX_SAFETY * Math.max(1, getJsonSetting<number>("billing.markup", 1)));
  assertUnderCostCap(max);
  const t = mediaTrace.getStore();
  // Hors trace (appel direct, jamais en pratique) : la génération serait sans suivi de réservation — refusée.
  if (!t) throw new PermanentError("génération hors suivi de réservation");
  t.reservation = reserve(ctx.userId, max, { task: t.task, provider, model, jobId: ctx.jobId, projectId: ctx.projectId });
  const priced = requirePrice(provider, model);
  Object.assign(t, { provider, model, unit: media === "video" ? "video_second" : priced.unit === "tokens" ? "tokens" : "image", started: Date.now() });
}

/** La demande part chez le fournisseur (à partir d'ici, un échec sans réponse d'erreur est incertain). */
function sent() {
  const t = mediaTrace.getStore();
  if (t) t.sent = true;
}
const providerFetch: typeof fetch = (input, init) => {
  sent();
  return fetch(input, init);
};
/** Refus explicite du fournisseur (clé, requête, quota) : rien n'a été produit, la réservation est rendue. */
function refusal<E extends Error>(e: E): E {
  const t = mediaTrace.getStore();
  if (t) t.rejected = true;
  return e;
}

/** Après une génération : consommation réelle (budget caché) et décompte du quota. */
function recordMedia(u: Parameters<typeof recordUsage>[0]) {
  const t = mediaTrace.getStore();
  const billed = recordUsage(u, { reservationId: t?.reservation ?? null });
  if (t) t.recorded = true;
  const callId = recordCall({ userId: u.userId, projectId: u.projectId, jobId: u.jobId, task: u.task, provider: u.provider, requestedModel: t?.model ?? u.model, servedModel: u.model, unit: u.unit as "tokens" | "image" | "video_second", inputTokens: u.unit === "tokens" ? u.inputUnits : 0, outputTokens: u.unit === "tokens" ? u.outputUnits : 0, quantity: u.quantity, latencyMs: t?.started ? Date.now() - t.started : null, costMicro: u.costMicro, estimated: u.estimated, usageKey: u.idempotencyKey ?? null, usageEventId: billed.eventId, billingDedup: billed.dedup, status: "ok" , ...brainCols(t?.ctx), ...routingCols(t) });
  if (t) t.callId = callId;
  const q = quotaFor(u.task === "video_generation" ? "video" : "image");
  if (q) consumeQuota(u.userId, q, 1, u.idempotencyKey ? `${q}:${u.idempotencyKey}` : null);
}

/**
 * Image générée puis écartée (contrôle de fidélité non concluant, erreur avant l'enregistrement) : jamais montrée
 * au client, elle ne lui coûte pas de visuel. Rend les décomptes faits sous la clé `key` (préfixe des appels).
 * Le coût réel (budget caché) reste comptabilisé.
 */
export function refundMediaQuota(userId: string, key: string, quota: "visuals" | "aiVideos" = "visuals"): number {
  const esc = (v: string) => v.replace(/[\\%_]/g, (c) => `\\${c}`);
  const refs = all<{ ref: string }>("SELECT ref FROM quota_events WHERE user_id = ? AND (ref = ? OR ref LIKE ? ESCAPE '\\')", userId, `${quota}:${key}`, `${quota}:${esc(key)}:%`);
  let n = 0;
  for (const r of refs) if (refundQuota(userId, r.ref)) n++;
  return n;
}

/** Pendant une tâche, un compte sans forfait (découverte gratuite) ne crée ni images ni vidéos par l'IA. */
function mediaAllowed() {
  const u = currentAiUser();
  return currentUserHasAiCredits() && (!u || !!userPlan(u));
}

function cost(provider: string, model: string, units: { input?: number; output?: number; imageIn?: number; imageOut?: number; images?: number; seconds?: number }) {
  // Sans tarif connu, la génération est refusée (sinon elle serait comptée 0 € hors enveloppe).
  const p = requirePrice(provider, model);
  let usd = 0;
  if (p.unit === "tokens") usd = ((units.input ?? 0) * p.inputPerM + (units.imageIn ?? 0) * (p.imageInputPerM ?? p.inputPerM) + (units.output ?? 0) * p.outputPerM + (units.imageOut ?? 0) * (p.imageOutputPerM ?? p.outputPerM)) / 1e6;
  // Image au forfait (Gemini) : prix de l'image produite + jetons d'entrée (texte, images de référence).
  if (p.unit === "image") usd = (units.images ?? 1) * p.perImage + ((units.input ?? 0) * (p.inputPerM ?? 0)) / 1e6;
  if (p.unit === "video_second") usd = (units.seconds ?? 0) * p.perSecond;
  return { micro: Math.round(usd * usdToEur() * EUR), estimated: p.unit !== "tokens" };
}

/**
 * Bornes documentées des générations (coût MAXIMAL réservé) :
 *  - OpenAI gpt-image-1 : jetons de sortie par taille et qualité (tableau du fournisseur, au plus 6 240 en « high »),
 *    jetons d'image d'entrée ≤ 1 500 par image (85 + 170 par tuile de 512 px après mise à l'échelle 2 048 / 768),
 *    jetons de texte ≤ octets du texte ; une seule image demandée (`n: 1`).
 *  - Gemini : une image au forfait + entrée ≤ octets du texte + 1 300 jetons par image de référence (tuiles 768 px).
 *  - Veo : facturé à la seconde de vidéo produite ; Veo 3 produit 8 s par défaut → au moins 8 s réservées et comptées.
 *  - fal Kling : durée 5 ou 10 s seulement → arrondie au-dessus, la même valeur est demandée, réservée et comptée.
 */
const OPENAI_OUT_TOKENS: Record<string, Record<string, number>> = {
  high: { "1024x1024": 4160, "1024x1536": 6240, "1536x1024": 6208 },
  medium: { "1024x1024": 1056, "1024x1536": 1584, "1536x1024": 1568 },
};
const OPENAI_IMAGE_IN_TOKENS = 1500;
const GEMINI_IMAGE_IN_TOKENS = 1300;
export const VEO_MIN_BILLED_SECONDS = 8;
const bytes = (t: string) => Buffer.byteLength(t, "utf8");

export function openaiImageMax(model: string, o: { prompt: string; images: number; size: string; quality: "medium" | "high" }) {
  // Tarif « par image » saisi dans l'administration : borne directe (une image demandée).
  const p = requirePrice("openai", model);
  if (p.unit === "image") return cost("openai", model, { images: 1, input: bytes(o.prompt) }).micro;
  // Au jeton : seulement pour le modèle dont la table officielle des jetons de sortie est connue.
  if (model !== "gpt-image-1") throw new PermanentError(L(`Jetons de sortie de ${model} inconnus : saisissez un tarif par image dans l'administration (coût maximal non borné, génération bloquée).`, `Output tokens of ${model} are unknown: enter a per-image price in the admin settings (maximum cost not bounded, generation blocked).`));
  const out = OPENAI_OUT_TOKENS[o.quality]?.[o.size];
  if (!out) throw new PermanentError(L(`Taille d'image ${o.size} sans borne de coût connue : génération bloquée.`, `Image size ${o.size} has no known cost bound: generation blocked.`));
  return cost("openai", model, { input: bytes(o.prompt), imageIn: OPENAI_IMAGE_IN_TOKENS * o.images, imageOut: out }).micro;
}

export function geminiImageMax(model: string, o: { prompt: string; images: number }) {
  return cost("google", model, { images: 1, input: bytes(o.prompt) + GEMINI_IMAGE_IN_TOKENS * o.images }).micro;
}

/**
 * Secondes facturées par Veo : Veo 3 produit toujours 8 s (au moins 8 s réservées et comptées) ; Veo 3.1 accepte
 * 4, 6 ou 8 s (`durationSeconds`) : la plus courte qui couvre la demande est demandée, réservée et comptée.
 */
export const veoBilledSeconds = (requested?: number, model = "veo-3.0-generate-001") => {
  const d = mediaModel("google", model)?.durations;
  if (d && d.length > 1) return d.find((x) => x >= Math.ceil(requested ?? 8)) ?? d[d.length - 1];
  return Math.max(VEO_MIN_BILLED_SECONDS, Math.ceil(requested ?? VEO_MIN_BILLED_SECONDS));
};

/** Durée Kling (5 ou 10 s) ; autre modèle fal : durée non bornée de façon fiable → bloqué. */
export function falBilledSeconds(model: string, requested?: number) {
  // Durées acceptées par le modèle (catalogue) : la plus courte qui couvre la demande, sinon la plus longue.
  const d = mediaModel("fal", model)?.durations;
  if (d?.length) return d.find((x) => x >= Math.ceil(requested ?? 5)) ?? d[d.length - 1];
  if (!model.startsWith("fal-ai/kling-video/")) throw new PermanentError(L(`Modèle vidéo fal ${model} sans borne de durée connue : génération bloquée.`, `fal video model ${model} has no known duration bound: generation blocked.`));
  return (requested ?? 5) <= 5 ? 5 : 10;
}

/**
 * Fournisseur d'une génération média choisi par le Router V2 : route de l'administration si sa clé est active, sinon
 * le fournisseur par défaut, sinon un fournisseur de repli qui a VRAIMENT la capacité demandée (image, édition par
 * masque, vidéo). La barrière de qualité reste la même. La décision est attachée à la trace de la génération.
 */
export function routeMedia(task: "image_generation" | "video_generation", inputType?: InputType, need?: Partial<MediaNeed>): RouteDecision | null {
  if (!mediaAllowed()) return null;
  const kind: MediaKind = task === "video_generation" ? "video" : "image";
  const t = mediaTrace.getStore();
  const relay = mediaExclude.getStore();
  const exclude = relay?.exclude ?? [];
  const usage = need?.usage;
  if (t && usage) t.usage = usage;
  // Usage coupé par l'administration (retouches produit) : aucun modèle, pas de repli historique.
  if (usage && usageOff(usage)) return null;
  // Routage multimédia : principal de l'administration, secours compatible et couvert, ou mode automatique.
  const choice = selectMedia({ ...(usage ? USAGE_INFO[usage].need : {}), kind, mask: inputType === "mask", ...(kind === "video" ? { imageToVideo: true } : {}), ...need }, { exclude, budgetLeftMicro: budgetLeft(t?.ctx?.userId ?? currentAiUser() ?? undefined), mode: relay ? "manual" : undefined });
  // Relais : uniquement le secours désigné (jamais un autre modèle de repli, dont le coût n'aurait pas été validé).
  if (relay && (!choice || `${choice.provider}:${choice.model}` !== relay.only)) return null;
  if (choice) {
    if (t) {
      t.choice = choice;
      t.routing = { reason: choice.reason, fallback: choice.role === "backup" || exclude.length > 0, escalation: false };
    }
    return { mode: kind, provider: choice.provider, model: choice.model, tier: "strong", reason: choice.reason, fallback: choice.role === "backup", escalation: false, qualityTarget: null };
  }
  // Usage réglé explicitement : son choix (principal, secours) est respecté — aucun autre modèle en silence.
  if (usage && usageExplicit(usage)) return null;
  // Aucun modèle du catalogue ne convient : comportement historique du Router V2 (repli vers un fournisseur capable).
  const custom = getJsonSetting<Partial<Record<string, unknown>>>("ai.routes", {});
  const d = route({ task, inputType, aiActive: true, allowLocal: false, available: (p) => !!activeProviderKey(p) && !exclude.some((x) => x.startsWith(`${p}:`)), overrides: custom[task] ? { [task]: routeFor(task) } : undefined });
  if (d.mode === "none") return null;
  if (t) t.routing = { reason: d.reason, fallback: d.fallback, escalation: d.escalation };
  return d;
}

export function imageProviderAvailable(need?: Partial<MediaNeed>): "openai" | "google" | "fal" | null {
  const d = routeMedia("image_generation", undefined, need);
  return d && (d.provider === "openai" || d.provider === "google" || d.provider === "fal") ? d.provider : null;
}

/** Pourquoi aucune image IA ne peut être faite maintenant (affiché au client et dans le diagnostic). */
export function imageUnavailableReason(usage?: MediaUsage): string | null {
  if (imageProviderAvailable(usage ? { usage } : undefined)) return null;
  if (!currentUserHasAiCredits()) return L("IA non active pour ce compte (forfait ou budget IA épuisé)", "AI not active for this account (plan or AI budget used up)");
  const u = currentAiUser();
  if (u && !userPlan(u)) return L("aucun forfait actif : les images IA sont réservées aux forfaits", "no active plan: AI images come with the plans");
  if (usage && usageExplicit(usage)) return L(`le modèle choisi pour « ${USAGE_INFO[usage].label.fr} » (et son secours) n'est pas utilisable : clé, tarif, confirmation ou capacité — voir Administration › Images & Vidéos`, `the model chosen for "${USAGE_INFO[usage].label.en}" (and its backup) is not usable: key, price, confirmation or capability — see Admin › Images & videos`);
  return L("aucune clé OpenAI, Gemini ou fal.ai active (ou aucun modèle d'image compatible) dans l'administration", "no active OpenAI, Gemini or fal.ai key (or no compatible image model) in the admin settings");
}

/**
 * Parcours d'une image qui montre le produit RÉEL, selon l'usage :
 *  - retouche par masque (le modèle repeint autour du produit, pixels remis) si un modèle capable est choisi pour
 *    « Retouches produit » (images produit) ou pour l'usage lui-même (publicités) ;
 *  - sinon décor généré par le modèle de l'usage, puis produit réel composé par le studio ;
 *  - null : aucun modèle utilisable (rien n'est généré).
 */
export function productImagePath(usage: "product_image" | "ad_visual"): { path: "masked_edit"; usage: MediaUsage } | { path: "composite_plate"; usage: MediaUsage } | null {
  const editUsage: MediaUsage = usage === "product_image" ? "product_edit" : usage;
  const edit = routeMedia("image_generation", "mask", { usage: editUsage });
  if (edit && edit.provider === "openai") return { path: "masked_edit", usage: editUsage };
  const gen = routeMedia("image_generation", undefined, { usage });
  return gen ? { path: "composite_plate", usage } : null;
}

/** Fournisseur et modèle que prendra une génération de cet usage (affichage, notes de la tâche), null si aucun. */
export function mediaRouteFor(usage: MediaUsage, need: Partial<MediaNeed> = {}): { provider: string; model: string; reason: string } | null {
  const d = routeMedia(USAGE_INFO[usage].kind === "video" ? "video_generation" : "image_generation", need.mask ? "mask" : undefined, { ...need, usage });
  return d ? { provider: d.provider, model: d.model, reason: d.reason } : null;
}

export function videoProviderAvailable(usage?: MediaUsage): "google" | "fal" | null {
  const d = routeMedia("video_generation", undefined, usage ? { usage } : undefined);
  return d && (d.provider === "google" || d.provider === "fal") ? d.provider : null;
}

/**
 * Décor peint autour du produit (OpenAI, retouche par masque).
 * `composite` : image PNG du cadre avec le produit déjà placé ;
 * `productMask` : PNG de même taille, opaque là où se trouve le produit.
 */
async function openaiSceneImpl(ctx: Ctx, input: { composite: Buffer; productMask: Buffer; prompt: string; size: "1024x1024" | "1024x1536" | "1536x1024"; usage?: MediaUsage }) {
  const key = activeProviderKey("openai");
  if (!key) throw new UserFacingError(L("Aucune clé OpenAI configurée pour la génération d'images.", "No OpenAI key configured for image generation."));
  // Router V2 : capacité vérifiée pour l'usage (retouches produit, publicités), décision tracée avec la génération.
  const d = routeMedia("image_generation", "mask", { usage: input.usage ?? "product_edit" });
  if (mediaExclude.getStore() && d?.provider !== "openai") throw new PermanentError(L("Aucun secours capable de retoucher par masque.", "No backup able to do mask editing."));
  const model = pickModel("openai", "image");
  const scenePrompt = `${input.prompt} Keep the existing product exactly as it is (shape, colours, label, proportions); only paint the surrounding environment, surface and lighting. The product stands on the surface with a natural contact shadow, the camera height and perspective match the product photo. No text, no extra products.`;
  gate(ctx, openaiImageMax(model, { prompt: scenePrompt, images: 2, size: input.size, quality: "high" }), "image", "openai", model);
  // Le masque OpenAI : zones transparentes = zones à peindre. On rend donc
  // transparent tout ce qui n'est pas le produit.
  const { data, info } = await sharp(input.productMask).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const mask = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    const a = data[i * 4 + 3];
    mask[i * 4] = mask[i * 4 + 1] = mask[i * 4 + 2] = 0;
    mask[i * 4 + 3] = a > 8 ? 255 : 0;
  }
  const maskPng = await sharp(mask, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  const client = new OpenAI({ apiKey: key, maxRetries: 0, timeout: 300_000 });
  let res: any;
  try {
    sent();
    res = await client.images.edit({
      model,
      image: await toFile(input.composite, "scene.png", { type: "image/png" }),
      mask: await toFile(maskPng, "mask.png", { type: "image/png" }),
      prompt: scenePrompt,
      size: input.size,
      quality: "high",
      n: 1,
    } as any);
  } catch (e: any) {
    if (e?.status === 401) throw refusal(new PermanentError(L("Clé OpenAI refusée : vérifiez-la dans l'administration.", "OpenAI key rejected: check it in the admin panel.")));
    if (e?.status === 400) throw refusal(new PermanentError(L(`Génération d'image refusée par OpenAI : ${e.message}`, `Image generation rejected by OpenAI: ${e.message}`)));
    throw e;
  }
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error(L("Réponse d'image vide.", "Empty image response."));
  const u = res.usage ?? {};
  const c = cost("openai", model, { input: u.input_tokens_details?.text_tokens ?? 0, imageIn: u.input_tokens_details?.image_tokens ?? 0, imageOut: u.output_tokens ?? 0 });
  recordMedia({ userId: ctx.userId, projectId: ctx.projectId, jobId: ctx.jobId, task: "image_generation", provider: "openai", model, unit: "tokens", inputUnits: u.input_tokens ?? 0, outputUnits: u.output_tokens ?? 0, quantity: 1, costMicro: c.micro, estimated: !res.usage, idempotencyKey: ctx.usageKey });
  return Buffer.from(b64, "base64");
}

/**
 * Décor vide généré par le modèle de l'usage (images produit, publicités), quel que soit le fournisseur ; le produit
 * réel est composé ensuite par le studio. Aucune image du produit n'est envoyée : les modèles d'image la redessinent
 * presque toujours dans le décor, ce qui donnerait un second produit (réinventé) à côté du vrai.
 */
async function productPlateImpl(ctx: Ctx, input: { prompt: string; aspect: "1:1" | "4:5" | "9:16" | "16:9" | "2:3"; usage?: MediaUsage }) {
  const text = `Photograph of an empty product-photography set, ${input.prompt}. The center foreground surface must be empty, flat and clear, seen at eye level from slightly above (a real product will be placed there later, standing on that surface). Aspect ratio ${input.aspect}. No text, no lettering, no logo, no product, no packaging, no bottle, no device, no people, no hands.`;
  const aspect = input.aspect === "2:3" ? "4:5" : input.aspect;
  return generateImageImpl(ctx, { text, aspect, reference: null, quality: "high", usage: input.usage ?? "product_image" });
}

/**
 * Image d'ambiance d'une activité de services (texte vers image) : lieu, gestes, matériaux, lumière.
 * Consignes d'honnêteté ajoutées à chaque demande : aucun visage identifiable présenté comme un client,
 * aucun texte, logo, diplôme, certificat ni récompense. `reference` : photo réelle de l'activité (ambiance seulement).
 */
export async function ambianceImage(ctx: Ctx, input: { prompt: string; aspect: "1:1" | "4:5" | "9:16" | "16:9"; reference?: Buffer | null; usage?: MediaUsage }) {
  const text = `${input.prompt}
Editorial photograph that conveys the atmosphere of this activity, natural light, realistic, premium. Tools, materials, the work and the place tell the story. No people, no hands, no faces (the most frequent source of defects). No text, no lettering, no logo, no signage, no diploma, no certificate, no award, no badge, no price. Aspect ratio ${input.aspect}.${input.reference ? " The reference photo shows the real business: use it only for mood, colors and kind of place; do not copy any person." : ""}`;
  return generateImage(ctx, { text, aspect: input.aspect, reference: input.reference ?? null, quality: "high", usage: input.usage ?? "scene" });
}

/**
 * Symbole de logo dessiné par l'IA d'images (meilleure en dessin que le modèle de texte) : forme plate d'une seule
 * couleur sur fond blanc, sans texte, pensée pour être vectorisée. `reference` : photo du produit (silhouette à styliser).
 */
export async function logoSymbolImage(ctx: Ctx, input: { concept: string; reference?: Buffer | null }) {
  const text = `Design a single flat vector-style logo symbol (brand mark): ${input.concept}
Rules: one solid black shape (or up to three bold black shapes) on a pure white background, centered, generous margins. Bold, simple geometric forms that stay recognizable at 16 pixels: thick strokes, no thin lines, no gradients, no shading, no texture, no outlines of the canvas, no 3D, no mockup. Absolutely no text, no letters, no numbers, no words. Think like a senior brand designer: a meaningful sign drawn from the idea; an object of the trade is welcome when stylized with intent, never as clip-art. Timeless, distinctive.${input.reference ? " The reference photo is context only: do not copy it." : ""}`;
  return generateImage(ctx, { text, aspect: "1:1", reference: input.reference ?? null, quality: "medium", usage: "logo" });
}

/**
 * Logo complet (symbole + nom) dessiné par l'IA d'images, d'après le brief détaillé du directeur artistique.
 * Fond transparent (OpenAI) ; avec Gemini, fond blanc retiré ensuite.
 */
export async function fullLogoImage(ctx: Ctx, input: { brief: string; name: string; descriptor?: string; tagline?: string; colors?: string[] }) {
  const text = `Design a complete, professional logo as a top branding agency would deliver it (logo artwork only, not a mockup): ${input.brief}
${input.colors?.length ? `Colors: use ONLY the brand's colors ${input.colors.join(", ")} (plus white or near-black if needed) — the logo must match the brand guidelines.
` : ""}Text in the logo, spelled EXACTLY, same accents: the name "${input.name}"${input.descriptor ? ` and, smaller, the trade line "${input.descriptor}"` : ""}${input.tagline ? ` and, smallest, the brand's slogan "${input.tagline}"` : ""}. No other words${input.tagline ? "" : ", no slogan"}, no fake letters.
Quality bar: a modern, professional logo for a real small business — original, made for this brand only, never a copy of an existing logo. Follow the composition and style chosen in the brief. Crisp edges, centered, generous margins, on a plain transparent or pure white background. No mockup, no paper, no wall, no photo background, no frame around the canvas.`;
  return generateImage(ctx, { text, aspect: "1:1", reference: null, quality: "high", transparent: true, usage: "logo", need: { text: true, transparent: true } });
}

/**
 * Logo V2 — logo complet d'un territoire (illustré, minimaliste, typographique, monogramme, emblème, texturé,
 * dégradé…) dessiné par le modèle d'images de l'usage « Logos ». La demande complète vient du moteur Logo V2
 * (style, texte exact) ; haute qualité, fond transparent quand le modèle le permet.
 */
export async function logoArtworkImage(ctx: Ctx, input: { prompt: string }) {
  return generateImage(ctx, { text: input.prompt, aspect: "1:1", reference: null, quality: "high", transparent: true, usage: "logo", need: { text: true, transparent: true } });
}

/** Génération d'image par le fournisseur d'images configuré (Gemini ou OpenAI), décomptée et facturée. */
async function generateImageImpl(ctx: Ctx, input: { text: string; aspect: "1:1" | "4:5" | "9:16" | "16:9"; reference: Buffer | null; quality: "medium" | "high"; transparent?: boolean; usage?: MediaUsage; need?: Partial<MediaNeed> }) {
  const provider = imageProviderAvailable({ references: input.reference ? 1 : 0, ...(input.usage ? { usage: input.usage } : {}), ...input.need });
  if (!provider) throw new UserFacingError(L("Aucun fournisseur d'images configuré (Google Gemini, OpenAI ou fal.ai).", "No image provider configured (Google Gemini, OpenAI or fal.ai)."));
  const text = input.text;
  const ref = input.reference ? await sharp(input.reference).rotate().resize(768, 768, { fit: "inside" }).jpeg({ quality: 85 }).toBuffer() : null;
  if (provider === "fal") return falImage(ctx, pickModel("fal", "image"), text, ref ? [ref] : [], input.aspect);
  if (provider === "google") {
    const key = activeProviderKey("google")!;
    const model = pickModel("google", "image");
    const gmax = geminiImageMax(model, { prompt: text, images: ref ? 1 : 0 });
    gate(ctx, gmax, "image", "google", model);
    const parts: any[] = [{ text }];
    if (ref) parts.push({ inline_data: { mime_type: "image/jpeg", data: ref.toString("base64") } });
    const r = await providerFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: input.aspect } } }),
    });
    if (r.status === 401 || r.status === 403) throw refusal(new PermanentError(L("Clé Google refusée : vérifiez-la dans l'administration.", "Google key rejected: check it in the admin panel.")));
    if (r.status === 400) throw refusal(new PermanentError(L("Requête refusée par Gemini : ", "Request rejected by Gemini: ") + (await r.text()).slice(0, 300)));
    if (!r.ok) throw refusal(new Error(`Gemini ${r.status}${L(" : ", ": ")}${(await r.text()).slice(0, 200)}`));
    const j: any = await r.json();
    const img = j.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData || p.inline_data);
    const b64 = img?.inlineData?.data ?? img?.inline_data?.data;
    if (!b64) throw new Error(L("Gemini n'a pas renvoyé d'image (contenu filtré ou indisponible).", "Gemini returned no image (content filtered or unavailable)."));
    recordMedia({ userId: ctx.userId, projectId: ctx.projectId, jobId: ctx.jobId, task: "image_generation", provider: "google", model, unit: "image", quantity: 1, costMicro: gmax, estimated: true, idempotencyKey: ctx.usageKey });
    return Buffer.from(b64, "base64");
  }
  const key = activeProviderKey("openai")!;
  const model = pickModel("openai", "image");
  const size = input.aspect === "16:9" ? "1536x1024" : input.aspect === "1:1" ? "1024x1024" : "1024x1536";
  gate(ctx, openaiImageMax(model, { prompt: text, images: ref ? 1 : 0, size, quality: input.quality }), "image", "openai", model);
  const client = new OpenAI({ apiKey: key, maxRetries: 0, timeout: 300_000 });
  let res: any;
  try {
    sent();
    res = ref
      ? await client.images.edit({ model, image: [await toFile(ref, "reference.jpg", { type: "image/jpeg" })] as any, prompt: text, size, quality: input.quality, n: 1 } as any)
      : await client.images.generate({ model, prompt: text, size, quality: input.quality, n: 1, ...(input.transparent ? { background: "transparent", output_format: "png" } : {}) } as any);
  } catch (e: any) {
    if (e?.status === 401 || e?.status === 403) throw refusal(new PermanentError(L("Clé OpenAI refusée : vérifiez-la dans l'administration.", "OpenAI key rejected: check it in the admin panel.")));
    if (e?.status === 400) throw refusal(new PermanentError(L(`Requête refusée par OpenAI : ${String(e?.message ?? "").slice(0, 300)}`, `Request rejected by OpenAI: ${String(e?.message ?? "").slice(0, 300)}`)));
    throw e;
  }
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error(L("OpenAI n'a pas renvoyé d'image.", "OpenAI returned no image."));
  const u = res.usage ?? {};
  recordMedia({ userId: ctx.userId, projectId: ctx.projectId, jobId: ctx.jobId, task: "image_generation", provider: "openai", model, unit: "tokens", inputUnits: u.input_tokens ?? 0, outputUnits: u.output_tokens ?? 0, quantity: 1, costMicro: cost("openai", model, { input: u.input_tokens_details?.text_tokens ?? 0, imageIn: u.input_tokens_details?.image_tokens ?? 0, imageOut: u.output_tokens ?? 0 }).micro, estimated: !res.usage, idempotencyKey: ctx.usageKey });
  return Buffer.from(b64, "base64");
}

/**
 * Plan vidéo image-vers-vidéo (Veo via l'API Gemini). Retourne un MP4.
 * `people` : plan avec une personne (UGC) — le prompt est transmis tel quel et Veo 3 génère aussi la voix et le son.
 */
/** Équivalent « rapide » d'un modèle Veo (forfait en qualité standard). */
const FAST_VEO: Record<string, string> = { "veo-3.0-generate-001": "veo-3.0-fast-generate-001", "veo-3.1-generate-preview": "veo-3.1-fast-generate-preview" };

async function veoClipImpl(ctx: Ctx, input: { image: Buffer; prompt: string; aspect: "16:9" | "9:16"; seconds?: number; people?: boolean; model?: string; usage?: MediaUsage }, onWait?: (msg: string) => void) {
  const key = activeProviderKey("google");
  if (!key) throw new UserFacingError(L("Aucune clé Google configurée pour la vidéo.", "No Google key configured for video."));
  // Router V2 : usage (vidéo produit ou UGC), capacité vérifiée, décision tracée.
  routeMedia("video_generation", undefined, { usage: input.usage ?? (input.people ? "ugc_video" : "product_video"), audio: !!input.people, people: !!input.people });
  // Modèle explicite (Video Engine V2, s'il est bien un modèle Veo du catalogue), sinon le choix du routage.
  const chosen = input.model && mediaModel("google", input.model)?.adapter === "veo" ? input.model : pickModel("google", "video");
  // Forfait « Créer » : vidéos en qualité standard (modèle rapide) ; les autres forfaits gardent le modèle réglé.
  const plan = userPlan(ctx.userId);
  const model = plan && PLANS[plan].videoQuality === "fast" ? (FAST_VEO[chosen] ?? chosen) : chosen;
  // Veo facture la durée produite : Veo 3 = 8 s (au moins 8 s réservées) ; Veo 3.1 = 4, 6 ou 8 s demandées.
  const seconds = veoBilledSeconds(input.seconds, model);
  const durations = mediaModel("google", model)?.durations ?? [];
  gate(ctx, cost("google", model, { seconds }).micro, "video", "google", model);
  const jpeg = await sharp(input.image).jpeg({ quality: 90 }).toBuffer();
  const start = await providerFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:predictLongRunning`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      instances: [{ prompt: input.people ? input.prompt : `${input.prompt}. The product must remain exactly identical (shape, label, colors); slow, elegant camera movement; no people in frame; no text overlay.`, image: { bytesBase64Encoded: jpeg.toString("base64"), mimeType: "image/jpeg" } }],
      // Veo 3 n'accepte que « allow_adult » à partir d'une image (« dont_allow » est refusé) : l'absence de personnes passe par la consigne.
      parameters: { aspectRatio: input.aspect, personGeneration: veoPersonGeneration(model, !!input.people), ...(durations.length > 1 ? { durationSeconds: seconds } : {}) },
    }),
  });
  if (start.status === 401 || start.status === 403) throw refusal(new PermanentError(L("Clé Google refusée pour Veo.", "Google key rejected for Veo.")));
  if (!start.ok) throw refusal(new PermanentError(L("Veo a refusé la demande : ", "Veo rejected the request: ") + (await start.text()).slice(0, 300)));
  const op: any = await start.json();
  const name = op.name;
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, mediaPoll.veoMs));
    onWait?.(L(`Génération du plan vidéo par Veo (${(i + 1) * 10} s)…`, `Veo is generating the video shot (${(i + 1) * 10} s)…`));
    const s = await providerFetch(`https://generativelanguage.googleapis.com/v1beta/${name}`, { headers: { "x-goog-api-key": key } });
    const j: any = await s.json();
    if (j.error) throw new PermanentError(L(`Veo : ${j.error.message}`, `Veo: ${j.error.message}`));
    if (j.done) {
      const uri = j.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      if (!uri) throw new PermanentError(L("Veo n'a renvoyé aucune vidéo (contenu filtré).", "Veo returned no video (content filtered)."));
      const v = await providerFetch(uri, { headers: { "x-goog-api-key": key } });
      if (!v.ok) throw new Error(L(`Téléchargement Veo impossible (${v.status}).`, `Couldn't download the Veo video (${v.status}).`));
      const c = cost("google", model, { seconds });
      recordMedia({ userId: ctx.userId, projectId: ctx.projectId, jobId: ctx.jobId, task: "video_generation", provider: "google", model, unit: "video_second", quantity: seconds, costMicro: c.micro, estimated: true, idempotencyKey: ctx.usageKey });
      return Buffer.from(await v.arrayBuffer());
    }
  }
  throw new Error(L("Délai dépassé pour la génération Veo.", "Veo generation timed out."));
}

/**
 * Image d'ouverture d'un plan UGC : une personne générée tient ou utilise le produit réel.
 * Le détourage du produit est fourni en référence (forme, étiquette, couleurs à conserver) ;
 * `persona` (image du premier plan) garde la même personne et le même décor d'un plan à l'autre.
 */
async function ugcFrameImpl(ctx: Ctx, input: { prompt: string; product: Buffer; persona?: Buffer; aspect: "9:16" | "16:9"; subject?: "product" | "service" }) {
  // Image de départ d'un plan UGC : usage « Images produit » (photo du produit réel en référence, une personne).
  const provider = imageProviderAvailable({ usage: "product_image", references: input.persona ? 2 : 1, people: true });
  if (!provider) throw new UserFacingError(L("Aucun fournisseur d'images configuré (Google Gemini, OpenAI ou fal.ai) pour créer la personne de la vidéo UGC.", "No image provider configured (Google Gemini, OpenAI or fal.ai) to create the person in the UGC video."));
  const product = await sharp(input.product).flatten({ background: "#ffffff" }).resize(1024, 1024, { fit: "contain", background: "#ffffff" }).jpeg({ quality: 90 }).toBuffer();
  const persona = input.persona ? await sharp(input.persona).resize(768, 768, { fit: "inside" }).jpeg({ quality: 85 }).toBuffer() : null;
  // Entreprise de services : la première image n'est qu'une référence d'ambiance (lieu, couleurs), pas un produit à tenir.
  const subject = input.subject === "service"
    ? "The first reference image only gives the mood, colors and kind of place of the business: do not copy any person from it, add no text, logo, diploma or certificate. The presenter is not a customer."
    : "The product shown in the first reference image must appear exactly as it is: same shape, proportions, label, logo, text and colors; do not redesign it, do not add another product.";
  const text = `${input.prompt}
${subject}${persona ? " Keep the same person, outfit and room as in the second reference image." : ""}
Authentic smartphone video still, natural light, realistic skin and hands, no text overlay, no watermark. Aspect ratio ${input.aspect}.`;
  if (provider === "fal") return falImage(ctx, pickModel("fal", "image"), text, persona ? [product, persona] : [product], input.aspect);
  if (provider === "google") {
    const key = activeProviderKey("google")!;
    const model = pickModel("google", "image");
    const gmax = geminiImageMax(model, { prompt: text, images: persona ? 2 : 1 });
    gate(ctx, gmax, "image", "google", model);
    const parts: any[] = [{ text }, { inline_data: { mime_type: "image/jpeg", data: product.toString("base64") } }];
    if (persona) parts.push({ inline_data: { mime_type: "image/jpeg", data: persona.toString("base64") } });
    const r = await providerFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: input.aspect } } }),
    });
    if (r.status === 401 || r.status === 403) throw refusal(new PermanentError(L("Clé Google refusée : vérifiez-la dans l'administration.", "Google key rejected: check it in the admin panel.")));
    if (r.status === 400) throw refusal(new PermanentError(L("Requête refusée par Gemini : ", "Request rejected by Gemini: ") + (await r.text()).slice(0, 300)));
    if (!r.ok) throw refusal(new Error(`Gemini ${r.status}${L(" : ", ": ")}${(await r.text()).slice(0, 200)}`));
    const j: any = await r.json();
    const img = j.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData || p.inline_data);
    const b64 = img?.inlineData?.data ?? img?.inline_data?.data;
    if (!b64) throw new Error(L("Gemini n'a pas renvoyé d'image (contenu filtré ou indisponible).", "Gemini returned no image (content filtered or unavailable)."));
    recordMedia({ userId: ctx.userId, projectId: ctx.projectId, jobId: ctx.jobId, task: "image_generation", provider: "google", model, unit: "image", quantity: 1, costMicro: gmax, estimated: true, idempotencyKey: ctx.usageKey });
    return Buffer.from(b64, "base64");
  }
  const key = activeProviderKey("openai")!;
  const model = pickModel("openai", "image");
  const ugcSize = input.aspect === "9:16" ? "1024x1536" : "1536x1024";
  gate(ctx, openaiImageMax(model, { prompt: text, images: persona ? 2 : 1, size: ugcSize, quality: "high" }), "image", "openai", model);
  const client = new OpenAI({ apiKey: key, maxRetries: 0, timeout: 300_000 });
  const images = [await toFile(product, "produit.jpg", { type: "image/jpeg" })];
  if (persona) images.push(await toFile(persona, "personne.jpg", { type: "image/jpeg" }));
  let res: any;
  try {
    sent();
    res = await client.images.edit({ model, image: images as any, prompt: text, size: ugcSize, quality: "high", n: 1 } as any);
  } catch (e: any) {
    if (e?.status === 401 || e?.status === 403) throw refusal(new PermanentError(L("Clé OpenAI refusée : vérifiez-la dans l'administration.", "OpenAI key rejected: check it in the admin panel.")));
    if (e?.status === 400) throw refusal(new PermanentError(L(`Requête refusée par OpenAI : ${String(e?.message ?? "").slice(0, 300)}`, `Request rejected by OpenAI: ${String(e?.message ?? "").slice(0, 300)}`)));
    throw e;
  }
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error(L("OpenAI n'a pas renvoyé d'image.", "OpenAI returned no image."));
  const u = res.usage ?? {};
  recordMedia({ userId: ctx.userId, projectId: ctx.projectId, jobId: ctx.jobId, task: "image_generation", provider: "openai", model, unit: "tokens", inputUnits: u.input_tokens ?? 0, outputUnits: u.output_tokens ?? 0, quantity: 1, costMicro: cost("openai", model, { input: u.input_tokens_details?.text_tokens ?? 0, imageIn: u.input_tokens_details?.image_tokens ?? 0, imageOut: u.output_tokens ?? 0 }).micro, estimated: !res.usage, idempotencyKey: ctx.usageKey });
  return Buffer.from(b64, "base64");
}

/** Réglage « personnes » de Veo en image → vidéo : Veo 3 n'accepte que « allow_adult ». */
export function veoPersonGeneration(model: string, people: boolean): "allow_adult" | "dont_allow" {
  return people || /^veo-3/.test(model) ? "allow_adult" : "dont_allow";
}

/** Plan vidéo via fal.ai (file d'attente officielle). */
async function falClipImpl(ctx: Ctx, input: { image: Buffer; prompt: string; seconds?: number; model?: string; usage?: MediaUsage }, onWait?: (msg: string) => void) {
  const key = activeProviderKey("fal");
  if (!key) throw new UserFacingError(L("Aucune clé fal.ai configurée.", "No fal.ai key configured."));
  routeMedia("video_generation", undefined, { usage: input.usage ?? "product_video" }); // Router V2 : usage et capacité vérifiés, décision tracée.
  const model = input.model && mediaModel("fal", input.model)?.adapter === "fal_video" ? input.model : pickModel("fal", "video");
  // Durées acceptées par le modèle (Kling 2.1 : 5 ou 10 s ; Kling 3 : 3 à 15 s) : la durée retenue est demandée,
  // réservée et comptée (jamais moins que facturé).
  const seconds = falBilledSeconds(model, input.seconds);
  gate(ctx, cost("fal", model, { seconds }).micro, "video", "fal", model);
  const dataUri = `data:image/jpeg;base64,${(await sharp(input.image).jpeg({ quality: 90 }).toBuffer()).toString("base64")}`;
  const headers = { Authorization: `Key ${key}`, "Content-Type": "application/json" };
  const r = await providerFetch(`https://queue.fal.run/${model}`, { method: "POST", headers, body: JSON.stringify({ prompt: input.prompt, image_url: dataUri, duration: String(seconds) }) });
  // (Kling 2.1 et Kling 3 : « image_url », « duration » en texte — paramètres du dépôt officiel fal-ai/fal-blender-extension.)
  if (r.status === 401 || r.status === 403) throw refusal(new PermanentError(falRefusal(r.status, await r.text().catch(() => ""))));
  if (!r.ok) throw refusal(new PermanentError(L("fal.ai a refusé la demande : ", "fal.ai rejected the request: ") + (await r.text()).slice(0, 300)));
  const q: any = await r.json();
  for (let i = 0; i < 120; i++) {
    await new Promise((res) => setTimeout(res, mediaPoll.falVideoMs));
    onWait?.(L(`Génération du plan vidéo (${(i + 1) * 6} s)…`, `Generating the video shot (${(i + 1) * 6} s)…`));
    const st: any = await (await providerFetch(q.status_url, { headers })).json();
    if (st.status === "COMPLETED") {
      const out: any = await (await providerFetch(q.response_url, { headers })).json();
      const url = out.video?.url;
      if (!url) throw new PermanentError(L("fal.ai n'a renvoyé aucune vidéo.", "fal.ai returned no video."));
      const v = await providerFetch(url);
      const c = cost("fal", model, { seconds });
      recordMedia({ userId: ctx.userId, projectId: ctx.projectId, jobId: ctx.jobId, task: "video_generation", provider: "fal", model, unit: "video_second", quantity: seconds, costMicro: c.micro, estimated: true, idempotencyKey: ctx.usageKey });
      return Buffer.from(await v.arrayBuffer());
    }
    if (st.status === "FAILED" || st.status === "ERROR") throw new PermanentError(L("La génération fal.ai a échoué.", "fal.ai generation failed."));
  }
  throw new Error(L("Délai dépassé pour la génération fal.ai.", "fal.ai generation timed out."));
}

/**
 * Image via fal.ai (file d'attente officielle) : endpoints « edit » à partir d'images de référence. Tarif « par image »
 * obligatoire (coût maximal = une image) ; paramètres d'entrée à valider au premier essai réel (une demande refusée
 * par fal ne coûte rien : la réservation est rendue).
 */
async function falImage(ctx: Ctx, model: string, prompt: string, refs: Buffer[], aspect: string) {
  const key = activeProviderKey("fal");
  if (!key) throw new UserFacingError(L("Aucune clé fal.ai configurée.", "No fal.ai key configured."));
  if (mediaModel("fal", model)?.needsReference && !refs.length) throw new PermanentError(L(`${model} exige une image de référence.`, `${model} requires a reference image.`));
  const p = requirePrice("fal", model);
  if (p.unit !== "image") throw new PermanentError(L(`Tarif « par image » attendu pour fal:${model} : coût maximal non borné, génération bloquée.`, `A per-image price is expected for fal:${model}: maximum cost not bounded, generation blocked.`));
  const max = cost("fal", model, { images: 1 }).micro;
  gate(ctx, max, "image", "fal", model);
  const headers = { Authorization: `Key ${key}`, "Content-Type": "application/json" };
  const r = await providerFetch(`https://queue.fal.run/${model}`, { method: "POST", headers, body: JSON.stringify({ prompt, image_urls: refs.map((b) => `data:image/jpeg;base64,${b.toString("base64")}`), num_images: 1, output_format: "png", aspect_ratio: aspect }) });
  if (r.status === 401 || r.status === 403) throw refusal(new PermanentError(falRefusal(r.status, await r.text().catch(() => ""))));
  if (!r.ok) throw refusal(new PermanentError(L("fal.ai a refusé la demande : ", "fal.ai rejected the request: ") + (await r.text()).slice(0, 300)));
  const q: any = await r.json();
  for (let i = 0; i < 100; i++) {
    await new Promise((res) => setTimeout(res, mediaPoll.falImageMs));
    const st: any = await (await providerFetch(q.status_url, { headers })).json();
    if (st.status === "COMPLETED") {
      const out: any = await (await providerFetch(q.response_url, { headers })).json();
      const url = out.images?.[0]?.url ?? out.image?.url;
      if (!url) throw new PermanentError(L("fal.ai n'a renvoyé aucune image.", "fal.ai returned no image."));
      const img = await providerFetch(url);
      recordMedia({ userId: ctx.userId, projectId: ctx.projectId, jobId: ctx.jobId, task: "image_generation", provider: "fal", model, unit: "image", quantity: 1, costMicro: max, estimated: true, idempotencyKey: ctx.usageKey });
      return Buffer.from(await img.arrayBuffer());
    }
    if (st.status === "FAILED" || st.status === "ERROR") throw new PermanentError(L("La génération fal.ai a échoué.", "fal.ai generation failed."));
  }
  throw new Error(L("Délai dépassé pour la génération fal.ai.", "fal.ai generation timed out."));
}


/**
 * Plan vidéo IA chez le fournisseur choisi, avec relais vers le secours compatible si le principal échoue sans coût.
 * `provider` : celui annoncé à l'appelant (videoProviderAvailable / Video Engine V2).
 */
export async function aiClip(provider: string, ctx: Ctx, input: { image: Buffer; prompt: string; aspect: "16:9" | "9:16"; seconds?: number; people?: boolean; model?: string; usage?: MediaUsage }, onWait?: (msg: string) => void): Promise<Buffer> {
  const usage: MediaUsage = input.usage ?? (input.people ? "ugc_video" : "product_video");
  const run = (p: string, model?: string) => (p === "google" ? veoClip(ctx, { ...input, usage, model }, onWait) : falClip(ctx, { image: input.image, prompt: input.prompt, seconds: input.seconds, usage, model }, onWait));
  try {
    return await run(provider, input.model);
  } catch (e) {
    const f = e as { mediaReleased?: boolean; mediaFailed?: string | null };
    const b = usableBackup("video", usage);
    const bm = b ? mediaModel(b.provider, b.model) : null;
    // Secours seulement s'il est compatible (son natif pour l'UGC) et différent du modèle en échec.
    if (!f?.mediaReleased || !b || !bm || `${b.provider}:${b.model}` === f.mediaFailed || (input.people && !bm.caps.audio && provider === "google")) throw e;
    return mediaExclude.run({ exclude: [f.mediaFailed ?? ""], only: `${b.provider}:${b.model}` }, () => run(b.provider, b.model));
  }
}

/** Vérification de clé depuis l'administration (appel léger, sans génération). */
export async function pingProvider(p: "openai" | "google" | "fal"): Promise<string> {
  const key = activeProviderKey(p);
  if (!key) throw new Error(L("Aucune clé enregistrée.", "No key saved."));
  if (p === "openai") {
    const r = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } });
    if (!r.ok) throw new Error(`OpenAI ${r.status}`);
    return L("Clé OpenAI valide.", "OpenAI key is valid.");
  }
  if (p === "google") {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models", { headers: { "x-goog-api-key": key } });
    if (!r.ok) throw new Error(`Google ${r.status}`);
    return L("Clé Gemini valide.", "Gemini key is valid.");
  }
  const shape = falKeyShapeProblem(key);
  if (shape) throw new Error(shape);
  const r = await fetch("https://queue.fal.run/fal-ai/fast-sdxl/requests/00000000-0000-0000-0000-000000000000/status", { headers: { Authorization: `Key ${key}` } });
  if (r.status === 401 || r.status === 403) throw new Error(falRefusal(r.status, await r.text().catch(() => "")));
  return L("Clé fal.ai acceptée.", "fal.ai key accepted.");
}

/** Une clé fal.ai a la forme « identifiant:secret » : sans les deux-points, elle a été copiée en partie. */
export function falKeyShapeProblem(key: string): string | null {
  return /^[^:\s]+:[^:\s]+$/.test(key) ? null : L("Clé fal.ai incomplète : elle doit contenir deux parties séparées par « : » (identifiant:secret). Recopiez-la en entier depuis fal.ai › API Keys, ou créez-en une nouvelle.", "Incomplete fal.ai key: it must have two parts separated by \":\" (id:secret). Copy it in full from fal.ai › API Keys, or create a new one.");
}

/** Raison d'un refus de fal.ai, en clair : crédit épuisé (compte bloqué) ou clé invalide, avec le message de fal.ai. */
export function falRefusal(status: number, body: string): string {
  let detail = body;
  try { const j = JSON.parse(body); detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail ?? j); } catch { /* texte brut */ }
  detail = detail.replace(/\s+/g, " ").trim().slice(0, 200);
  if (/balance|locked|billing|credit|payment/i.test(detail))
    return L(`Clé fal.ai reconnue, mais le compte fal.ai est bloqué faute de crédit. Ajoutez du crédit sur fal.ai › Billing, puis testez à nouveau. (fal.ai : ${detail})`, `fal.ai key recognised, but the fal.ai account is locked for lack of credit. Add credit in fal.ai › Billing, then test again. (fal.ai: ${detail})`);
  return L(`Clé fal.ai refusée (${status}${detail ? ` : ${detail}` : ""}). Vérifiez qu'elle est copiée en entier et qu'elle n'a pas été supprimée sur fal.ai.`, `fal.ai key rejected (${status}${detail ? `: ${detail}` : ""}). Check it is copied in full and has not been deleted on fal.ai.`);
}

export const openaiScene = withMediaBackup("image", traced("image_generation", openaiSceneImpl), { usage: (_c, i) => i.usage ?? "product_edit", providers: ["openai"] });
export const productPlate = withMediaBackup("image", traced("image_generation", productPlateImpl), { usage: (_c, i) => i.usage ?? "product_image" });
/** Ancien nom (décor vide) : même génération, par le modèle de l'usage. */
export const geminiPlate = productPlate;
export const veoClip = traced("video_generation", veoClipImpl);
export const ugcFrame = withMediaBackup("image", traced("image_generation", ugcFrameImpl), { usage: () => "product_image" });
export const falClip = traced("video_generation", falClipImpl);
const generateImage = withMediaBackup("image", traced("image_generation", generateImageImpl), { usage: (_c, i) => i.usage });
