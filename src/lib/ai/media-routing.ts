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

/** Besoin d'une génération : ce que le modèle DOIT savoir faire. */
export type MediaNeed = {
  kind: MediaKind;
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
export function selectMedia(n: MediaNeed, o: SelectOptions = {}): MediaChoice | null {
  const mode = o.mode ?? mediaMode(n.kind);
  const status = o.status ?? ((m: MediaModel) => mediaStatus(m));
  if (mode === "auto") {
    const best = rankMedia(n, o).find((r) => !r.excluded);
    if (best) return { provider: best.model.provider, model: best.model.model, role: "auto", reason: `auto: ${best.model.label}, score ${best.score}` };
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
    return { provider: r.provider, model: r.model, role, reason: role === "primary" ? "admin primary" : "admin backup (compatible, price covered)" };
  };
  return fits(mediaPrimary(n.kind), "primary") ?? fits(mediaBackup(n.kind), "backup");
}

/**
 * Modèle à appeler chez un fournisseur donné : celui choisi pour ce fournisseur (principal ou secours), sinon le
 * modèle historique du studio pour ce fournisseur (comportement inchangé).
 */
export function modelForProvider(provider: string, kind: MediaKind, chosen?: { provider: string; model: string } | null): string {
  if (chosen?.provider === provider) return chosen.model;
  const p = mediaPrimary(kind);
  if (p.provider === provider) return p.model;
  // Secours : seulement s'il est utilisable (confirmé, tarifé) — sinon le modèle historique de ce fournisseur.
  const b = mediaBackup(kind);
  const bm = b ? mediaModel(b.provider, b.model) : null;
  if (b?.provider === provider && bm && mediaStatus(bm).usable) return b.model;
  return MEDIA_MODELS.find((m) => m.kind === kind && m.provider === provider && m.legacyDefault)?.model ?? MEDIA_MODELS.find((m) => m.kind === kind && m.provider === provider)!.model;
}
