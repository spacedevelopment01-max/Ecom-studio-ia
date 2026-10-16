/**
 * CONSIGNES DE VOCABULAIRE DU CLIENT (mémoire du projet) — ex. « montre » et jamais « chronographe ».
 *
 * Une consigne donnée une fois est enregistrée dans la table `memory` (portée `client`, clé `wording.rules`,
 * versionnée : l'ancienne version passe au statut `rejected`) et appliquée AUTOMATIQUEMENT à chaque création : textes
 * des visuels (accroche, ligne, bouton) et consignes envoyées aux modèles d'images. Elle ne dépend plus de la
 * conversation : le studio la relit à chaque fois.
 */
import { id, now, one, run } from "./db";

export type WordingRule = { avoid: string; use: string; note?: string };

const SCOPE = "client";
const KEY = "wording.rules";

export function loadWordingRules(projectId: string): WordingRule[] {
  const r = one<{ value: string }>("SELECT value FROM memory WHERE project_id = ? AND scope = ? AND key = ? AND status != 'rejected' ORDER BY created_at DESC LIMIT 1", projectId, SCOPE, KEY);
  try {
    return r ? (JSON.parse(r.value) as WordingRule[]) : [];
  } catch {
    return [];
  }
}

/** Ajoute (ou remplace) une consigne ; nouvelle version, l'ancienne gardée pour l'historique. */
export function addWordingRule(projectId: string, rule: WordingRule): WordingRule[] {
  const avoid = rule.avoid.trim();
  if (!avoid) return loadWordingRules(projectId);
  const next = [...loadWordingRules(projectId).filter((r) => r.avoid.toLowerCase() !== avoid.toLowerCase()), { avoid, use: rule.use.trim(), ...(rule.note ? { note: rule.note } : {}) }];
  run("UPDATE memory SET status = 'rejected', updated_at = ? WHERE project_id = ? AND scope = ? AND key = ? AND status != 'rejected'", now(), projectId, SCOPE, KEY);
  run("INSERT INTO memory (id, project_id, kind, key, value, status, source, scope, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", id(), projectId, "preference", KEY, JSON.stringify(next), "confirmed", "user", SCOPE, now(), now());
  return next;
}

export function removeWordingRule(projectId: string, avoid: string): WordingRule[] {
  const next = loadWordingRules(projectId).filter((r) => r.avoid.toLowerCase() !== avoid.trim().toLowerCase());
  run("UPDATE memory SET status = 'rejected', updated_at = ? WHERE project_id = ? AND scope = ? AND key = ? AND status != 'rejected'", now(), projectId, SCOPE, KEY);
  run("INSERT INTO memory (id, project_id, kind, key, value, status, source, scope, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", id(), projectId, "preference", KEY, JSON.stringify(next), "confirmed", "user", SCOPE, now(), now());
  return next;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Garde la casse du mot remplacé (Chronographe → Montre, CHRONOGRAPHE → MONTRE). */
const matchCase = (src: string, rep: string) => (src === src.toUpperCase() && src.length > 1 ? rep.toUpperCase() : src[0] === src[0].toUpperCase() ? rep.charAt(0).toUpperCase() + rep.slice(1) : rep);

/** Applique les consignes à un texte (mots entiers, accents et pluriels simples compris). */
export function applyWording(text: string, rules: WordingRule[]): string {
  let out = text;
  for (const r of rules) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])(${esc(r.avoid)})(s?)(?![\\p{L}\\p{N}])`, "giu");
    out = out.replace(re, (_m, w: string, plural: string) => (r.use ? matchCase(w, r.use) + (plural && !/s$/i.test(r.use) ? plural : "") : ""));
  }
  // « Montre chronographe » → « Montre montre » : le mot répété est fusionné.
  return out.replace(/(?<![\p{L}])(\p{L}+) \1(?![\p{L}])/giu, "$1").replace(/ {2,}/g, " ").trim();
}

/** Ligne ajoutée aux consignes des modèles : le vocabulaire du client, à respecter dans ce qui est écrit. */
export function wordingPromptLine(rules: WordingRule[]): string {
  return rules.length ? `Client vocabulary (mandatory in any written word): ${rules.map((r) => (r.use ? `say "${r.use}", never "${r.avoid}"` : `never "${r.avoid}"`)).join("; ")}.` : "";
}
