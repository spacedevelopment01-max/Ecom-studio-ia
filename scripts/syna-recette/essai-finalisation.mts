/**
 * ESSAI RÉEL DE LA FINALISATION DE DEUX ESQUISSES (studio privé d'essai, jamais déployé). Il n'utilise que les fonctions
 * de SINA déjà construites (`vraisAppels`, `uneFinalisation`, logo-finalisation.ts) et s'arrête au logo fini relu : ni
 * planche de marque, ni couleurs au-delà de celles que `uneFinalisation` tire du logo, gratuitement.
 *
 *  1. un compte et un projet fictifs : le client « Racine », pépiniériste qui vend des plantes en ligne (nom gardé,
 *     type « produits »), comme l'essai des esquisses ;
 *  2. le garde-fou de dépense de l'essai allumé avec PLAFOND_ESSAI_EUR (src/lib/ai/plafond-essai.ts) : un appel dont le
 *     maximum ferait dépasser ne part pas, et le script s'arrête en le disant (code de sortie 2) ;
 *  3. pour chaque esquisse, telle quelle : le texte de finalisation (GPT-6.2 Astra, contrôle gratuit, une réécriture au
 *     plus à la charge du Studio), le logo fini dessiné à partir de l'esquisse (GPT Image 2.6 Sunburst), la relecture
 *     (cinq raisons, note de 8), et si le logo est refusé la reprise unique avec toutes ses raisons, à la charge du
 *     Studio. Refusé deux fois : il n'est pas gardé, rien n'est tenté de plus.
 * Aucun appel n'est relancé tout seul : une panne arrête l'essai et est écrite comme telle.
 *
 * Le métier : la phrase de l'essai des esquisses, lue dans son rapport (RAPPORT_ESQUISSES), sinon METIER_ESSAI. Jamais
 * réécrite par un appel.
 *
 * Ce qu'il écrit dans le dossier de sortie : pour chaque esquisse NN, la consigne du rédacteur, ses réponses, le texte
 * envoyé au dessinateur à chaque essai, les logos bruts (refusés compris) et détourés, le reçu de chaque image (usage,
 * qualité, taille, fond, format renvoyés), la demande au relecteur et son verdict complet ; puis depense.json (appel par
 * appel, réservé et réglé), usage.json (le détail gardé par le Studio pour chaque appel) et rapport.txt.
 *
 * Usage (depuis la racine du dépôt ; clés OpenAI injectées par le proxy de la session, clé Anthropic par
 * STUDIO_ANTHROPIC_KEY, jamais dans le code) :
 *   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt DATA_DIR=work/essai-finalisation \
 *     PLAFOND_ESSAI_EUR=2.20 RAPPORT_ESQUISSES=docs/studio/essais-complets/images/racine/rapport.txt \
 *     node_modules/.bin/tsx scripts/syna-recette/essai-finalisation.mts work/essai-finalisation/sortie \
 *     docs/studio/essais-complets/images/racine/esquisse-04.png docs/studio/essais-complets/images/racine/esquisse-11.png
 * Devis seul, sans aucun appel ni clé : DEVIS_SEULEMENT=1 DATA_DIR=… node_modules/.bin/tsx scripts/syna-recette/essai-finalisation.mts
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
  const { devisDeLEssai, devisEnTexte, essaiDeFinalisation, euros, metierDeLEssai, numeroDe } = await import("./essai-finalisation-outil");

  const [sortieArg, ...esquisses] = process.argv.slice(2);
  if (devisSeul) {
    const numeros = esquisses.length ? esquisses.map(numeroDe) : [4, 11];
    console.log(devisEnTexte(await devisDeLEssai(numeros)).join("\n"));
    process.exit(0);
  }
  if (!sortieArg) { console.error("Dossier de sortie manquant (premier paramètre)."); process.exit(1); }
  if (esquisses.length !== 2) { console.error("Il faut les chemins des deux esquisses choisies (esquisse-04.png et esquisse-11.png), après le dossier de sortie."); process.exit(1); }
  if (!process.env.PLAFOND_ESSAI_EUR) { console.error("PLAFOND_ESSAI_EUR manquant (par exemple 2.20) : rien n'est lancé."); process.exit(1); }
  let metier: string;
  try { metier = metierDeLEssai({ rapport: process.env.RAPPORT_ESQUISSES, metier: process.env.METIER_ESSAI }); } catch (e) { console.error((e as Error).message); process.exit(1); }
  // Le studio privé d'essai, comme lancer-agent.mts : clé Anthropic (le relecteur) chiffrée depuis l'environnement.
  if (process.env.STUDIO_ANTHROPIC_KEY) {
    const { setSetting } = await import("../../src/lib/settings");
    setSetting("provider.anthropic.apiKey", process.env.STUDIO_ANTHROPIC_KEY.trim(), true);
  } else { console.error("STUDIO_ANTHROPIC_KEY absente : le relecteur ne peut pas relire. Rien n'est lancé."); process.exit(1); }

  const devis = await devisDeLEssai(esquisses.map(numeroDe));
  console.log(devisEnTexte(devis).join("\n"));
  const plafond = Math.floor(Number(process.env.PLAFOND_ESSAI_EUR.replace(",", ".")) * 1_000_000);
  if (plafond < devis.plafondMinimalMicro) console.log(`Attention : le plafond ${euros(plafond)} est sous le plafond minimal ${euros(devis.plafondMinimalMicro)} ; le garde-fou peut arrêter l'essai avant la fin (sans rien dépenser de plus).`);
  const sortie = path.resolve(sortieArg);
  const r = await essaiDeFinalisation({ sortie, plafondEuros: process.env.PLAFOND_ESSAI_EUR, esquisses: esquisses.map((e) => path.resolve(e)), metier });
  console.log(`${r.logos.filter((l) => l.ok).length} logo(s) gardé(s) sur ${r.logos.length}, dépense comptée ${euros(r.depenseMicro)}. Rapport : ${path.join(sortie, "rapport.txt")}`);
  if (r.arret) { console.log(`Arrêt : ${r.arret}`); process.exit(2); }
  process.exit(0);
}
