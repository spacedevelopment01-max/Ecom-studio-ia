/**
 * Routage AUTOMATIQUE des modèles de texte entre Anthropic, OpenAI et Google Gemini.
 *
 * Désactivé par défaut (« manuel ») : le routage actuel des clients ne change pas tant que l'administration ne
 * l'a pas activé. En automatique, pour un niveau donné par la politique (léger, standard, fort) :
 *  1. qualité d'abord : jamais un modèle d'un niveau inférieur à celui demandé ; un niveau supérieur seulement si
 *     aucun modèle du niveau n'est disponible ;
 *  2. capacités réelles : vision si l'entrée contient des images, sorties structurées ;
 *  3. seuls les modèles utilisables (clé active, tarif valide, informations vérifiées) ET activés ;
 *  4. historique : un modèle qui échoue souvent sur la tâche (≥ 5 appels, > 20 % d'échecs) ou dont la note de
 *     qualité moyenne est nettement inférieure à celle des autres est écarté ;
 *  5. à niveau égal : coût théorique de la tâche, puis latence, puis préférence pour le fournisseur déjà éprouvé ;
 *  6. budget restant du client : un modèle dont le coût estimé dépasse le quart du reste est évité au profit d'un
 *     modèle du MÊME niveau moins cher (jamais d'un niveau inférieur).
 */
import type { TaskId } from "../ai/config";
import { priceFor, usdToEur } from "../ai/config";
import { modelStatus, TEXT_MODELS, type ModelAdmin, type TextModel } from "../ai/text-models";
import { EUR } from "../billing";
import { all } from "../db";
import { getJsonSetting, getSetting } from "../settings";
import { TIER_RANK, type Tier } from "./capabilities";

export type RoutingMode = "manual" | "auto";
export const routingMode = (): RoutingMode => (getSetting("ai.routing.mode") === "auto" ? "auto" : "manual");
/** Tâches maintenues en manuel même en mode automatique (route fixée par l'administration). */
export const pinnedTasks = (): TaskId[] => getJsonSetting<TaskId[]>("ai.routing.pinned", []);

/** Volume typique d'un appel par tâche (jetons d'entrée / de sortie, réflexion comprise) : estimations du studio. */
export const TASK_PROFILE: Record<TaskId, { input: number; output: number }> = {
  vision_analysis: { input: 8000, output: 3000 },
  strategy: { input: 10000, output: 6000 },
  copywriting: { input: 9000, output: 3500 },
  theme_design: { input: 60000, output: 16000 },
  theme_edit: { input: 30000, output: 4000 },
  theme_custom: { input: 60000, output: 20000 },
  quality_control: { input: 7000, output: 900 },
  photo_triage: { input: 4000, output: 400 },
  cutout_check: { input: 3000, output: 300 },
  logo_symbol: { input: 6000, output: 5000 },
  social_planning: { input: 9000, output: 6000 },
  social_copy: { input: 5000, output: 1200 },
  classification: { input: 2000, output: 200 },
  video_direction: { input: 9000, output: 5000 },
  art_direction: { input: 5000, output: 900 },
  ad_creative: { input: 9000, output: 5000 },
  blog_topics: { input: 4000, output: 1200 },
  blog_writing: { input: 9000, output: 4000 },
  image_generation: { input: 0, output: 0 },
  video_generation: { input: 0, output: 0 },
};

/** Coût théorique d'un appel typique de la tâche avec ce modèle, en micro-euros (null : tarif inconnu). */
export function theoreticalCostMicro(task: TaskId, m: { provider: string; model: string }): number | null {
  const p = priceFor(m.provider, m.model);
  if (!p || p.unit !== "tokens") return null;
  const t = TASK_PROFILE[task];
  return Math.round(((t.input * p.inputPerM + t.output * p.outputPerM) / 1e6) * usdToEur() * EUR);
}

export type ModelStats = { calls: number; failures: number; avgCostMicro: number; avgLatencyMs: number | null; avgScore: number | null };

/** Statistiques observées (90 jours) par modèle pour une tâche : appels, échecs, coût, latence, note de qualité. */
export function observedStats(task: TaskId): Record<string, ModelStats> {
  try {
    const rows = all<{ m: string; n: number; f: number; c: number; l: number | null; s: number | null }>(
      `SELECT a.provider || ':' || a.requested_model m, COUNT(*) n, SUM(CASE WHEN a.status = 'ok' THEN 0 ELSE 1 END) f,
              AVG(CASE WHEN a.status = 'ok' THEN a.cost END) c, AVG(a.latency_ms) l, AVG(q.score) s
         FROM ai_calls a LEFT JOIN quality_checks q ON q.id = a.quality_check_id
        WHERE a.task = ? AND a.unit = 'tokens' AND a.created_at > ? GROUP BY m`,
      task,
      Date.now() - 90 * 86_400_000,
    );
    return Object.fromEntries(rows.map((r) => [r.m, { calls: r.n, failures: r.f ?? 0, avgCostMicro: Math.round(r.c ?? 0), avgLatencyMs: r.l == null ? null : Math.round(r.l), avgScore: r.s == null ? null : Math.round(r.s * 10) / 10 }]));
  } catch {
    return {};
  }
}

export type Ranked = { model: TextModel; estMicro: number | null; excluded: string | null };

export type PickInput = {
  task: TaskId;
  tier: Exclude<Tier, "local">;
  vision: boolean;
  /** Reste disponible du budget du client (micro-euros), si connu. */
  budgetLeftMicro?: number | null;
  /** Remplaçables dans les tests. */
  admin?: Record<string, ModelAdmin>;
  stats?: Record<string, ModelStats>;
  models?: TextModel[];
  status?: (m: TextModel) => { autoEligible: boolean; reasons: string[] };
  /** Modèle qui vient d'échouer (erreur du fournisseur) : écarté. */
  exclude?: string | null;
};

/** Classement des modèles pour une tâche (le premier non exclu est choisi). */
export function rankTextModels(i: PickInput): Ranked[] {
  const stats = i.stats ?? observedStats(i.task);
  const status = i.status ?? ((m: TextModel) => modelStatus(m, i.admin));
  const models = i.models ?? TEXT_MODELS;
  const scores = Object.values(stats).filter((s) => s.avgScore != null && s.calls >= 3).map((s) => s.avgScore as number);
  const bestScore = scores.length ? Math.max(...scores) : null;
  const ranked: Ranked[] = models.map((m) => {
    const key = `${m.provider}:${m.model}`;
    const st = status(m);
    const s = stats[key];
    let excluded: string | null = null;
    if (!st.autoEligible) excluded = st.reasons[0] ?? "désactivé";
    else if (TIER_RANK[m.tier] < TIER_RANK[i.tier]) excluded = `niveau ${m.tier} < ${i.tier}`;
    else if (i.vision && !m.vision) excluded = "pas de vision";
    else if (!m.structured) excluded = "pas de sorties structurées";
    else if (i.exclude === key) excluded = "vient d'échouer";
    else if (s && s.calls >= 5 && s.failures / s.calls > 0.2) excluded = `trop d'échecs (${s.failures}/${s.calls})`;
    else if (s && s.calls >= 3 && s.avgScore != null && bestScore != null && s.avgScore < bestScore - 1) excluded = `qualité observée ${s.avgScore} < ${bestScore}`;
    return { model: m, estMicro: theoreticalCostMicro(i.task, m), excluded };
  });
  const cost = (r: Ranked) => r.estMicro ?? Number.MAX_SAFE_INTEGER;
  const tooDear = (r: Ranked) => i.budgetLeftMicro != null && r.estMicro != null && r.estMicro > i.budgetLeftMicro / 4;
  return ranked.sort((a, b) => {
    if (!!a.excluded !== !!b.excluded) return a.excluded ? 1 : -1;
    // Niveau demandé d'abord, puis le plus proche au-dessus.
    if (a.model.tier !== b.model.tier) return TIER_RANK[a.model.tier] - TIER_RANK[b.model.tier];
    if (tooDear(a) !== tooDear(b)) return tooDear(a) ? 1 : -1;
    if (cost(a) !== cost(b)) return cost(a) - cost(b);
    if (a.model.latency !== b.model.latency) return a.model.latency - b.model.latency;
    return (a.model.provider === "anthropic" ? 0 : 1) - (b.model.provider === "anthropic" ? 0 : 1);
  });
}

/** Modèle choisi automatiquement (null : aucun modèle utilisable au niveau demandé ou au-dessus). */
export function pickTextModel(i: PickInput): { model: TextModel; reason: string; backup: TextModel | null } | null {
  const ranked = rankTextModels(i).filter((r) => !r.excluded);
  const first = ranked[0];
  if (!first) return null;
  const est = first.estMicro == null ? "?" : `${(first.estMicro / EUR).toFixed(4)} €`;
  const up = first.model.tier !== i.tier ? `, no ${i.tier} model available` : "";
  return { model: first.model, reason: `auto: ${first.model.tier} tier, est. ${est}/call${up}`, backup: ranked[1]?.model ?? null };
}
