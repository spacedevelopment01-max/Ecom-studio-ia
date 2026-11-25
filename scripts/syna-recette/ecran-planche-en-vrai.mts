/**
 * L'ÉCRAN DE LA PLANCHE EN VRAI (studio privé d'essai, jamais déployé ; gratuit : aucun appel à l'IA ni au réseau).
 *
 * Dans une base d'essai existante (DATA_DIR), pour un projet où l'essai de la planche en vrai a rangé ses images :
 *  1. écrit le parcours du projet comme la vraie tâche (l'identité A choisie, sa marque finie, `plancheEnVrai` lu dans
 *     l'etat.json donné en paramètre) ; un média désigné par l'état qui manque fait tout refuser, sans rien écrire ;
 *  2. donne au propriétaire du projet un compte fictif connu (EMAIL, par défaut planche-en-vrai@example.com ; le mot de
 *     passe fictif de recette de lancer-agent.mts) ;
 *  3. affiche l'adresse de la page Marque et le compte.
 *
 * Le client et les données de la planche : lus dans l'essai.json écrit à côté de l'etat.json par l'essai de la planche en
 * vrai ; sans lui, CLIENT_JSON et RESULTAT_PLANCHE (ou DOMAINE…), comme essai-planche-en-vrai.mts. Aucun client imposé.
 *
 * Usage (depuis la racine du dépôt) :
 *   DATA_DIR=data/essai-ecume/studio node_modules/.bin/tsx scripts/syna-recette/ecran-planche-en-vrai.mts \
 *     data/essai-ecume/4-planche-en-vrai/etat.json
 * (ou l'identifiant du projet, puis l'etat.json, pour une base sans essai.json).
 * Avec REFAIRE_LOGOS=1 (gratuit, aucun appel à l'IA) : les logos sont d'abord refaits par le code corrigé à partir du logo
 * fini, l'état (etat.json, l'ancien gardé en etat-avant-logos.json), les médias et le parcours sont mis à jour.
 * Puis lancer le studio privé sur la même base (lancer-agent.mts ou garder-allume.sh) et ouvrir l'adresse affichée.
 */
import fs from "node:fs";
import path from "node:path";

{
  if (!process.env.DATA_DIR) { console.error("DATA_DIR manquant (dossier de la base d'essai)."); process.exit(1); }
  const dir = path.resolve(process.env.DATA_DIR);
  if (!fs.existsSync(dir)) { console.error(`Base d'essai introuvable : ${dir}.`); process.exit(1); }
  // Soit l'etat.json seul (le projet est lu dans l'essai.json écrit à côté), soit l'identifiant du projet puis l'etat.json.
  const args = process.argv.slice(2);
  const etat = args.length === 1 ? args[0] : args[1];
  let projectId = args.length === 1 ? "" : args[0];
  if (!etat) { console.error("Il faut le chemin de l'etat.json de l'essai (ou l'identifiant du projet, puis ce chemin)."); process.exit(1); }
  if (!projectId) {
    const f = path.join(path.dirname(path.resolve(etat)), "essai.json");
    try { projectId = String(JSON.parse(fs.readFileSync(f, "utf8")).projectId ?? ""); } catch { projectId = ""; }
    if (!projectId) { console.error(`Identifiant du projet introuvable dans ${f} : donnez-le avant l'etat.json.`); process.exit(1); }
  }
  const secretFile = path.join(dir, "app-secret.txt");
  if (!fs.existsSync(secretFile)) { console.error(`${secretFile} manquant : ce n'est pas une base d'essai déjà lancée.`); process.exit(1); }
  // Aucune clé : rien ne peut partir vers un fournisseur.
  Object.assign(process.env, { DATA_DIR: dir, APP_SECRET: fs.readFileSync(secretFile, "utf8").trim(), OPENAI_API_KEY: "", DASHSCOPE_API_KEY: "", FAL_KEY: "", ANTHROPIC_API_KEY: "", GOOGLE_API_KEY: "" });
  const { preparerLEcran } = await import("./ecran-planche-en-vrai-outil");
  try {
    const e = await preparerLEcran({ projectId, etat: path.resolve(etat), ...(process.env.EMAIL ? { email: process.env.EMAIL } : {}), refaireLesLogos: process.env.REFAIRE_LOGOS === "1" });
    if (e.logosRefaits) console.log(`Logos refaits par le code (aucun appel) : ${e.logosRefaits.symboleComplet ? "symbole et nom toujours pas séparés, logo complet gardé" : "symbole et nom séparés"} ; planche ${e.logosRefaits.plancheReassemblee ? "réassemblée" : "gardée telle quelle (sans inventaire)"}.`);
    console.log(`Parcours écrit pour « ${e.nom} » (projet ${e.projectId}, fil ${e.conversationId}).`);
    console.log(`Page Marque : ${e.url}`);
    console.log(`Compte fictif : ${e.email} — mot de passe fictif de recette : ${e.motDePasse}`);
    process.exit(0);
  } catch (err) { console.error((err as Error).message); process.exit(1); }
}
