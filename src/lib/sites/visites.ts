/**
 * LE COMPTEUR DE VISITES DU STUDIO (22 novembre 2026, recherche 08 partie 1.1), tenu dans l'exemption de la CNIL pour
 * la mesure d'audience (cnil.fr, « Cookies : solutions pour les outils de mesure d'audience ») :
 *  - finalité limitée à la seule mesure d'audience, pour le compte exclusif du client ;
 *  - des comptes anonymes seulement : pages vues par jour et par page ; aucune adresse, aucun identifiant, aucun
 *    traceur déposé, aucun recoupement (ni carnet de clients, ni demandes) ;
 *  - rangé à part pour chaque client (une ligne par projet) ;
 *  - effacé au bout de 25 mois ;
 *  - un lien « ne pas être compté » sur le site (`/__ne-pas-compter`), et une ligne dans les mentions.
 * Aucune empreinte de visiteur : le Studio compte des pages vues, pas des personnes (les visiteurs uniques demanderaient
 * de lire le navigateur, ce que l'EDPB range dans la règle des traceurs). Le Studio ne se dit ni « certifié » ni
 * « validé par la CNIL » (il n'y a plus de label).
 */
import { all, run } from "../db";

export const REFUS = "ecs_ne_pas_compter";
export const CHEMIN_REFUS = "/__ne-pas-compter";
export const GARDE_MOIS = 25;
export const MENTION_MESURE = "Mesure d'audience : ce site compte ses pages vues, sans traceur ni adresse, pour son seul éditeur ; les chiffres sont effacés au bout de 25 mois. Pour ne pas être compté : " + CHEMIN_REFUS + ".";

const ROBOT = /bot|crawl|spider|slurp|preview|monitor|headless|lighthouse/i;

/** Faut-il compter cette page vue ? (pas un robot, pas un visiteur qui a refusé, pas une simple vérification) */
export function aCompter(req: Request): boolean {
  if (req.method !== "GET") return false;
  if (ROBOT.test(req.headers.get("user-agent") ?? "")) return false;
  if ((req.headers.get("cookie") ?? "").split(/;\s*/).some((c) => c === `${REFUS}=1`)) return false;
  return true;
}

const jourDe = (t: number) => new Date(t).toISOString().slice(0, 10);

export function compterVue(projectId: string, page: string, at = Date.now()): void {
  run("INSERT INTO visites(project_id,jour,page,vues) VALUES(?,?,?,1) ON CONFLICT(project_id,jour,page) DO UPDATE SET vues=vues+1", projectId, jourDe(at), page.slice(0, 300));
}

/** Les pages vues d'un client entre deux dates (AAAA-MM-JJ, comprises), avec les pages les plus vues. */
export function visitesDe(projectId: string, du: string, au: string): { vues: number; parJour: { jour: string; vues: number }[]; pages: { page: string; vues: number }[] } {
  const parJour = all<{ jour: string; vues: number }>("SELECT jour, SUM(vues) vues FROM visites WHERE project_id=? AND jour BETWEEN ? AND ? GROUP BY jour ORDER BY jour", projectId, du, au);
  const pages = all<{ page: string; vues: number }>("SELECT page, SUM(vues) vues FROM visites WHERE project_id=? AND jour BETWEEN ? AND ? GROUP BY page ORDER BY vues DESC LIMIT 10", projectId, du, au);
  return { vues: parJour.reduce((s, x) => s + x.vues, 0), parJour, pages };
}

/** Efface ce qui a plus de 25 mois. */
export function purgerVisites(now = Date.now()): void {
  const d = new Date(now); d.setUTCMonth(d.getUTCMonth() - GARDE_MOIS);
  run("DELETE FROM visites WHERE jour < ?", jourDe(d.getTime()));
}

/** La page « ne pas être compté » : un témoin de refus sur ce site seulement (13 mois), et l'explication. */
export function pageRefus(origin: string): Response {
  const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Ne pas être compté</title><body style="font-family:system-ui,sans-serif;max-width:36rem;margin:4rem auto;padding:0 1rem;line-height:1.5"><h1>Vous ne serez plus compté.</h1><p>Ce site compte seulement ses pages vues, sans traceur ni adresse, pour son seul éditeur. Sur ce navigateur, vos visites ne sont désormais plus comptées.</p><p><a href="${origin}/">Retour au site</a></p></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Set-Cookie": `${REFUS}=1; Path=/; Max-Age=${13 * 30 * 24 * 3600}; SameSite=Lax; Secure` } });
}
