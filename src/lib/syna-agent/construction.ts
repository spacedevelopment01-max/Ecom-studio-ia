/**
 * Mode chantier (#492, décision du propriétaire du 6 novembre 2026) : pendant que SINA construit le projet (étapes 0 à
 * 13 du parcours), le client voit tout en direct (conversation, frise, marque, aperçu du site…) mais ne modifie rien
 * lui-même dans le Studio : il demande les changements à SINA, qui les fait au bon moment sans casser l'ordre du
 * parcours. Tout s'ouvre quand l'étape 13 est terminée. Seuls les projets créés avec le parcours SINA sont concernés.
 * Les actions de SINA (tâches de fond) ne passent pas par ce verrou : il ne vise que les requêtes HTTP du client.
 */
import { HttpError } from "../auth";
import { all, json } from "../db";
import { L } from "../i18n-server";
import { accessScope } from "../access-scope";
import { journeyOf, type Journey } from "./journey";

/**
 * Requêtes toujours permises pendant le chantier : lecture, abonnement, mise en pause, suivi des tâches, et la case
 * « publié » du calendrier (le client dit ce qu'il a publié lui-même : ce n'est pas une modification du Studio).
 */
export const ALWAYS_ALLOWED = /\/api\/projects\/[^/]+\/(subscription|pause|jobs|calendrier)(\/|$)/;

export function journeyOfProject(projectId: string): Journey | null {
  const rows = all<{ id: string; state_json: string | null }>("SELECT id, state_json FROM agent_conversations WHERE project_id=?", projectId);
  const row = rows.find((r) => json<any>(r.state_json ?? "{}", {}).parcours);
  return row ? journeyOf(row.id) : null;
}

/** Le projet est-il en construction avec SINA ? (parcours commencé, étape 13 pas encore terminée). */
export function underConstruction(projectId: string): boolean {
  const j = journeyOfProject(projectId);
  if (!j) return false;
  const last = j.steps[13]?.status;
  return last !== "done" && last !== "skipped";
}

export function assertNotUnderConstruction(projectId: string) {
  const s = accessScope();
  if (s?.kind !== "http" || !s.method || ["GET", "HEAD", "OPTIONS"].includes(s.method.toUpperCase())) return;
  if (s.path && ALWAYS_ALLOWED.test(s.path)) return;
  if (!underConstruction(projectId)) return;
  throw new HttpError(423, L("Ton projet est en construction avec SINA : tu peux tout suivre en direct, et pour changer quelque chose, demande-le-lui dans la conversation. Le Studio s'ouvre entièrement à la fin de la construction.", "Your project is being built with SINA: follow along live, and ask SINA in the conversation to change anything. The Studio fully opens when construction ends."), "under_construction");
}
