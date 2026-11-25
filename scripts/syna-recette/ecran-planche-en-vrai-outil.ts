/**
 * L'ÉCRAN DE LA PLANCHE EN VRAI (studio privé d'essai, jamais déployé), la partie qui se teste. Le script à lancer est
 * scripts/syna-recette/ecran-planche-en-vrai.mts ; son en-tête dit tout.
 *
 * Dans une base d'essai existante (celle où l'essai de la planche en vrai a rangé ses images), il écrit le parcours du
 * projet comme la vraie tâche (`enregistrerLeParcours` : l'identité A choisie, sa marque finie, `plancheEnVrai` lu dans
 * l'etat.json de l'essai), puis donne au propriétaire du projet un compte fictif connu pour se connecter, comme
 * lancer-agent.mts (un e-mail fictif en example.com, le mot de passe fictif de recette). Aucun appel à l'IA ni au réseau.
 * Un média que l'état désigne et qui manque fait tout refuser, sans rien écrire.
 *
 * `refaireLesLogos` (REFAIRE_LOGOS=1 dans le script, gratuit, aucun appel) : les logos d'une base faite avant la correction
 * de la séparation du symbole et du nom sont refaits par le code corrigé, à partir du logo fini (`refaireLesLogosEnVrai`) ;
 * le parcours, la marque et l'etat.json sont mis à jour (l'ancien gardé en etat-avant-logos.json). L'inventaire de l'essai,
 * s'il n'est pas dans l'état, est lu dans inventaire-reponse.json à côté de l'etat.json : la planche est alors réassemblée.
 */
import fs from "node:fs";
import path from "node:path";
import type { EtatPlancheEnVrai } from "../../src/lib/syna-agent/planche-en-vrai";
import { clientDeLEssai, donneesDeLaPlanche, enregistrerLeParcours, fichiersManquants, type ClientDeLEssai, type DonneesDeLaPlanche } from "./essai-planche-en-vrai-outil";

/** Le mot de passe fictif de recette (lancer-agent.mts) : jamais un vrai secret. */
export const MOT_DE_PASSE_DE_RECETTE = "Recette-492-fictif";
export const EMAIL_PAR_DEFAUT = "planche-en-vrai@example.com";

/** Ce que l'essai de la planche en vrai a écrit à côté de son etat.json (essai.json) : le client, les données, le projet. */
export type EssaiEcrit = { client: ClientDeLEssai; donnees: DonneesDeLaPlanche; projectId?: string };

/**
 * Le client et les données de la planche de l'essai : lus dans l'essai.json écrit à côté de l'etat.json par l'essai de la
 * planche en vrai ; sans lui (base plus ancienne), les variables du client et de la planche (CLIENT_JSON, RESULTAT_PLANCHE
 * ou DOMAINE…), sans aucune valeur imposée ni appel au réseau. Ce qui manque est dit.
 */
export function essaiDeLEtat(etat: string, env: Record<string, string | undefined> = process.env): EssaiEcrit {
  const f = path.join(path.dirname(etat), "essai.json");
  if (fs.existsSync(f)) {
    let e: EssaiEcrit;
    try { e = JSON.parse(fs.readFileSync(f, "utf8")) as EssaiEcrit; } catch { throw new Error(`${f} illisible : rien n'est écrit.`); }
    if (!e?.client?.nom || !e.donnees?.statut || !e.donnees.annee) throw new Error(`${f} ne dit pas le client et les données de la planche : rien n'est écrit.`);
    return e;
  }
  const client = clientDeLEssai(env);
  return { client, donnees: donneesDeLaPlanche(client, env) };
}

export type Ecran = { url: string; email: string; motDePasse: string; projectId: string; conversationId: string; nom: string; logosRefaits?: { symboleComplet: boolean; plancheReassemblee: boolean } };

export async function preparerLEcran(o: { projectId: string; etat: string; email?: string; port?: number; env?: Record<string, string | undefined>; refaireLesLogos?: boolean }): Promise<Ecran> {
  const env = o.env ?? process.env;
  const email = (o.email ?? EMAIL_PAR_DEFAUT).trim().toLowerCase();
  if (!/^[^@\s]+@example\.com$/.test(email)) throw new Error(`L'e-mail du compte doit être fictif, en example.com (${email}) : rien n'est écrit.`);
  if (!fs.existsSync(o.etat)) throw new Error(`État de la planche en vrai introuvable : ${o.etat}. Rien n'est écrit.`);
  let etat: EtatPlancheEnVrai;
  try { etat = JSON.parse(fs.readFileSync(o.etat, "utf8")) as EtatPlancheEnVrai; } catch { throw new Error(`État de la planche en vrai illisible : ${o.etat}. Rien n'est écrit.`); }
  if (!etat?.demo || !etat.logo || !Array.isArray(etat.elements) || !Array.isArray(etat.logos) || !Array.isArray(etat.palette)) throw new Error(`${o.etat} n'est pas l'état d'une planche en vrai : rien n'est écrit.`);
  if (!etat.planche) throw new Error(`${o.etat} n'a pas de planche en vrai assemblée : rien n'est écrit.`);

  const { one, run } = await import("../../src/lib/db");
  const p = one<{ id: string; user_id: string; name: string }>("SELECT id, user_id, name FROM projects WHERE id=?", o.projectId);
  if (!p) throw new Error(`Projet ${o.projectId} introuvable dans cette base (DATA_DIR) : rien n'est écrit.`);
  const manque = await fichiersManquants(o.projectId, etat);
  if (manque.length) throw new Error(`Médias de la planche en vrai introuvables dans ce projet : ${manque.join(", ")}. Rien n'est écrit.`);
  const autre = one<{ id: string }>("SELECT id FROM users WHERE email=? AND id<>?", email, p.user_id);
  if (autre) throw new Error(`L'e-mail ${email} est déjà pris par un autre compte de cette base : rien n'est écrit.`);

  const { client, donnees } = essaiDeLEtat(o.etat, env);
  const nom = p.name?.trim() || client.nom;
  let r = await enregistrerLeParcours({ userId: p.user_id, projectId: o.projectId, nom, etat, donnees });
  let logosRefaits: Ecran["logosRefaits"];
  if (o.refaireLesLogos) {
    const { journeyOfProject } = await import("../../src/lib/syna-agent/construction");
    const { chosenRoute } = await import("../../src/lib/syna-agent/logos");
    const { refaireLesLogosEnVrai } = await import("../../src/lib/syna-agent/planche-en-vrai-tache");
    const { InventaireSchema } = await import("../../src/lib/syna-agent/planche-en-vrai");
    const route = chosenRoute(journeyOfProject(o.projectId)!);
    if (!route) throw new Error("Identité choisie introuvable après l'écriture du parcours : les logos ne sont pas refaits.");
    const fichierInventaire = path.join(path.dirname(o.etat), "inventaire-reponse.json");
    const inventaire = etat.inventaire ?? (fs.existsSync(fichierInventaire) ? InventaireSchema.parse(JSON.parse(fs.readFileSync(fichierInventaire, "utf8"))) : undefined);
    const avant = etat.planche?.id;
    const nouveau = await refaireLesLogosEnVrai({ who: { userId: p.user_id, projectId: o.projectId }, route, etat: { ...etat, ...(inventaire ? { inventaire } : {}) }, phrase: donnees.phrase });
    const sauvegarde = path.join(path.dirname(o.etat), "etat-avant-logos.json");
    if (!fs.existsSync(sauvegarde)) fs.copyFileSync(o.etat, sauvegarde);
    fs.writeFileSync(o.etat, JSON.stringify(nouveau, null, 2));
    r = await enregistrerLeParcours({ userId: p.user_id, projectId: o.projectId, nom, etat: nouveau, donnees });
    logosRefaits = { symboleComplet: nouveau.symboleComplet, plancheReassemblee: nouveau.planche?.id !== avant };
  }
  // Le compte fictif du propriétaire du projet, comme lancer-agent.mts.
  const bcrypt = (await import("bcryptjs")).default;
  run("UPDATE users SET email=?, name=?, password_hash=?, role='client' WHERE id=?", email, `${nom} (fictif)`, await bcrypt.hash(MOT_DE_PASSE_DE_RECETTE, 10), p.user_id);
  const port = o.port ?? Number(env.PORT492 ?? 3493);
  return { url: `http://localhost:${port}/studio/${o.projectId}/marque`, email, motDePasse: MOT_DE_PASSE_DE_RECETTE, projectId: o.projectId, conversationId: r.conversationId, nom, ...(logosRefaits ? { logosRefaits } : {}) };
}
