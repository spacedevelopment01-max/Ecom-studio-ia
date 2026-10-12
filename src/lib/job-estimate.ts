/**
 * Durée estimée d'une tâche, pour afficher « environ X restantes » pendant une préparation (IA ou moteur local).
 * Mesurée, pas inventée : médiane des dernières tâches TERMINÉES du même type sur l'installation (au moins 3).
 * Sans historique suffisant : ordre de grandeur par famille de tâches, présenté comme une estimation.
 */
import { all } from "./db";

export type JobEstimate = { ms: number; source: "history" | "default" };

const cache = new Map<string, { at: number; v: JobEstimate | null }>();

/** Ordres de grandeur par famille (premier préfixe qui correspond) — utilisés seulement sans historique. */
const DEFAULTS: [RegExp, number][] = [
  [/^pipeline\./, 6 * 60_000],
  [/^(video|videos|ugc|ad\.video)/, 4 * 60_000],
  [/^brand\.(build|logo)/, 90_000],
  [/^(shop|theme)\./, 60_000],
  [/^(images\.generate|ads\.|ad\.)/, 90_000],
  [/^image\./, 30_000],
  [/^(social|calendar|posts?\.|blog|seo|copy)/, 60_000],
];

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

export function jobEstimate(type: string): JobEstimate | null {
  const hit = cache.get(type);
  if (hit && Date.now() - hit.at < 60_000) return hit.v;
  let v: JobEstimate | null = null;
  try {
    const rows = all<{ d: number }>(
      "SELECT finished_at - created_at AS d FROM jobs WHERE type = ? AND status = 'done' AND finished_at IS NOT NULL AND finished_at > created_at ORDER BY finished_at DESC LIMIT 30",
      type,
    );
    const ds = rows.map((r) => r.d).filter((d) => d > 0 && d < 3 * 3600_000);
    if (ds.length >= 3) v = { ms: median(ds), source: "history" };
  } catch {}
  if (!v) {
    const d = DEFAULTS.find(([re]) => re.test(type));
    if (d) v = { ms: d[1], source: "default" };
  }
  cache.set(type, { at: Date.now(), v });
  return v;
}
