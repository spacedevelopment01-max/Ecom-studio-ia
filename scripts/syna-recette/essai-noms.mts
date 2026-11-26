/**
 * ESSAI RÉEL DES NOMS DE LA MARQUE (studio privé d'essai, jamais déployé), pour un client qui n'a pas encore de nom. Les
 * noms sont exactement ceux du parcours : la tâche de la marque du Studio (`runSinaBrandJob` avec `jusquAuxNoms`), comme
 * `identity.propose` la lance par la méthode des graphistes, puis l'adresse de chaque nom vérifié (`findDomains`, gratuite).
 *
 *  1. un compte et un projet fictifs pour le client inventé donné, SANS nom (client-de-l-essai.ts : CLIENT_JSON, ou
 *     CLIENT_METIER, CLIENT_TYPE, CLIENT_PRODUITS ; aucun client par défaut ; un client qui a déjà un nom est refusé) ;
 *  2. le garde-fou de dépense de l'essai allumé avec PLAFOND_ESSAI_EUR (src/lib/ai/plafond-essai.ts). Le plafond peut être
 *     proche du probable (deux fois, arrondi, est conseillé) : sous la somme des maxima, l'essai part quand même et
 *     s'arrête proprement avant tout appel dont le pire cas dépasserait ce qui reste ; il garde alors ses fichiers et la
 *     tâche ses points de reprise, et dit ce qu'il faudrait pour finir (26 novembre 2026). REPRENDRE=1, dans le même
 *     dossier de sortie, reprend là, sans refaire ni repayer les étapes faites ;
 *  3. la tâche des noms du Studio : recherches et étude, idées, équipes de noms, juge, second tour si besoin, vérification
 *     des noms gardés sur le web ; 4. l'adresse de chaque nom vérifié (annuaires publics des registres, gratuit).
 * Aucun appel n'est relancé tout seul : une panne arrête l'essai et est écrite comme telle (code de sortie 2).
 *
 * Ce qu'il écrit dans le dossier de sortie : fiche-du-client.txt ; noms.json (les noms vérifiés, numérotés, avec leur
 * adresse) ; depense.json ; rapport.txt. Le nom choisi par le propriétaire part ensuite aux autres scripts par CLIENT_NOM.
 *
 * Usage (depuis la racine du dépôt ; clé Anthropic par STUDIO_ANTHROPIC_KEY dans les réglages de l'environnement, jamais
 * dans le code ni dans la commande) :
 *   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt DATA_DIR=data/essai-torrefacteur/studio \
 *     CLIENT_JSON=scripts/syna-recette/clients/torrefacteur.json PLAFOND_ESSAI_EUR=… \
 *     node_modules/.bin/tsx scripts/syna-recette/essai-noms.mts data/essai-torrefacteur/0-noms
 * Devis seul, sans aucun appel ni clé : DEVIS_SEULEMENT=1 DATA_DIR=… node_modules/.bin/tsx scripts/syna-recette/essai-noms.mts
 */
import fs from "node:fs";
import path from "node:path";

{
  const devisSeul = process.env.DEVIS_SEULEMENT === "1";
  if (!process.env.DATA_DIR) { console.error("DATA_DIR manquant (dossier du Studio privé d'essai)."); process.exit(1); }
  const dir = path.resolve(process.env.DATA_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const { randomBytes } = await import("node:crypto");
  const secretFile = path.join(dir, "app-secret.txt");
  if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, randomBytes(32).toString("hex"));
  Object.assign(process.env, { DATA_DIR: dir, APP_SECRET: fs.readFileSync(secretFile, "utf8").trim(), OPENAI_API_KEY: "sk-proxy-injected", DASHSCOPE_API_KEY: "sk-proxy-injected", FAL_KEY: "proxy-injected", ANTHROPIC_API_KEY: "", GOOGLE_API_KEY: "" });
  const { appliquerTarifsVerifies } = await import("./tarifs-verifies");
  await appliquerTarifsVerifies();
  const { clientDeLEssai, devisDesNoms, devisDesNomsEnTexte, essaiDesNoms, euros } = await import("./essai-noms-outil");
  const { avisDuPlafond, plafondLu } = await import("./plafond-des-essais");
  if (devisSeul) { console.log(devisDesNomsEnTexte(await devisDesNoms()).join("\n")); process.exit(0); }

  const sortieArg = process.argv[2] ?? process.env.SORTIE;
  if (!sortieArg) { console.error("Dossier de sortie manquant (premier paramètre)."); process.exit(1); }
  if (!process.env.PLAFOND_ESSAI_EUR) { console.error("PLAFOND_ESSAI_EUR manquant : rien n'est lancé."); process.exit(1); }
  let client: ReturnType<typeof clientDeLEssai>;
  try { client = clientDeLEssai(process.env, { sansNom: true }); } catch (e) { console.error((e as Error).message); process.exit(1); }
  const devis = await devisDesNoms();
  console.log(devisDesNomsEnTexte(devis).join("\n"));
  const plafond = plafondLu(process.env.PLAFOND_ESSAI_EUR);
  if (plafond == null) { console.error("PLAFOND_ESSAI_EUR illisible : rien n'est lancé."); process.exit(1); }
  const avis = avisDuPlafond(plafond, devis);
  if (avis) console.log(avis);
  // Le studio privé d'essai, comme lancer-agent.mts : clé Anthropic chiffrée depuis l'environnement.
  if (process.env.STUDIO_ANTHROPIC_KEY) {
    const { setSetting } = await import("../../src/lib/settings");
    setSetting("provider.anthropic.apiKey", process.env.STUDIO_ANTHROPIC_KEY.trim(), true);
  } else { console.error("STUDIO_ANTHROPIC_KEY absente : les noms ne peuvent pas être cherchés. Rien n'est lancé."); process.exit(1); }
  const sortie = path.resolve(sortieArg);
  try {
    const r = await essaiDesNoms({ sortie, plafondEuros: process.env.PLAFOND_ESSAI_EUR, client, reprendre: process.env.REPRENDRE === "1" });
    console.log(`${r.noms.length} nom(s) vérifié(s) proposé(s)${r.verifies ? "" : " (sans vérification sur le web, et c'est dit)"}, dépense comptée ${euros(r.depenseMicro)}. Rapport : ${path.join(sortie, "rapport.txt")}`);
    for (const n of r.noms) console.log(`${n.numero}. ${n.nom} — ${n.adresseDeLaPlanche.mention}`);
    if (r.arret) { console.log(`Arrêt : ${r.arret}`); if (r.arretPropre) console.log(r.arretPropre.join("\n")); process.exit(2); }
  } catch (e) { console.error((e as Error).message); process.exit(1); }
  process.exit(0);
}
