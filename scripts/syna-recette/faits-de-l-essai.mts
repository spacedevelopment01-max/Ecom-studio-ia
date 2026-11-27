/**
 * LES FAITS À MONTRER DU CLIENT D'UN ESSAI (27 novembre 2026), gratuit : aucun appel, aucune clé.
 *
 *   CLIENT_JSON=scripts/syna-recette/clients/<client>.json node_modules/.bin/tsx scripts/syna-recette/faits-de-l-essai.mts
 *     → les questions que SINA poserait encore, dans l'ordre, et ce qui est déjà répondu ;
 *   CLIENT_JSON=… REPONSE='{"sujet":"formats","produit":"…","valeur":"…"}' node_modules/.bin/tsx scripts/syna-recette/faits-de-l-essai.mts
 *     → enregistre la réponse (ou une liste de réponses entre crochets) dans le fichier du client, champ « faits », puis
 *       redit les questions qui restent. « etat » : donne (par défaut), ne_sait_pas ou ne_montre_pas ; le sujet « noms »
 *       prend « noms » (la liste des noms exacts).
 */
import fs from "node:fs";
import { ajouterLesReponses, lireLeClient, questionsDeLEssai, type ReponseDuClient } from "./faits-de-l-essai-outil";

const fichier = process.env.CLIENT_JSON;
if (!fichier) { console.error("Donnez CLIENT_JSON (le fichier du client de l'essai). Rien n'est enregistré."); process.exit(1); }
let client = lireLeClient(fichier);
if (process.env.REPONSE) {
  let r: unknown;
  try { r = JSON.parse(process.env.REPONSE); } catch { console.error("REPONSE illisible : un objet JSON, ou une liste entre crochets. Rien n'est enregistré."); process.exit(1); }
  client = await ajouterLesReponses(client, (Array.isArray(r) ? r : [r]) as ReponseDuClient[]);
  fs.writeFileSync(fichier, `${JSON.stringify(client, null, 2)}\n`);
  console.log(`Enregistré dans ${fichier}.`);
}
for (const l of (await questionsDeLEssai(client)).texte) console.log(l);
