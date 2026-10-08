/**
 * Statistiques sociales : comptes RÉELS du studio (programmées, publiées, échecs, incertaines, à valider) et
 * métriques des plateformes UNIQUEMENT si elles ont été fournies par l'API (table `post_metrics`). Aucune
 * statistique n'est estimée ni inventée. Chaque métrique est « disponible », « indisponible » (aucune lecture
 * implémentée ou permise) ou « non connectée » (aucun compte relié).
 * Lecture des statistiques chez les plateformes : architecture prête (`MetricsProvider`), AUCUN fournisseur branché
 * en 9A (à faire et vérifier en 9B avec de vrais comptes).
 */
import { all, now, run } from "../db";
import { PLATFORMS, PLATFORM_SPECS, type Platform } from "./platforms";

export const METRICS = ["impressions", "reach", "interactions", "clicks", "views", "engagement"] as const;
export type Metric = (typeof METRICS)[number];
export type MetricState = "available" | "unavailable" | "not_connected";

export type MetricsProvider = { platform: Platform; metrics: Metric[]; fetch: (remoteId: string) => Promise<Partial<Record<Metric, number>>> };
const providers = new Map<Platform, MetricsProvider>();
export const registerMetricsProvider = (m: MetricsProvider | null, platform?: Platform) => (m ? providers.set(m.platform, m) : platform && providers.delete(platform));

/** Enregistre des métriques fournies par une plateforme (jamais une estimation). */
export function recordMetrics(postId: string, values: Partial<Record<Metric, number>>, source: string) {
  for (const [k, v] of Object.entries(values)) if (typeof v === "number" && Number.isFinite(v)) run("INSERT INTO post_metrics (post_id, metric, value, source, fetched_at) VALUES (?,?,?,?,?) ON CONFLICT(post_id, metric) DO UPDATE SET value = excluded.value, source = excluded.source, fetched_at = excluded.fetched_at", postId, k, v, source, now());
}

/** Relève les métriques des publications publiées (seulement pour les plateformes dont un fournisseur est branché). */
export async function refreshMetrics(projectId: string): Promise<number> {
  let n = 0;
  for (const r of all<{ id: string; network: string; remote_id: string }>("SELECT id, network, remote_id FROM posts WHERE project_id = ? AND status = 'published' AND remote_id IS NOT NULL", projectId)) {
    const pr = providers.get(r.network as Platform);
    if (!pr) continue;
    recordMetrics(r.id, await pr.fetch(r.remote_id), pr.platform);
    n++;
  }
  return n;
}

export type SocialStats = {
  counts: Record<string, number>;
  byPlatform: { platform: Platform; label: string; scheduled: number; published: number; failed: number; uncertain: number; connected: boolean; metrics: Record<Metric, { state: MetricState; value: number | null }> }[];
  note: string;
};

export function socialStats(projectId: string, userId: string): SocialStats {
  const counts: Record<string, number> = {};
  for (const r of all<{ status: string; n: number }>("SELECT status, COUNT(*) n FROM posts WHERE project_id = ? GROUP BY status", projectId)) counts[r.status] = r.n;
  const connected = new Set(all<{ provider: string }>("SELECT DISTINCT provider FROM connections WHERE user_id = ? AND status = 'active'", userId).map((r) => r.provider));
  const per = all<{ network: string; status: string; n: number }>("SELECT network, status, COUNT(*) n FROM posts WHERE project_id = ? GROUP BY network, status", projectId);
  const metricRows = all<{ network: string; metric: string; v: number }>("SELECT p.network, m.metric, SUM(m.value) v FROM post_metrics m JOIN posts p ON p.id = m.post_id WHERE p.project_id = ? GROUP BY p.network, m.metric", projectId);
  const byPlatform = PLATFORMS.filter((pl) => per.some((x) => x.network === pl)).map((pl) => {
    const c = (s: string) => per.find((x) => x.network === pl && x.status === s)?.n ?? 0;
    const isConnected = connected.has(pl);
    const pr = providers.get(pl);
    const metrics = Object.fromEntries(
      METRICS.map((m) => {
        const row = metricRows.find((x) => x.network === pl && x.metric === m);
        const state: MetricState = row ? "available" : !isConnected ? "not_connected" : pr?.metrics.includes(m) ? "available" : "unavailable";
        return [m, { state, value: row ? row.v : null }];
      }),
    ) as Record<Metric, { state: MetricState; value: number | null }>;
    return { platform: pl, label: PLATFORM_SPECS[pl].label, scheduled: c("scheduled"), published: c("published"), failed: c("failed"), uncertain: c("uncertain"), connected: isConnected, metrics };
  });
  return { counts, byPlatform, note: "Statistiques des plateformes : aucune lecture branchée pour l'instant (phase 9B). Seuls les comptes du studio sont affichés ; aucune donnée n'est estimée." };
}
