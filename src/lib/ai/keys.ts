/**
 * Clés d'usage stables (idempotence) : une reprise de tâche retrouve la même clé pour le même travail, la facturation
 * ne compte jamais deux fois et un quota peut être rendu. Une clé est faite de parties stables (tâche ou projet,
 * étape, objet, candidat, tentative), jamais de l'heure.
 */
const clean = (v: string | number | null | undefined) => String(v ?? "").trim().replace(/[\s:]+/g, "-");

/** Clé stable : parties vides ignorées, séparées par « : ». Exemple : stableKey(jobId, "logo", "route-produit", 1). */
export function stableKey(...parts: (string | number | null | undefined)[]): string {
  const kept = parts.map(clean).filter(Boolean);
  if (!kept.length) throw new Error("stableKey : aucune partie");
  return kept.join(":");
}
