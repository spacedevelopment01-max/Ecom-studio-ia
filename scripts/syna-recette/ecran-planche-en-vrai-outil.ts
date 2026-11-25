/**
 * L'ÉCRAN DE LA PLANCHE EN VRAI (studio privé d'essai, jamais déployé), la partie qui se teste. Le script à lancer est
 * scripts/syna-recette/ecran-planche-en-vrai.mts ; son en-tête dit tout.
 *
 * Dans une base d'essai existante (celle où l'essai de la planche en vrai a rangé ses images), il écrit le parcours du
 * projet comme la vraie tâche (`enregistrerLeParcours` : l'identité A choisie, sa marque finie, `plancheEnVrai` lu dans
 * l'etat.json de l'essai), puis donne au propriétaire du projet un compte fictif connu pour se connecter, comme
 * lancer-agent.mts (un e-mail fictif en example.com, le mot de passe fictif de recette). Aucun appel à l'IA ni au réseau.
 * Un média que l'état désigne et qui manque fait tout refuser, sans rien écrire.
 */
import fs from "node:fs";
import type { EtatPlancheEnVrai } from "../../src/lib/syna-agent/planche-en-vrai";
import { clientDeLEssai, donneesDeLaPlanche, enregistrerLeParcours, fichiersManquants } from "./essai-planche-en-vrai-outil";

/** Le mot de passe fictif de recette (lancer-agent.mts) : jamais un vrai secret. */
export const MOT_DE_PASSE_DE_RECETTE = "Recette-492-fictif";
export const EMAIL_PAR_DEFAUT = "planche-en-vrai@example.com";

export type Ecran = { url: string; email: string; motDePasse: string; projectId: string; conversationId: string; nom: string };

export async function preparerLEcran(o: { projectId: string; etat: string; email?: string; port?: number; env?: Record<string, string | undefined> }): Promise<Ecran> {
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

  const client = clientDeLEssai(env), donnees = donneesDeLaPlanche(client, env);
  const nom = p.name?.trim() || client.nom;
  const r = await enregistrerLeParcours({ userId: p.user_id, projectId: o.projectId, nom, etat, donnees });
  // Le compte fictif du propriétaire du projet, comme lancer-agent.mts.
  const bcrypt = (await import("bcryptjs")).default;
  run("UPDATE users SET email=?, name=?, password_hash=?, role='client' WHERE id=?", email, `${nom} (fictif)`, await bcrypt.hash(MOT_DE_PASSE_DE_RECETTE, 10), p.user_id);
  const port = o.port ?? Number(env.PORT492 ?? 3493);
  return { url: `http://localhost:${port}/studio/${o.projectId}/marque`, email, motDePasse: MOT_DE_PASSE_DE_RECETTE, projectId: o.projectId, conversationId: r.conversationId, nom };
}
