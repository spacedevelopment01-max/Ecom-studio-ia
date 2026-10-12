/**
 * Temps restant d'une préparation (affiché au client) : durée habituelle de ce type de tâche, corrigée par
 * l'avancement réel. Toujours présenté comme une estimation (« environ ») ; inconnu → on le dit.
 */
export type Estimate = { ms: number; source: "history" | "default" } | null | undefined;

export type Remaining =
  | { kind: "remaining"; ms: number }
  | { kind: "almost" } // presque terminé
  | { kind: "longer" } // plus long que d'habitude
  | { kind: "unknown" };

export function remaining(elapsedMs: number, progress: number, estimate: Estimate): Remaining {
  const p = Math.min(Math.max(progress || 0, 0), 1);
  const byRate = p >= 0.08 && elapsedMs >= 4000 ? (elapsedMs * (1 - p)) / p : null;
  const est = estimate?.ms ?? null;
  let rem: number | null = null;
  if (est != null) {
    const base = est - elapsedMs;
    if (base <= 0 && (byRate == null || byRate <= 0)) return elapsedMs > est * 1.5 ? { kind: "longer" } : { kind: "almost" };
    rem = byRate != null ? (Math.max(base, 0) + byRate) / 2 : Math.max(base, 0);
  } else if (byRate != null) rem = byRate;
  if (rem == null) return { kind: "unknown" };
  if (rem < 5000) return { kind: "almost" };
  return { kind: "remaining", ms: rem };
}

/** « 0:42 » (minutes:secondes), « 1 h 05 » au-delà d'une heure. */
export function clock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

/** Durée arrondie lisible : « 40 s », « 2 min », « 1 h 10 ». */
export function roughly(ms: number, lang: "fr" | "en"): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${Math.max(5, Math.round(s / 5) * 5)} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return lang === "en" ? `${h} h ${String(m % 60).padStart(2, "0")}` : `${h} h ${String(m % 60).padStart(2, "0")}`;
}
