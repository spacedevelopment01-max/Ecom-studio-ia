/**
 * Routage des générations IMAGES et VIDÉOS entre fournisseurs spécialisés (OpenAI, Google, fal.ai).
 *
 * Manuel (défaut, routage actuel inchangé) : fournisseur et modèle PRINCIPAUX de l'administration (« ai.routes »,
 * tâches image_generation / video_generation), puis le SECOURS choisi par l'administration s'il est compatible avec
 * le besoin et que son tarif est connu (sa génération passe par sa propre réservation : son coût est donc couvert).
 *
 * Automatique (à activer par l'administration, par type) : parmi les modèles utilisables ET activés, celui qui sert
 * le mieux le besoin — qualité d'abord, fidélité au produit, capacités, puis performances observées, coût et budget
 * restant. Jamais « le moins cher » par principe : le coût ne fait que départager des modèles de qualité voisine.
 */
import type { TaskId } from "./config";
import { activeProviderKey, priceFor, priceValid } from "./config";
import { MEDIA_MODELS, mediaModel, type MediaKind, type MediaModel } from "./media-models";
import { EUR } from "../billing";
import { usdToEur } from "./config";
import { all } from "../db";
import { getJsonSetting } from "../settings";
import { L } from "../i18n-server";

export const MEDIA_TASK: Record<MediaKind, TaskId> = { image: "image_generation", video: "video_generation" };

/**
 * USAGES : chaque usage a son propre principal, son secours et son mode (manuel ou automatique). Sans réglage propre,
 * un usage suit le réglage général de son type (images / vidéos) — les réglages existants restent donc inchangés.
 */
export const MEDIA_USAGES = ["logo", "product_image", "product_edit", "ad_visual", "scene", "product_video", "ugc_video"] as const;
export type MediaUsage = (typeof MEDIA_USAGES)[number];
export const isMediaUsage = (v: unknown): v is MediaUsage => typeof v === "string" && (MEDIA_USAGES as readonly string[]).includes(v);

export const USAGE_INFO: Record<MediaUsage, { kind: MediaKind; need: Omit<MediaNeed, "kind" | "usage">; label: { fr: string; en: string }; detail: { fr: string; en: string }; canBeOff?: boolean }> = {
  logo: {
    kind: "image",
    need: {},
    label: { fr: "Logos", en: "Logos" },
    detail: { fr: "Concepts graphiques des symboles (Logo Engine V2 et studio), logo complet dessiné. Le studio vectorise ensuite et écrit le nom avec de vraies polices.", en: "Graphic concepts of the symbols (Logo Engine V2 and studio), full drawn logo. The studio then vectorizes and sets the name with real fonts." },
  },
  product_image: {
    kind: "image",
    need: {},
    label: { fr: "Images produit", en: "Product images" },
    detail: { fr: "Décor généré puis produit réel composé par le studio ; image de départ des vidéos UGC (photo du produit en référence).", en: "Generated set, then the real product composited by the studio; opening frame of UGC videos (product photo as reference)." },
  },
  product_edit: {
    kind: "image",
    need: { mask: true },
    label: { fr: "Retouches produit", en: "Product retouching" },
    detail: { fr: "Retouche par masque de la photo réelle : le modèle repeint autour du produit, les pixels du produit sont remis à l'identique. Prioritaire pour les photos produit quand un modèle capable est choisi.", en: "Mask retouching of the real photo: the model repaints around the product, the product pixels are put back unchanged. Used first for product photos when a capable model is chosen." },
    canBeOff: true,
  },
  ad_visual: {
    kind: "image",
    need: {},
    label: { fr: "Publicités visuelles", en: "Visual ads" },
    detail: { fr: "Visuels des créations publicitaires (Advertising Engine V2) : produit réel par retouche ou composition, ou visuel d'ambiance.", en: "Ad creative visuals (Advertising Engine V2): real product via retouching or compositing, or a mood visual." },
  },
  scene: {
    kind: "image",
    need: {},
    label: { fr: "Décors et ambiances", en: "Sets and moods" },
    detail: { fr: "Ambiances de marque, images de sections de site, d'articles et de publications, photos d'ambiance des entreprises de services.", en: "Brand moods, site section, article and post images, mood photos for service businesses." },
  },
  product_video: {
    kind: "video",
    need: { imageToVideo: true },
    label: { fr: "Vidéos produit", en: "Product videos" },
    detail: { fr: "Plans vidéo animés à partir d'une scène contenant le produit réel (montages, publicités vidéo, Video Engine V2).", en: "Video shots animated from a scene containing the real product (edits, video ads, Video Engine V2)." },
  },
  ugc_video: {
    kind: "video",
    need: { imageToVideo: true, people: true },
    label: { fr: "Vidéos UGC", en: "UGC videos" },
    detail: { fr: "Plans avec une personne qui présente le produit (son natif quand le modèle le permet).", en: "Shots with a person presenting the product (native sound when the model allows it)." },
  },
};

export type UsageSetting = { mode?: MediaMode; primary?: string; backup?: string | null; off?: boolean };
export const usageSettings = (): Partial<Record<MediaUsage, UsageSetting>> => getJsonSetting<Partial<Record<MediaUsage, UsageSetting>>>("ai.media.usage", {});
const splitKey = (v: string) => {
  const [provider, ...rest] = v.split(":");
  return { provider, model: rest.join(":") };
};
/** Mode de l'usage (sinon celui de son type). */
export const usageMode = (u: MediaUsage): MediaMode => usageSettings()[u]?.mode ?? mediaMode(USAGE_INFO[u].kind);
/** Principal de l'usage (sinon celui de son type) et son origine. */
export function usagePrimary(u: MediaUsage): { provider: string; model: string; inherited: boolean } {
  const v = usageSettings()[u]?.primary;
  return v ? { ...splitKey(v), inherited: false } : { ...mediaPrimary(USAGE_INFO[u].kind), inherited: true };
}
/** Secours de l'usage : le sien s'il est réglé (null = aucun, choisi), sinon celui de son type. */
export function usageBackup(u: MediaUsage): { provider: string; model: string } | null {
  const s = usageSettings()[u];
  if (s && "backup" in s) return s.backup ? splitKey(s.backup) : null;
  return mediaBackup(USAGE_INFO[u].kind);
}
/**
 * Usage réglé explicitement (principal ou mode choisis pour lui) : son choix est respecté à la lettre — si ni le
 * principal ni le secours ne sont utilisables, rien n'est généré (jamais un autre modèle en silence). Un usage qui
 * suit le réglage général garde le repli historique du Router V2.
 */
export const usageExplicit = (u: MediaUsage): boolean => {
  const s = usageSettings()[u];
  return !!s && (!!s.primary || !!s.mode);
};
/** Usage coupé par l'administration (retouches produit seulement : les photos passent alors par décor + composition). */
export const usageOff = (u: MediaUsage): boolean => !!USAGE_INFO[u].canBeOff && !!usageSettings()[u]?.off;
/** Besoin complet d'une génération pour un usage. */
export const usageNeed = (u: MediaUsage, extra: Partial<MediaNeed> = {}): MediaNeed => ({ kind: USAGE_INFO[u].kind, ...USAGE_INFO[u].need, ...extra, usage: u });

/** Besoin d'une génération : ce que le modèle DOIT savoir faire. */
export type MediaNeed = {
  kind: MediaKind;
  /** Usage de la génération (logo, image produit…) : ses propres principal, secours et mode. */
  usage?: MediaUsage;
  /** Retouche par masque autour du produit réel (fidélité garantie par construction). */
  mask?: boolean;
  /** Images de référence à transmettre (produit, personne). */
  references?: number;
  /** Logo complet : texte du nom dans l'image. */
  text?: boolean;
  /** Fond transparent souhaité (sinon retiré ensuite par le studio). */
  transparent?: boolean;
  /** Vidéo : à partir d'une image (toujours le cas dans le studio), son natif (UGC), personnes. */
  imageToVideo?: boolean;
  audio?: boolean;
  people?: boolean;
};

export type MediaAdmin = { enabled?: boolean; confirmedAt?: number };
export const mediaAdmin = (): Record<string, MediaAdmin> => getJsonSetting<Record<string, MediaAdmin>>("ai.media.models", {});
export type MediaMode = "manual" | "auto";
export const mediaMode = (kind: MediaKind): MediaMode => (getJsonSetting<Partial<Record<MediaKind, MediaMode>>>("ai.media.mode", {})[kind] === "auto" ? "auto" : "manual");

/** Principal : route de l'administration (ou défaut du studio). */
export function mediaPrimary(kind: MediaKind): { provider: string; model: string } {
  const r = getJsonSetting<Partial<Record<TaskId, { provider: string; model: string }>>>("ai.routes", {})[MEDIA_TASK[kind]];
  if (r?.provider && r.model) return { provider: r.provider, model: r.model };
  const d = MEDIA_MODELS.find((m) => m.kind === kind && m.defaultFor === "primary");
  return { provider: d!.provider, model: d!.model };
}

/** Secours choisi par l'administration (« fournisseur:modèle »), null s'il n'y en a pas. */
export function mediaBackup(kind: MediaKind): { provider: string; model: string } | null {
  const v = getJsonSetting<Partial<Record<MediaKind, string>>>("ai.media.backup", {})[kind];
  if (!v) return null;
  const [provider, ...rest] = v.split(":");
  return { provider, model: rest.join(":") };
}

export type MediaStatus = { key: string; usable: boolean; confirmed: boolean; enabled: boolean; connected: boolean; reasons: string[] };

/** Mise hors service passée (date d'arrêt annoncée par le fournisseur). */
export const shutDown = (m: MediaModel, now = Date.now()) => !!m.shutdown && Date.parse(m.shutdown) <= now;

/**
 * Un modèle est UTILISABLE seulement si : un adaptateur réel existe dans le studio, sa clé est active, il n'est pas
 * arrêté, son tarif est renseigné et valide (coût maximal borné), et ses informations sont vérifiées (documentation
 * officielle) ou confirmées par l'administration. Activé : retenu par le mode automatique (et comme secours).
 */
export function mediaStatus(m: MediaModel, admin: Record<string, MediaAdmin> = mediaAdmin()): MediaStatus {
  const key = `${m.provider}:${m.model}`;
  const a = admin[key] ?? {};
  const reasons: string[] = [];
  const connected = !!activeProviderKey(m.provider);
  if (!m.adapter) reasons.push(L("aucun adaptateur dans le studio", "no adapter in the studio"));
  if (!connected) reasons.push(L("clé absente ou désactivée", "key missing or disabled"));
  if (shutDown(m)) reasons.push(L(`arrêté par le fournisseur (${m.shutdown})`, `shut down by the provider (${m.shutdown})`));
  const p = priceFor(m.provider, m.model);
  if (!p || !priceValid(p)) reasons.push(L("tarif non renseigné", "price not set"));
  const confirmed = (m.verified.id && m.verified.price) || !!a.confirmedAt;
  if (!confirmed) reasons.push(L("identifiant ou tarif à confirmer", "ID or price to confirm"));
  // Activés par défaut : seulement les modèles déjà en service (vérifiés) ; les nouveaux attendent l'administration.
  return { key, usable: reasons.length === 0, confirmed, enabled: a.enabled ?? (m.verified.id && m.verified.price), connected, reasons };
}

/** Capacité manquante pour ce besoin (null : compatible). */
export function incompatibility(m: MediaModel, n: MediaNeed): string | null {
  if (m.kind !== n.kind) return L("autre type de média", "other media type");
  const c = m.caps;
  if (n.mask && !c.maskEdit) return L("pas de retouche par masque", "no mask editing");
  // Retouche par masque : branchée dans le studio pour l'API Images d'OpenAI seulement (pixels du produit remis ensuite).
  if (n.mask && m.adapter !== "openai_image") return L("retouche par masque branchée pour OpenAI seulement", "mask editing wired for OpenAI only");
  if (m.needsReference && !(n.references && n.references > 0)) return L("exige une image de référence", "requires a reference image");
  if ((n.references ?? 0) > (c.references ?? 0)) return L(`${n.references} image(s) de référence non acceptée(s)`, `${n.references} reference image(s) not accepted`);
  if (n.text && !c.textInImage) return L("texte dans l'image non fiable", "unreliable text in image");
  if (n.kind === "video" && n.imageToVideo !== false && !c.imageToVideo) return L("pas d'image vers vidéo", "no image-to-video");
  if (n.audio && !c.audio) return L("pas de son natif", "no native audio");
  if (n.people && !c.people) return L("personnes non prises en charge", "people not supported");
  return null;
}

/** Coût d'une génération typique (micro-euros) au tarif de l'administration, null si inconnu. */
export function typicalCostMicro(m: Pick<MediaModel, "provider" | "model" | "kind" | "typical">): number | null {
  const p = priceFor(m.provider, m.model);
  if (!p || !priceValid(p)) return null;
  let usd: number;
  if (p.unit === "image") usd = p.perImage;
  else if (p.unit === "video_second") usd = p.perSecond * (m.typical.seconds ?? 8);
  else usd = ((m.typical.inputTokens ?? 2000) * (p.imageInputPerM ?? p.inputPerM) + (m.typical.outputTokens ?? 4160) * (p.imageOutputPerM ?? p.outputPerM)) / 1e6;
  return Math.round(usd * usdToEur() * EUR);
}

export type MediaStats = { calls: number; failures: number; avgCostMicro: number; avgLatencyMs: number | null; avgScore: number | null };

/** Performances observées (90 jours) par modèle : appels, échecs, coût, latence, note de qualité moyenne. */
export function mediaStats(kind: MediaKind): Record<string, MediaStats> {
  try {
    const rows = all<{ m: string; n: number; f: number; c: number | null; l: number | null; s: number | null }>(
      `SELECT a.provider || ':' || a.requested_model m, COUNT(*) n, SUM(CASE WHEN a.status = 'ok' THEN 0 ELSE 1 END) f,
              AVG(CASE WHEN a.status = 'ok' THEN a.cost END) c, AVG(a.latency_ms) l, AVG(q.score) s
         FROM ai_calls a LEFT JOIN quality_checks q ON q.id = a.quality_check_id
        WHERE a.task = ? AND a.created_at > ? GROUP BY m`,
      MEDIA_TASK[kind],
      Date.now() - 90 * 86_400_000,
    );
    return Object.fromEntries(rows.map((r) => [r.m, { calls: r.n, failures: r.f ?? 0, avgCostMicro: Math.round(r.c ?? 0), avgLatencyMs: r.l == null ? null : Math.round(r.l), avgScore: r.s == null ? null : Math.round(r.s * 10) / 10 }]));
  } catch {
    return {};
  }
}

export type MediaChoice = { provider: string; model: string; role: "primary" | "backup" | "auto"; reason: string };

export type SelectOptions = {
  /** Fournisseurs:modèles à écarter (ex. le principal vient d'échouer). */
  exclude?: string[];
  budgetLeftMicro?: number | null;
  /** Remplaçables dans les tests. */
  status?: (m: MediaModel) => MediaStatus;
  stats?: Record<string, MediaStats>;
  mode?: MediaMode;
};

/** Note d'un modèle pour un besoin (mode automatique) : qualité et fidélité d'abord, puis observé, puis coût. */
export function mediaScore(m: MediaModel, n: MediaNeed, est: number | null, maxEst: number, s?: MediaStats): number {
  let score = m.quality * 30;
  if (n.mask && m.caps.maskEdit) score += 10;
  if (n.text && m.caps.textInImage) score += 10;
  if (n.transparent && m.caps.transparent) score += 5;
  if (n.audio && m.caps.audio) score += 10;
  if (s && s.calls >= 3) {
    score -= (s.failures / s.calls) * 40;
    if (s.avgScore != null) score += (s.avgScore - 70) / 2;
  }
  // Coût : départage seulement (au plus 12 points, bien moins qu'un niveau de qualité).
  if (est != null && maxEst > 0) score -= (est / maxEst) * 12;
  if (m.status === "preview") score -= 4;
  return Math.round(score * 10) / 10;
}

/** Classement automatique (premier = choisi) avec la raison d'exclusion des autres. */
export function rankMedia(n: MediaNeed, o: SelectOptions = {}): { model: MediaModel; score: number; est: number | null; excluded: string | null }[] {
  const status = o.status ?? ((m: MediaModel) => mediaStatus(m));
  const stats = o.stats ?? mediaStats(n.kind);
  const cands = MEDIA_MODELS.filter((m) => m.kind === n.kind).map((m) => {
    const st = status(m);
    const s = stats[st.key];
    let excluded: string | null = null;
    if (!st.usable) excluded = st.reasons[0] ?? "inutilisable";
    else if (!st.enabled) excluded = L("désactivé", "disabled");
    else excluded = incompatibility(m, n);
    if (!excluded && o.exclude?.includes(st.key)) excluded = L("vient d'échouer", "just failed");
    if (!excluded && s && s.calls >= 5 && s.failures / s.calls > 0.3) excluded = L(`trop d'échecs (${s.failures}/${s.calls})`, `too many failures (${s.failures}/${s.calls})`);
    return { model: m, est: typicalCostMicro(m), excluded, s };
  });
  const ok = cands.filter((c) => !c.excluded);
  // Budget restant : un modèle dont la génération dépasse le quart du reste est évité s'il existe une autre option.
  const affordable = ok.filter((c) => o.budgetLeftMicro == null || c.est == null || c.est <= o.budgetLeftMicro / 4);
  const pool = affordable.length ? affordable : ok;
  for (const c of ok) if (!pool.includes(c)) c.excluded = L("trop cher pour le budget restant", "too expensive for the remaining budget");
  const maxEst = Math.max(0, ...pool.map((c) => c.est ?? 0));
  const scored = cands.map((c) => ({ model: c.model, est: c.est, excluded: c.excluded, score: c.excluded ? -Infinity : mediaScore(c.model, n, c.est, maxEst, c.s) }));
  return scored.sort((a, b) => b.score - a.score || (a.est ?? 0) - (b.est ?? 0));
}

/**
 * Modèle d'une génération. Manuel : principal s'il convient, sinon secours compatible ; automatique : meilleur
 * classement. null : aucun modèle utilisable (l'appelant garde alors le comportement historique du Router V2).
 */
export function selectMedia(n0: MediaNeed, o: SelectOptions = {}): MediaChoice | null {
  const u = n0.usage;
  if (u && usageOff(u)) return null;
  const n: MediaNeed = u ? { ...USAGE_INFO[u].need, ...n0 } : n0;
  const mode = o.mode ?? (u ? usageMode(u) : mediaMode(n.kind));
  const status = o.status ?? ((m: MediaModel) => mediaStatus(m));
  if (mode === "auto") {
    const best = rankMedia(n, o).find((r) => !r.excluded);
    if (best) return { provider: best.model.provider, model: best.model.model, role: "auto", reason: `auto${u ? ` [${u}]` : ""}: ${best.model.label}, score ${best.score}` };
  }
  const fits = (r: { provider: string; model: string } | null, role: "primary" | "backup"): MediaChoice | null => {
    if (!r) return null;
    const m = mediaModel(r.provider, r.model);
    if (!m) return null;
    const key = `${r.provider}:${r.model}`;
    if (o.exclude?.includes(key)) return null;
    const st = status(m);
    if (!st.connected || shutDown(m) || !m.adapter) return null;
    // Le secours doit être utilisable (tarif connu, vérifié) : sa réservation couvre alors son coût.
    if (role === "backup" && !st.usable) return null;
    if (incompatibility(m, n)) return null;
    return { provider: r.provider, model: r.model, role, reason: `${role === "primary" ? "admin primary" : "admin backup (compatible, price covered)"}${u ? ` [${u}]` : ""}` };
  };
  return fits(u ? usagePrimary(u) : mediaPrimary(n.kind), "primary") ?? fits(u ? usageBackup(u) : mediaBackup(n.kind), "backup");
}

/**
 * Modèle à appeler chez un fournisseur donné : celui choisi pour ce fournisseur (principal ou secours), sinon le
 * modèle historique du studio pour ce fournisseur (comportement inchangé).
 */
export function modelForProvider(provider: string, kind: MediaKind, chosen?: { provider: string; model: string } | null, usage?: MediaUsage): string {
  if (chosen?.provider === provider) return chosen.model;
  const p = usage ? usagePrimary(usage) : mediaPrimary(kind);
  if (p.provider === provider) return p.model;
  // Secours : seulement s'il est utilisable (confirmé, tarifé) — sinon le modèle historique de ce fournisseur.
  const b = usage ? usageBackup(usage) : mediaBackup(kind);
  const bm = b ? mediaModel(b.provider, b.model) : null;
  if (b?.provider === provider && bm && mediaStatus(bm).usable) return b.model;
  return MEDIA_MODELS.find((m) => m.kind === kind && m.provider === provider && m.legacyDefault)?.model ?? MEDIA_MODELS.find((m) => m.kind === kind && m.provider === provider)!.model;
}
