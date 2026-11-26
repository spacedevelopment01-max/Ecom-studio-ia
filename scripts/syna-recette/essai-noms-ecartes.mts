/**
 * LES NOMS ÉCARTÉS D'UN ESSAI DES NOMS DÉJÀ FAIT, SANS LE REFAIRE (studio privé d'essai, jamais déployé). Aucun appel,
 * aucune clé, aucune dépense : la tâche des noms est retrouvée par `reprise.json` du dossier de l'essai dans la base du
 * studio d'essai (DATA_DIR), et ses noms écartés sont relus dans son état (ses points de reprise : ce que les équipes, le
 * juge et la vérification ont rendu). Le rapport (rapport.txt) reçoit, ou voit remplacée, sa partie « Noms écartés par
 * SINA, et pourquoi » ; tout le reste est gardé tel quel. noms.json reçoit `ecartes`.
 *
 * Il faut la base de l'essai telle que l'essai l'a laissée (par exemple data/essai-torrefacteur/studio) : sans elle, rien
 * n'est réécrit, et c'est dit.
 *
 * Usage (depuis la racine du dépôt) :
 *   DATA_DIR=data/essai-torrefacteur/studio node_modules/.bin/tsx scripts/syna-recette/essai-noms-ecartes.mts data/essai-torrefacteur/1-noms
 */
import fs from "node:fs";
import path from "node:path";

{
  if (!process.env.DATA_DIR) { console.error("DATA_DIR manquant (dossier du Studio privé d'essai où l'essai des noms a tourné)."); process.exit(1); }
  const dir = path.resolve(process.env.DATA_DIR);
  if (!fs.existsSync(path.join(dir, "studio.db"))) { console.error(`Aucune base d'essai dans ${dir} : les traces de l'essai n'y sont pas. Rien n'est réécrit.`); process.exit(1); }
  const secretFile = path.join(dir, "app-secret.txt");
  Object.assign(process.env, { DATA_DIR: dir, ...(fs.existsSync(secretFile) ? { APP_SECRET: fs.readFileSync(secretFile, "utf8").trim() } : {}), ANTHROPIC_API_KEY: "", OPENAI_API_KEY: "", GOOGLE_API_KEY: "" });
  const sortieArg = process.argv[2] ?? process.env.SORTIE;
  if (!sortieArg) { console.error("Dossier de l'essai des noms manquant (premier paramètre, celui de rapport.txt et reprise.json)."); process.exit(1); }
  const { reecrireLesEcartesDesNoms } = await import("./essai-noms-outil");
  try {
    const r = await reecrireLesEcartesDesNoms({ sortie: path.resolve(sortieArg) });
    console.log(r.lignes.join("\n"));
    console.log(`Rapport réécrit : ${path.join(path.resolve(sortieArg), "rapport.txt")} (aucun appel, aucune dépense).`);
  } catch (e) { console.error((e as Error).message); process.exit(1); }
  process.exit(0);
}
