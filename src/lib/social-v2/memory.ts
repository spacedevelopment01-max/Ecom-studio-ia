/**
 * Mémoire éditoriale d'un projet (Autopilot V2) : ce qui a déjà été présenté ou dit, pour faire tourner les sujets
 * d'une semaine à l'autre sans répétition inutile — produits présentés, matières utilisées par rôle, accroches,
 * rôles, publications refusées (supprimées ou annulées par le client). Un sujet important peut revenir, mais avec
 * une autre approche : la mémoire fait AVANCER la matière et la tournure, elle n'interdit pas le sujet.
 */
import { all, now, run } from "../db";
import { fold } from "../seo-v2/lang";

export type MemoryKind = "role" | "item" | "material" | "hook" | "refused";

export function remember(projectId: string, kind: MemoryKind, key: string, n = 1) {
  if (!key) return;
  run(
    "INSERT INTO social_memory (project_id, kind, key, uses, last_at) VALUES (?,?,?,?,?) ON CONFLICT(project_id, kind, key) DO UPDATE SET uses = uses + excluded.uses, last_at = excluded.last_at",
    projectId,
    kind,
    key.slice(0, 300),
    n,
    now(),
  );
}

/** Nombre de passages par clé pour un type de mémoire. */
export function usesOf(projectId: string, kind: MemoryKind): Map<string, number> {
  return new Map(all<{ key: string; uses: number }>("SELECT key, uses FROM social_memory WHERE project_id = ? AND kind = ?", projectId, kind).map((r) => [r.key, r.uses]));
}

/** Accroches déjà utilisées (récentes) et refusées, normalisées (sans accents, minuscules) : jamais reprises telles quelles. */
export function usedHooks(projectId: string, sinceMs = 60 * 86_400_000): Set<string> {
  const rows = all<{ caption: string }>("SELECT caption FROM posts WHERE project_id = ? AND created_at > ?", projectId, now() - sinceMs);
  const out = new Set(rows.map((r) => fold(r.caption.split("\n")[0] ?? "")).filter(Boolean));
  for (const k of usesOf(projectId, "refused").keys()) out.add(k);
  for (const k of usesOf(projectId, "hook").keys()) out.add(k);
  return out;
}

/** Publication refusée par le client : son accroche ne revient plus. */
export function rememberRefused(projectId: string, caption: string) {
  const hook = fold(caption.split("\n")[0] ?? "");
  if (hook && !/a completer|to complete/.test(hook)) remember(projectId, "refused", hook);
}

/** Ce que la mémoire sait du projet (affichage, rapport). */
export function memorySummary(projectId: string) {
  const rows = all<{ kind: string; key: string; uses: number; last_at: number }>("SELECT kind, key, uses, last_at FROM social_memory WHERE project_id = ? ORDER BY last_at DESC", projectId);
  const by = (k: string) => rows.filter((r) => r.kind === k);
  return { items: by("item").map((r) => ({ key: r.key, uses: r.uses })), roles: by("role").length, materials: by("material").length, hooks: by("hook").length, refused: by("refused").length };
}

/**
 * Similarité de deux accroches (0 à 1) : mots significatifs communs / mots de la plus courte. Sert à signaler une
 * publication trop proche d'une autre avant sa programmation (sans interdire de reparler d'un même sujet).
 */
export function hookSimilarity(a: string, b: string): number {
  const words = (s: string) => new Set(fold(s).split(/[^a-z0-9]+/).filter((w) => w.length > 3));
  const x = words(a);
  const y = words(b);
  // Trop peu de mots significatifs pour juger : pas de rapprochement.
  if (Math.min(x.size, y.size) < 3) return 0;
  let common = 0;
  for (const w of x) if (y.has(w)) common++;
  return common / Math.min(x.size, y.size);
}
