/**
 * ESSAI RÉEL DES PLANCHES DE MARQUE (studio privé d'essai, jamais déployé). Il n'utilise que les fonctions du Studio
 * déjà construites (planche-de-marque.ts et planche-de-marque-tache.ts : `valeursDuClient`, `plancheDeLaRoute`,
 * `vraisAppelsDeLaPlanche`) et s'arrête aux planches relues : ni choix, ni marque finie, ni site.
 *
 *  1. un compte et un projet fictifs pour le client inventé donné (aucun client par défaut) et sa fiche, écrite comme le
 *     Studio l'écrit (`ficheTexte`) avec ses produits réels ;
 *  2. le garde-fou de dépense de l'essai allumé avec PLAFOND_ESSAI_EUR (src/lib/ai/plafond-essai.ts) : un appel dont le
 *     maximum ferait dépasser ne part pas, et le script s'arrête en le disant (code de sortie 2) ;
 *  3. les valeurs du métier, un appel pour le client, avec leur contrôle gratuit (une réécriture au plus, à la charge du
 *     Studio) ;
 *  4. le domaine vérifié gratuitement avant le premier dessin, par la vérification du Studio (`findDomains`,
 *     brand-domains.ts : les annuaires RDAP de l'AFNIC et de Verisign), avec le nom et CLIENT_DESCRIPTEUR ;
 *  5. pour chaque logo fini donné (2 à 4) : la planche (le logo, puis la disposition), sa relecture en quatre bandes, et
 *     si elle est refusée la reprise unique avec ses raisons, à la charge du Studio. Refusée deux fois : elle n'est pas
 *     gardée, rien n'est tenté de plus.
 * Aucun appel n'est relancé tout seul : une panne arrête l'essai et est écrite comme telle.
 *
 * Le client : CLIENT_JSON (un fichier { nom, metier, kind, produits, descripteur }) ou CLIENT_NOM, CLIENT_METIER,
 * CLIENT_TYPE (« produits » ou « services »), CLIENT_PRODUITS (séparés par « ; »), CLIENT_DESCRIPTEUR ; rien d'autre.
 * Les logos : les logos finis gardés par l'essai de finalisation (esquisse-NN-logo-garde.png, sur fond blanc, pas la
 * version détourée), dans l'ordre des identités A, B, C, D.
 *
 * Ce qu'il écrit dans le dossier de sortie : fiche-du-client.txt ; valeurs-N-demande.txt, valeurs-N-reponse.json et
 * valeurs-du-metier.json ; domaine.json ; disposition-*.png ; pour chaque planche X et chaque essai N, le texte envoyé, la
 * planche brute (refusées comprises), le reçu, les quatre bandes données au relecteur, sa demande et son verdict complet
 * (avec les raisons du refus comptées par le code), puis planche-X-gardee.png si elle est gardée et planche-X-resultat.json
 * (le domaine, son statut, l'année, la disposition et le logo de la planche : à redonner à la planche en vrai) ;
 * enfin depense.json (appel par appel, réservé et réglé, client ou Studio), usage.json (le détail gardé par le Studio pour
 * chaque appel) et rapport.txt.
 *
 * Usage (depuis la racine du dépôt ; clé OpenAI injectée par le proxy de la session, clé Anthropic par
 * STUDIO_ANTHROPIC_KEY dans les réglages de l'environnement, jamais dans le code ni dans la commande) :
 *   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt DATA_DIR=data/essai-ecume/studio \
 *     CLIENT_JSON=scripts/syna-recette/clients/ecume.json PLAFOND_ESSAI_EUR=… \
 *     node_modules/.bin/tsx scripts/syna-recette/essai-planches.mts data/essai-ecume/3-planches \
 *     <dossier de la finalisation>/esquisse-NN-logo-garde.png <dossier de la finalisation>/esquisse-MM-logo-garde.png
 * Devis seul, sans aucun appel ni clé : DEVIS_SEULEMENT=1 DATA_DIR=… node_modules/.bin/tsx scripts/syna-recette/essai-planches.mts
 * (pour 2 et 3 planches ; avec des logos donnés, pour leur nombre).
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
  const { clientDeLEssai, devisDeLEssai, devisEnTexte, essaiDesPlanches, euros } = await import("./essai-planches-outil");

  const [sortieArg, ...logos] = process.argv.slice(2);
  if (devisSeul) {
    for (const n of logos.length ? [logos.length] : [2, 3]) console.log(`${devisEnTexte(await devisDeLEssai(n)).join("\n")}\n`);
    process.exit(0);
  }
  if (!sortieArg) { console.error("Dossier de sortie manquant (premier paramètre)."); process.exit(1); }
  if (logos.length < 2 || logos.length > 4) { console.error("Il faut les chemins de 2 à 4 logos finis (PNG), après le dossier de sortie."); process.exit(1); }
  if (!process.env.PLAFOND_ESSAI_EUR) { console.error("PLAFOND_ESSAI_EUR manquant (par exemple 1.20) : rien n'est lancé."); process.exit(1); }
  let client: ReturnType<typeof clientDeLEssai>;
  try { client = clientDeLEssai(process.env); } catch (e) { console.error((e as Error).message); process.exit(1); }
  for (const l of logos) if (/d[ée]tour/i.test(path.basename(l))) console.log(`Attention : ${l} semble être la version détourée ; le Studio joint le logo fini sur fond blanc.`);
  // Le studio privé d'essai, comme lancer-agent.mts : clé Anthropic (valeurs et relecteur) chiffrée depuis l'environnement.
  if (process.env.STUDIO_ANTHROPIC_KEY) {
    const { setSetting } = await import("../../src/lib/settings");
    setSetting("provider.anthropic.apiKey", process.env.STUDIO_ANTHROPIC_KEY.trim(), true);
  } else { console.error("STUDIO_ANTHROPIC_KEY absente : les valeurs et le relecteur ne peuvent pas être écrits. Rien n'est lancé."); process.exit(1); }

  const devis = await devisDeLEssai(logos.length);
  console.log(devisEnTexte(devis).join("\n"));
  const plafond = Math.floor(Number(process.env.PLAFOND_ESSAI_EUR.replace(",", ".")) * 1_000_000);
  if (plafond < devis.plafondMinimalMicro) console.log(`Attention : le plafond ${euros(plafond)} est sous le plafond minimal ${euros(devis.plafondMinimalMicro)} ; le garde-fou peut arrêter l'essai avant la fin (sans rien dépenser de plus).`);
  const sortie = path.resolve(sortieArg);
  const r = await essaiDesPlanches({ sortie, plafondEuros: process.env.PLAFOND_ESSAI_EUR, logos: logos.map((l) => path.resolve(l)), client });
  console.log(`${r.planches.filter((p) => p.gardee).length} planche(s) gardée(s) sur ${r.planches.length}, dépense comptée ${euros(r.depenseMicro)}. Rapport : ${path.join(sortie, "rapport.txt")}`);
  if (r.arret) { console.log(`Arrêt : ${r.arret}`); process.exit(2); }
  process.exit(0);
}
