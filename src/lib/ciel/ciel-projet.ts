/**
 * Le ciel d'un projet, lu sur le serveur : son tableau de bord (les neuf étapes et ce qui existe vraiment), la forme
 * de sa constellation, et les autres projets du même compte, vus de loin. Tout est lu ; seule la forme d'une
 * constellation est enregistrée, la première fois qu'on la demande.
 */
import { all, one } from "../db";
import { dashboardOf, type DashboardData } from "../syna-agent/dashboard";
import { formeDuProjet } from "./constellations";
import type { Forme } from "./forme";
import { etatDe, soleilDe, type Voisin } from "./vue";

export type CielProjetData = { data: DashboardData; forme: Forme; voisins: Voisin[]; /** Le projet est ouvert aux visites du ciel partagé. */ ouvert?: boolean };

export function cielDuProjet(projectId: string, userId: string): CielProjetData | null {
  const data = dashboardOf(projectId);
  if (!data) return null;
  const autres = all<{ id: string }>("SELECT id FROM projects WHERE user_id=? AND archived=0 AND hidden=0 AND id<>? ORDER BY created_at", userId, projectId);
  const voisins: Voisin[] = [];
  for (const { id } of autres.slice(0, 24)) {
    const d = dashboardOf(id);
    if (d) voisins.push({ id, nom: d.name, couleurs: soleilDe(d.brand?.colors), forme: formeDuProjet(id), etats: d.steps.map((s) => etatDe(s.status)) });
  }
  return { data, forme: formeDuProjet(projectId), voisins, ouvert: !!one<{ o: number }>("SELECT ciel_ouvert o FROM projects WHERE id=?", projectId)?.o };
}
