/**
 * Le ciel partagé : ce que chacun a le droit de voir des projets des autres.
 *
 * Un projet verrouillé (le cas par défaut) n'est qu'une constellation anonyme : sa forme, son métier (pour les amas),
 * s'il dort, et l'heure de sa dernière étape finie (pour s'allumer en direct). Jamais son nom, ses couleurs, son
 * avancement ni son vrai numéro : sa clé est une empreinte. Un projet que son propriétaire a ouvert aux visites
 * montre en plus son nom, ses couleurs, ses étoiles, sa marque et l'adresse de son site : on regarde, on ne modifie rien.
 */
import { all, id as nouvelId, now, one, run } from "../db";
import { sha256 } from "../secrets";
import { dashboardOf, type DashboardData } from "../syna-agent/dashboard";
import { journeyOfProject } from "../syna-agent/construction";
import { formeDuProjet } from "./constellations";
import type { Forme } from "./forme";
import { etatDe, soleilDe, type Couleurs, type EtatEtoile } from "./vue";

/** Au-delà, les plus anciens ne sont pas envoyés : le ciel reste fluide. */
export const AUTRES_MAX = 200;

export const cleDuProjet = (projectId: string) => sha256(`ciel:${projectId}`).slice(0, 20);

export type AstreCommun = {
  cle: string; metier: string | null; forme: Forme; ouvert: boolean; endormi: boolean;
  /** Heure de la dernière étape finie (0 : aucune) : une étape finie quelque part allume une étoile, sans nom. */
  dernier: number;
  /** Seulement pour un projet ouvert aux visites. */
  nom?: string; couleurs?: Couleurs | null; etats?: EtatEtoile[];
};

type Ligne = { id: string; user_id: string; status: string; sector: string | null; ciel_ouvert: number };

/** L'heure de la dernière étape finie d'un projet. */
export function derniereEtape(projectId: string): number {
  const j = journeyOfProject(projectId);
  return j ? Math.max(0, ...Object.values(j.steps).filter((s) => s.status === "done").map((s) => s.at ?? 0)) : 0;
}

function astre(p: Ligne): AstreCommun {
  const base: AstreCommun = { cle: cleDuProjet(p.id), metier: p.sector, forme: formeDuProjet(p.id), ouvert: !!p.ciel_ouvert, endormi: p.status === "paused", dernier: derniereEtape(p.id) };
  if (!p.ciel_ouvert) return base;
  const d = dashboardOf(p.id);
  return d ? { ...base, nom: d.name, couleurs: soleilDe(d.brand?.colors), etats: d.steps.map((s) => etatDe(s.status)) } : base;
}

/** Les projets des autres, tels que ce compte peut les voir, et les visites reçues par ses projets ouverts depuis `depuis`. */
export function cielCommun(userId: string, depuis = 0): { autres: AstreCommun[]; total: number; regards: { projectId: string; at: number }[] } {
  const lignes = all<Ligne>("SELECT id, user_id, status, sector, ciel_ouvert FROM projects WHERE user_id<>? AND archived=0 AND hidden=0 ORDER BY updated_at DESC LIMIT ?", userId, AUTRES_MAX);
  const total = one<{ n: number }>("SELECT COUNT(*) n FROM projects WHERE user_id<>? AND archived=0 AND hidden=0", userId)?.n ?? 0;
  const regards = all<{ project_id: string; at: number }>("SELECT r.project_id, r.at FROM ciel_regards r JOIN projects p ON p.id=r.project_id WHERE p.user_id=? AND r.at>? ORDER BY r.at DESC LIMIT 20", userId, depuis);
  return { autres: lignes.map(astre), total, regards: regards.map((r) => ({ projectId: r.project_id, at: r.at })) };
}

/** Le propriétaire ouvre ou referme son projet aux visites. */
export function ouvrirAuxVisites(userId: string, projectId: string, ouvert: boolean): boolean {
  return run("UPDATE projects SET ciel_ouvert=? WHERE id=? AND user_id=? AND archived=0", ouvert ? 1 : 0, projectId, userId).changes === 1;
}

export const estOuvert = (projectId: string) => !!one<{ o: number }>("SELECT ciel_ouvert o FROM projects WHERE id=?", projectId)?.o;

export type Visite = { cle: string; forme: Forme; data: DashboardData; site: string | null };

/**
 * Un projet ouvert, vu par un visiteur : sa constellation, sa marque et l'adresse de son site. Ce que le client a dit
 * à SINA (sa fiche, ses notes), son angle et son logo ne sortent jamais d'ici. La visite est notée, sauf celle du
 * propriétaire lui-même.
 */
export function visiteDuProjet(cle: string, visiteurId: string): Visite | null {
  const p = all<{ id: string; user_id: string; store_url: string | null }>("SELECT id, user_id, store_url FROM projects WHERE ciel_ouvert=1 AND archived=0 AND hidden=0").find((x) => cleDuProjet(x.id) === cle);
  const d = p ? dashboardOf(p.id) : null;
  if (!p || !d) return null;
  if (p.user_id !== visiteurId) {
    // Une visite par personne et par quart d'heure suffit à faire passer la comète.
    const recente = one("SELECT 1 FROM ciel_regards WHERE project_id=? AND user_id=? AND at>?", p.id, visiteurId, now() - 15 * 60_000);
    if (!recente) run("INSERT INTO ciel_regards(id, project_id, user_id, at) VALUES(?,?,?,?)", nouvelId(), p.id, visiteurId, now());
  }
  const site = typeof p.store_url === "string" && /^https:\/\//.test(p.store_url) ? p.store_url : null;
  const data: DashboardData = { ...d, building: false, fiche: [], notes: [], keep: [], angle: null, brand: d.brand ? { ...d.brand, logo: null } : null };
  return { cle, forme: formeDuProjet(p.id), data, site };
}

