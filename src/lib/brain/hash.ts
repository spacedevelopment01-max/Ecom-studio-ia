/**
 * Version et empreinte du contexte stable : calculées sur les DONNÉES structurées d'un scope (pas sur le texte rendu),
 * avec la version du Brain. Même empreinte tant que rien d'important n'a changé.
 */
import crypto from "node:crypto";

/** À incrémenter quand la composition des vues change (invalide les empreintes et donc le cache). */
export const BRAIN_VERSION = "2.1.0";

/** JSON canonique : clés d'objets triées, pour une empreinte indépendante de l'ordre d'écriture. */
export function canonicalJSON(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(canonicalJSON).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJSON(o[k])}`)
    .join(",")}}`;
}

export const stableHash = (scope: string, data: unknown) => crypto.createHash("sha256").update(`${BRAIN_VERSION}|${scope}|${canonicalJSON(data)}`).digest("hex").slice(0, 16);
