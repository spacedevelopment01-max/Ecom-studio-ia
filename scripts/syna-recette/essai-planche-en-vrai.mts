/**
 * ESSAI RÉEL DE LA PLANCHE EN VRAI (studio privé d'essai, jamais déployé). La planche de démonstration choisie par le client
 * est refaite à l'identique, en haute définition, uniquement par les fonctions du Studio (planche-en-vrai.ts,
 * planche-en-vrai-code.ts et planche-en-vrai-tache.ts : `plancheEnVrai` avec `vraisAppelsEnVrai`), comme la tâche de fond
 * le fait après le choix ; le réglage `sina.planche.envrai` est allumé dans la base de l'essai seulement.
 *
 *  1. un compte et un projet fictifs pour le client inventé donné (aucun client par défaut), SANS aucune photo de produit,
 *     la planche choisie et le logo fini donnés ;
 *  2. le garde-fou de dépense de l'essai allumé avec PLAFOND_ESSAI_EUR (src/lib/ai/plafond-essai.ts) : un appel dont le
 *     maximum ferait dépasser ne part pas, et le script s'arrête en le disant (code de sortie 2) ;
 *  3. la découpe des aperçus (gratuite), puis l'inventaire (un appel au relecteur le plus fort, avant toute retouche) ;
 *  4. les 17 retouches (une image chacune), les relectures par groupe (4), une reprise au plus, à la charge du Studio, avec
 *     ses raisons ; une image refusée deux fois n'a pas de fichier en haute définition et l'aperçu garde sa case ;
 *  5. les logos (10 versions, symbole, favicons), la palette et les polices, faits par le code ; puis l'assemblage en
 *     3072 × 4608 (gratuit).
 * Aucun appel n'est relancé tout seul : une panne arrête l'essai et est écrite comme telle.
 *
 * Le client : comme essai-planches.mts (CLIENT_JSON ou CLIENT_NOM, CLIENT_METIER, CLIENT_TYPE, CLIENT_PRODUITS), rien
 * d'autre. Les données de la planche choisie : RESULTAT_PLANCHE (planche-X-resultat.json de l'essai des planches : son
 * domaine, son statut, son année, sa disposition et l'empreinte de son logo, vérifiée), sinon DOMAINE, DOMAINE_STATUT,
 * ANNEE, DISPOSITION ; sans rien de tout cela, le domaine est vérifié par le Studio (`findDomains`, RDAP, gratuit). PHRASE :
 * la phrase que porte le logo (esquisse-NN-phrase-du-logo.txt de la finalisation), vide sans elle.
 *
 * Ce qu'il écrit dans le dossier de sortie : fiche-du-client.txt ; apercus/ (les aperçus découpés et cases.json) ;
 * inventaire-demande.txt, inventaire-logo-joint.png et inventaire-reponse.json ; cases/ (pour chaque case et chaque essai :
 * le texte envoyé, les images jointes dans l'ordre, l'image HD reçue, refusées comprises, son reçu ; puis l'image gardée) ;
 * relectures/ (demande et verdict de chaque groupe, avec les raisons comptées par le code) ; logos/ (les 10 versions, le
 * symbole, les favicons et l'avatar) ; palette.json ; polices.json (avec ce qui a été remplacé) ; planche-en-vrai.png
 * (3072 × 4608) ; etat.json ; essai.json (le client, les données, le projet : relu par l'écran) ; depense.json (appel par appel, client ou Studio, réservé et réglé) ; usage.json ; rapport.txt.
 *
 * Usage (depuis la racine du dépôt ; clé OpenAI injectée par le proxy de la session, clé Anthropic par
 * STUDIO_ANTHROPIC_KEY dans les réglages de l'environnement, jamais dans le code ni dans la commande) :
 *   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt DATA_DIR=data/essai-ecume/studio \
 *     CLIENT_JSON=scripts/syna-recette/clients/ecume.json RESULTAT_PLANCHE=data/essai-ecume/3-planches/planche-X-resultat.json \
 *     PHRASE="$(cat data/essai-ecume/2-finalisation/esquisse-NN-phrase-du-logo.txt)" PLAFOND_ESSAI_EUR=… \
 *     node_modules/.bin/tsx scripts/syna-recette/essai-planche-en-vrai.mts data/essai-ecume/4-planche-en-vrai \
 *     data/essai-ecume/3-planches/planche-X-gardee.png data/essai-ecume/2-finalisation/esquisse-NN-logo-garde.png
 * Devis seul, sans aucun appel ni clé : DEVIS_SEULEMENT=1 DATA_DIR=… node_modules/.bin/tsx scripts/syna-recette/essai-planche-en-vrai.mts
 *
 * LE RÉASSEMBLAGE D'UN ESSAI DÉJÀ FAIT (26 novembre 2026, `reassemblerLEssaiEnVrai`) : REASSEMBLER=<dossier de l'essai>
 * (essai.json, inventaire-reponse.json, apercus/, cases/, relectures/), puis le dossier de sortie, la planche choisie et le
 * logo fini. a) le code refait les logos, la palette, les polices, les textes et l'assemblage, gratuit ; b) chaque image
 * de l'essai est rejugée sur son verdict réel par le code d'aujourd'hui, gratuit ; c) avec REPRENDRE=<case>,<case> et
 * PLAFOND_ESSAI_EUR, les cases nommées encore refusées sont reprises une fois, à la charge du Studio (vrais appels).
 * Sans REPRENDRE, aucun appel ni clé. Devis de c), sans appel : DEVIS_SEULEMENT=1 REPRENDRE=… (même commande) ; avec
 * LOGO_HD=1, le devis compte aussi les quatre petites versions du logo en haute définition (option pas encore construite :
 * sans DEVIS_SEULEMENT, LOGO_HD=1 ne lance rien).
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
  const { clientDeLEssai, donneesVerifiees, devisDeLEssaiEnVrai, devisEnTexteEnVrai, essaiDeLaPlancheEnVrai, euros, logoDeLaPlancheVerifie } = await import("./essai-planche-en-vrai-outil");

  const reprendre = (process.env.REPRENDRE ?? "").split(",").map((x) => x.trim()).filter(Boolean) as import("../../src/lib/syna-agent/planche-en-vrai").NomElement[];
  const logoHd = process.env.LOGO_HD === "1";
  if (devisSeul && (process.env.REASSEMBLER || reprendre.length || logoHd)) { const { devisDuReassemblage } = await import("./essai-planche-en-vrai-outil"); console.log((await devisDuReassemblage(reprendre, { logoHd })).join("\n")); process.exit(0); }
  if (devisSeul) { console.log(devisEnTexteEnVrai(await devisDeLEssaiEnVrai()).join("\n")); process.exit(0); }
  if (logoHd) { console.error("LOGO_HD : les quatre petites versions du logo en haute définition ne sont pas encore construites ; rien n'est lancé (devis seul : DEVIS_SEULEMENT=1)."); process.exit(1); }
  if (process.env.REASSEMBLER) {
    const { reassemblerLEssaiEnVrai } = await import("./essai-planche-en-vrai-outil");
    const [sortie0, planche0, logo0] = process.argv.slice(2);
    if (!sortie0 || !planche0 || !logo0) { console.error("Il faut le dossier de sortie, la planche choisie (PNG) puis le logo fini (PNG)."); process.exit(1); }
    if (reprendre.length) {
      if (!process.env.PLAFOND_ESSAI_EUR) { console.error("PLAFOND_ESSAI_EUR manquant pour la reprise : rien n'est lancé."); process.exit(1); }
      if (!process.env.STUDIO_ANTHROPIC_KEY) { console.error("STUDIO_ANTHROPIC_KEY absente : la relecture de la reprise ne peut pas être faite. Rien n'est lancé."); process.exit(1); }
      const { setSetting } = await import("../../src/lib/settings");
      setSetting("provider.anthropic.apiKey", process.env.STUDIO_ANTHROPIC_KEY.trim(), true);
    }
    try {
      const r = await reassemblerLEssaiEnVrai({ dossier: path.resolve(process.env.REASSEMBLER), sortie: path.resolve(sortie0), planche: path.resolve(planche0), logo: path.resolve(logo0), reprendre, plafondEuros: process.env.PLAFOND_ESSAI_EUR });
      console.log(`${r.gardees} image(s) gardée(s) sur 17 ; planche réassemblée : ${path.join(path.resolve(sortie0), r.planche)} ; comparaison : ${path.join(path.resolve(sortie0), r.comparaison)}${r.reprise ? ` ; reprise : dépense comptée ${euros(r.reprise.depenseMicro)}` : ""}`);
      if (r.arret) { console.log(`Arrêt de la reprise : ${r.arret}`); process.exit(2); }
    } catch (e) { console.error((e as Error).message); process.exit(1); }
    process.exit(0);
  }
  const [sortieArg, planche, logo] = process.argv.slice(2);
  if (!sortieArg) { console.error("Dossier de sortie manquant (premier paramètre)."); process.exit(1); }
  if (!planche || !logo) { console.error("Il faut la planche choisie (PNG) puis le logo fini (PNG), après le dossier de sortie."); process.exit(1); }
  if (!process.env.PLAFOND_ESSAI_EUR) { console.error("PLAFOND_ESSAI_EUR manquant : rien n'est lancé."); process.exit(1); }
  let client: ReturnType<typeof clientDeLEssai>, donnees: Awaited<ReturnType<typeof donneesVerifiees>>["donnees"];
  try {
    client = clientDeLEssai(process.env);
    if (fs.existsSync(logo)) logoDeLaPlancheVerifie(process.env, fs.readFileSync(logo));
    const v = await donneesVerifiees(client, process.env);
    donnees = v.donnees;
    if (v.verifie) console.log(`Domaine vérifié par le Studio (findDomains, gratuit) : libres ${v.verifie.free.join(", ") || "aucun"} ; pris ${v.verifie.taken.join(", ") || "aucun"} ; à vérifier ${v.verifie.unknown.join(", ") || "aucun"}.`);
    console.log(`Données de la planche : domaine ${donnees.domaine ?? "à choisir"} (${donnees.statut}), année ${donnees.annee}, disposition ${donnees.disposition}, phrase ${donnees.phrase ? donnees.phrase.split(" / ").map((l) => `« ${l} »`).join(" puis ") : "aucune"}.`);
  } catch (e) { console.error((e as Error).message); process.exit(1); }
  if (/d[ée]tour/i.test(path.basename(logo))) console.log(`Attention : ${logo} semble être la version détourée ; le Studio prend le logo fini sur fond blanc et retire le fond lui-même.`);
  // Le studio privé d'essai, comme lancer-agent.mts : clé Anthropic (inventaire et relectures) chiffrée depuis l'environnement.
  if (process.env.STUDIO_ANTHROPIC_KEY) {
    const { setSetting } = await import("../../src/lib/settings");
    setSetting("provider.anthropic.apiKey", process.env.STUDIO_ANTHROPIC_KEY.trim(), true);
  } else { console.error("STUDIO_ANTHROPIC_KEY absente : l'inventaire et les relectures ne peuvent pas être faits. Rien n'est lancé."); process.exit(1); }

  const devis = await devisDeLEssaiEnVrai();
  console.log(devisEnTexteEnVrai(devis).join("\n"));
  const plafond = Math.floor(Number(process.env.PLAFOND_ESSAI_EUR.replace(",", ".")) * 1_000_000);
  if (plafond < devis.plafondMinimalMicro) console.log(`Attention : le plafond ${euros(plafond)} est sous le plafond minimal ${euros(devis.plafondMinimalMicro)} ; le garde-fou peut arrêter l'essai avant la fin (sans rien dépenser de plus).`);
  const sortie = path.resolve(sortieArg);
  const r = await essaiDeLaPlancheEnVrai({ sortie, plafondEuros: process.env.PLAFOND_ESSAI_EUR, planche: path.resolve(planche), logo: path.resolve(logo), client, donnees });
  console.log(`${r.cases.filter((c) => c.gardee).length} image(s) gardée(s) sur 17, planche ${r.planche ? `${r.planche.w} × ${r.planche.h}` : "non assemblée"}, dépense comptée ${euros(r.depenseMicro)}. Rapport : ${path.join(sortie, "rapport.txt")}`);
  if (r.projectId) console.log(`Projet de l'essai : ${r.projectId} (essai.json et etat.json dans ${sortie}, pour ecran-planche-en-vrai.mts).`);
  if (r.arret) { console.log(`Arrêt : ${r.arret}`); process.exit(2); }
  process.exit(0);
}
