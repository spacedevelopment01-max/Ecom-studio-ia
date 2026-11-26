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
 * Aucun appel n'est relancé tout seul. Chaque planche est indépendante (essai réel d'Écume, 25 novembre 2026 : l'échec de A
 * avait empêché B) : une planche qui s'arrête en erreur est écrite comme telle et la suivante part ; seul le garde-fou de
 * l'essai arrête tout. Une planche en erreur : code de sortie 2 à la fin.
 *
 * REPRENDRE UNE PLANCHE DÉJÀ PAYÉE (REPRENDRE_A=<dossier>, de même REPRENDRE_B, _C, _D) : le dossier contient son premier
 * essai, planche-A-1-brute.png (ou planche-A-1.png) et planche-A-1-relecture-verdict.json, avec domaine.json et, s'ils y
 * sont, planche-A-1-texte-envoye.txt et planche-A-1-recu.json (vérifiés : même texte, même logo). L'image et le verdict
 * deviennent le point de reprise du Studio : aucun appel n'est refait pour eux ; le code d'aujourd'hui recalcule les
 * raisons à partir du verdict (planche-A-1-relecture-verdict-recalcule.json) et seule la reprise unique part, à la charge
 * du Studio. Les valeurs du métier ne sont jamais refaites quand valeurs-du-metier.json est déjà dans le dossier de sortie.
 *
 * REJUGER UNE PLANCHE DÉJÀ PAYÉE, SANS AUCUN APPEL (REJUGER=<dossier de l'essai des planches>, REJUGER_PLANCHE=<lettre>,
 * REJUGER_ESSAI=<numéro> sinon le dernier) : son image et son verdict, déjà payés, sont relus par le code d'aujourd'hui
 * (`rejugerUnePlanche`, essai-planches-outil.ts). Aucune clé, aucun plafond, aucun réseau. Gardée : planche-X-gardee.png et
 * planche-X-resultat.json la disent gardée (l'ancien résultat est gardé à côté), le rapport le dit ; code de sortie 0.
 * Toujours refusée : code de sortie 2. Seul CLIENT_JSON (ou CLIENT_NOM…) est demandé, pour vérifier le client.
 *
 * Le client : CLIENT_JSON (un fichier { nom, metier, kind, produits, descripteur }) ou CLIENT_NOM, CLIENT_METIER,
 * CLIENT_TYPE (« produits » ou « services »), CLIENT_PRODUITS (séparés par « ; »), CLIENT_DESCRIPTEUR ; rien d'autre.
 * Les logos : les logos finis gardés par l'essai de finalisation (esquisse-NN-logo-garde.png, sur fond blanc, pas la
 * version détourée), dans l'ordre des identités A, B, C, D. La phrase de chaque logo est lue à côté de lui, dans
 * esquisse-NN-phrase-du-logo.txt (écrit par l'essai de finalisation ; vide : aucune) : elle est reprise mot pour mot sur sa
 * planche, toutes ses lignes dans l'ordre, et relue lettre pour lettre. Le fichier manque : rien n'est lancé.
 * Le plafond : PLAFOND_ESSAI_EUR sous le plafond minimal du devis (somme des maxima, reprises comprises) : rien n'est lancé.
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
 * (pour 2 et 3 planches ; avec le dossier de sortie et des logos donnés, pour leur nombre, en tenant compte des valeurs déjà
 * écrites et des REPRENDRE_X).
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
  const { clientDeLEssai, devisDeLEssai, devisEnTexte, essaiDesPlanches, euros, refusDuPlafond, rejugerUnePlanche } = await import("./essai-planches-outil");

  // Rejuger une planche déjà payée, sans aucun appel (ni clé, ni plafond, ni réseau) : REJUGER=<dossier>, REJUGER_PLANCHE=<lettre>.
  if (process.env.REJUGER?.trim()) {
    let client: ReturnType<typeof clientDeLEssai>;
    try { client = clientDeLEssai(process.env); } catch (e) { console.error((e as Error).message); process.exit(1); }
    const key = process.env.REJUGER_PLANCHE?.trim();
    if (!key) { console.error("REJUGER_PLANCHE manquant (la lettre de la planche à rejuger : A, B, C ou D) : rien n'est écrit."); process.exit(1); }
    const tour = process.env.REJUGER_ESSAI?.trim() ? Number(process.env.REJUGER_ESSAI) : undefined;
    try {
      const r = await rejugerUnePlanche({ dossier: process.env.REJUGER.trim(), key, client, ...(tour ? { tour } : {}) });
      console.log(`Planche ${r.key}, essai ${r.tour}, rejugée sans aucun appel : ${r.gardee ? `GARDÉE (note ${r.note}/10)` : `toujours refusée (${r.raisons.join(" ; ")})`}.`);
      if (r.finitions.length) console.log(`Petites finitions notées, sans refus : ${r.finitions.join(" ; ")}`);
      console.log(`Fichiers écrits dans ${r.dossier} : ${r.fichiers.join(", ")}`);
      process.exit(r.gardee ? 0 : 2);
    } catch (e) { console.error((e as Error).message); process.exit(1); }
  }

  const [sortieArg, ...logos] = process.argv.slice(2);
  // Les planches à reprendre à partir de leur premier essai déjà payé (REPRENDRE_A … REPRENDRE_D).
  const reprendre = Object.fromEntries((["A", "B", "C", "D"] as const).map((k) => [k, process.env[`REPRENDRE_${k}`]?.trim()]).filter(([, d]) => d)) as Record<string, string>;
  const KEYS = ["A", "B", "C", "D"];
  const optionsDuDevis = () => ({ valeursFaites: !!sortieArg && fs.existsSync(path.join(path.resolve(sortieArg), "valeurs-du-metier.json")), reprises: Object.keys(reprendre).map((k) => KEYS.indexOf(k) + 1) });
  if (devisSeul) {
    for (const n of logos.length ? [logos.length] : [2, 3]) console.log(`${devisEnTexte(await devisDeLEssai(n, logos.length ? optionsDuDevis() : {})).join("\n")}\n`);
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

  const devis = await devisDeLEssai(logos.length, optionsDuDevis());
  console.log(devisEnTexte(devis).join("\n"));
  const refus = refusDuPlafond(process.env.PLAFOND_ESSAI_EUR, devis);
  if (refus) { console.error(refus); process.exit(1); }
  const sortie = path.resolve(sortieArg);
  let r: Awaited<ReturnType<typeof essaiDesPlanches>>;
  try { r = await essaiDesPlanches({ sortie, plafondEuros: process.env.PLAFOND_ESSAI_EUR, logos: logos.map((l) => path.resolve(l)), client, reprendre }); } catch (e) { console.error((e as Error).message); process.exit(1); }
  console.log(`${r.planches.filter((p) => p.gardee).length} planche(s) gardée(s) sur ${r.planches.length}, dépense comptée ${euros(r.depenseMicro)}. Rapport : ${path.join(sortie, "rapport.txt")}`);
  for (const x of r.erreurs ?? []) console.log(`Planche en erreur : ${x}`);
  if (r.arret) { console.log(`Arrêt : ${r.arret}`); process.exit(2); }
  if (r.erreurs?.length) process.exit(2);
  process.exit(0);
}
