/**
 * Les constellations gardées par le Studio : la forme d'un projet est tirée une fois, comparée à toutes celles qui
 * existent déjà, puis enregistrée. Elle ne change plus jamais, même si d'autres projets disparaissent.
 */
import { all, json, now, one, run, tx } from "../db";
import { estForme, formeUnique, type Forme } from "./forme";

/** La forme du projet (créée et enregistrée à la première demande). */
export function formeDuProjet(projectId: string): Forme {
  const lue = (): Forme | null => {
    const f = json<unknown>(one<{ forme_json: string }>("SELECT forme_json FROM constellations WHERE project_id=?", projectId)?.forme_json ?? "null", null);
    return estForme(f) ? f : null;
  };
  return lue() ?? tx(() => {
    const deja = lue();
    if (deja) return deja;
    const autres = all<{ forme_json: string }>("SELECT forme_json FROM constellations WHERE project_id<>?", projectId).map((r) => json<unknown>(r.forme_json, null)).filter(estForme);
    const { forme, essai } = formeUnique(projectId, autres);
    run("INSERT OR REPLACE INTO constellations(project_id, essai, forme_json, created_at) VALUES(?,?,?,?)", projectId, essai, JSON.stringify(forme), now());
    return forme;
  });
}
