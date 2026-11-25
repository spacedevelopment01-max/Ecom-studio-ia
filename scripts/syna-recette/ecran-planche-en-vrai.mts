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
 * Usage (depuis la racine du dépôt) :
 *   DATA_DIR=data/essai-planche-en-vrai node_modules/.bin/tsx scripts/syna-recette/ecran-planche-en-vrai.mts \
 *     <identifiant du projet> data/essai-planche-en-vrai/sortie/etat.json
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
  const [projectId, etat] = process.argv.slice(2);
  if (!projectId || !etat) { console.error("Il faut l'identifiant du projet, puis le chemin de l'etat.json de l'essai."); process.exit(1); }
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
