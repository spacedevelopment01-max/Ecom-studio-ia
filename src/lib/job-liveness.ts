/**
 * Signe de vie d'une tâche de fond, pour l'afficher pendant une création : le worker la tient-il encore
 * (bail renouvelé toutes les 30 s) et depuis quand n'a-t-elle pas avancé ? Calculé côté serveur (même horloge).
 */
export type Liveness = { alive: boolean; idleMs: number };

export function jobLiveness(j: { status: string; locked_until: number | null; updated_at: number }, at = Date.now()): Liveness {
  return { alive: j.status === "running" && !!j.locked_until && j.locked_until > at, idleMs: Math.max(0, at - j.updated_at) };
}

/** « 12 s », « 3 min », « 1 h 05 » (durée courte, lisible). */
export function shortDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
}
