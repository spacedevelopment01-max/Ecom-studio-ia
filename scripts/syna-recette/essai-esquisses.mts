/**
 * ESSAI RÉEL DES ESQUISSES DE LOGO, TRIÉES PAR LE RELECTEUR (studio privé d'essai, jamais déployé). La recherche est
 * exactement celle du parcours (logo-graphistes-tache.ts) : `ecrireLeMetier`, puis `uneRecherche` avec `vraisAppels`.
 * Ni finalisation, ni relecture de logo.
 *
 *  1. un compte et un projet fictifs pour le client inventé donné (client-de-l-essai.ts : CLIENT_JSON, ou CLIENT_NOM,
 *     CLIENT_METIER, CLIENT_TYPE, CLIENT_PRODUITS ; aucun client par défaut) ;
 *  2. le garde-fou de dépense de l'essai allumé avec PLAFOND_ESSAI_EUR (src/lib/ai/plafond-essai.ts) : un appel dont le
 *     maximum ferait dépasser ne part pas, et le script s'arrête en le disant ;
 *  3. le métier (contrôle compris) ; 4. les deux planches, la découpe gratuite, UN appel au relecteur ; une esquisse
 *     refusée n'est jamais montrée ; moins de 8 gardées : les deux planches refaites une fois, à la charge du Studio, avec
 *     « Évite ces pistes déjà présentées : … » ; la phrase sous le nom relevée pour chaque esquisse.
 * Aucun appel n'est relancé tout seul : une planche ou une relecture manquée est écrite comme manquée.
 *
 * Ce qu'il écrit dans le dossier de sortie : planche-<modèle>.png (et planche-reprise-<modèle>.png) ; esquisse-NN.png (les
 * gardées, numérotées comme le client les voit) ; planche-contact.png (les gardées) ; planche-contact-complete.png (toutes
 * les esquisses découpées, les écartées barrées « ÉCARTÉE » avec leur raison) ; ecartee-*.png ; esquisses.json (gardées
 * avec leur phrase, écartées avec leur raison : relu par l'essai de la finalisation) ; relecture-N-demande.txt et
 * relecture-N-verdict.json ; depense.json ; rapport.txt.
 *
 * Usage (depuis la racine du dépôt ; clés OpenAI injectées par le proxy de la session, clé Anthropic par
 * STUDIO_ANTHROPIC_KEY, jamais dans le code) :
 *   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt DATA_DIR=data/essai-ecume/studio \
 *     CLIENT_JSON=scripts/syna-recette/clients/ecume.json PLAFOND_ESSAI_EUR=… \
 *     node_modules/.bin/tsx scripts/syna-recette/essai-esquisses.mts data/essai-ecume/1-esquisses
 * Devis seul, sans aucun appel ni clé : DEVIS_SEULEMENT=1 DATA_DIR=… node_modules/.bin/tsx scripts/syna-recette/essai-esquisses.mts
 */
import fs from "node:fs";
import path from "node:path";

// Prépare le studio privé (clés, tarifs vérifiés), puis l'essai.
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
  const { clientDeLEssai, devisDesEsquisses, devisDesEsquissesEnTexte, essaiDesEsquisses, euros } = await import("./essai-esquisses-outil");
  if (devisSeul) { console.log(devisDesEsquissesEnTexte(await devisDesEsquisses()).join("\n")); process.exit(0); }

  const sortieArg = process.argv[2] ?? process.env.SORTIE;
  if (!sortieArg) { console.error("Dossier de sortie manquant (premier paramètre)."); process.exit(1); }
  if (!process.env.PLAFOND_ESSAI_EUR) { console.error("PLAFOND_ESSAI_EUR manquant (par exemple 0.60) : rien n'est lancé."); process.exit(1); }
  let client: ReturnType<typeof clientDeLEssai>;
  try { client = clientDeLEssai(process.env); } catch (e) { console.error((e as Error).message); process.exit(1); }
  // Le studio privé d'essai, comme lancer-agent.mts : clé Anthropic chiffrée depuis l'environnement.
  if (process.env.STUDIO_ANTHROPIC_KEY) {
    const { setSetting } = await import("../../src/lib/settings");
    setSetting("provider.anthropic.apiKey", process.env.STUDIO_ANTHROPIC_KEY.trim(), true);
  } else { console.error("STUDIO_ANTHROPIC_KEY absente : le métier ne peut pas être écrit. Rien n'est lancé."); process.exit(1); }
  const devis = await devisDesEsquisses();
  console.log(devisDesEsquissesEnTexte(devis).join("\n"));
  const plafond = Math.floor(Number(process.env.PLAFOND_ESSAI_EUR.replace(",", ".")) * 1_000_000);
  if (plafond < devis.plafondMinimalMicro) console.log(`Le plafond ${euros(plafond)} est sous la somme des maxima ${euros(devis.plafondMinimalMicro)} (probable ${euros(devis.probableMicro)}) : l'essai part quand même. Il s'arrête proprement avant tout appel dont le pire cas dépasserait ce qui reste, garde ses fichiers et dit ce qu'il faudrait pour finir.`);
  const sortie = path.resolve(sortieArg);
  // AUTRES_PISTES=<esquisses.json de la recherche d'avant> : « d'autres pistes », comme dans le Studio.
  const r = await essaiDesEsquisses({ sortie, plafondEuros: process.env.PLAFOND_ESSAI_EUR, client, ...(process.env.AUTRES_PISTES ? { autresPistes: path.resolve(process.env.AUTRES_PISTES) } : {}) });
  console.log(`${r.esquisses} esquisse(s) gardée(s) par le relecteur, ${r.ecartees.length} écartée(s)${r.reprise ? " (planches refaites une fois, à la charge du Studio)" : ""}, ${r.planches.length} planche(s), dépense comptée ${euros(r.depenseMicro)}. Rapport : ${path.join(sortie, "rapport.txt")}`);
  if (r.arret) { console.log(`Arrêt : ${r.arret}`); process.exit(2); }
  process.exit(0);
}
