# Issue 154 — intégration et adaptation client

Livraison pour vérification dans la [PR #156](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/156), branche `codex/154-integration-adaptation-client`. **Aucune fusion dans main, aucun déploiement, aucun appel fournisseur réel.**

Code applicatif compilé et ouvert dans Chromium : **`393dc83555193855d8803d08ca28dcfa825296dc`** ; `/api/version` renvoie ce SHA avec `source: compiled-build`. Les commits de réception suivants ajoutent les preuves et isolent le proxy du banc navigateur, sans changer le code applicatif. Le studio du client n'a pas été mis à jour ; cette réception utilise uniquement un serveur local et des comptes fictifs.

## Intégration préservée

Les livraisons complètes suivantes sont des ancêtres de la branche, pas des copies de leurs seuls rapports :

| PR | Tête intégrée |
|---|---|
| #146 | `656e9a4f05f9d402d84faf270dd2bf07c0fce72b` |
| #147 | `e9b20a99add6711905bec8a78f05e4a40c628fa6` |
| #149 | `f0084332c78accc1ea26f814f82181bb3dec1cc6` |
| #151 | `d8114155436d16fb0950e8dcc920fc4b298c9783` |
| #153 | `5eb672f9d3c70a3b025a4abd0f5353955ba5d62e` |

#153 contient #147/#149. Les conflits de droits, worker, assemblage et galerie ont été réconciliés avec #146/#151. Le commit d'intégration `979f7e33e3689d499d194123e19b214c6c51a762` conserve ces ascendances et main `d97e0b9577128eeb39b403dae281da6bd835fc65`. Aucune branche de Claude n'est modifiée. Les fichiers artistiques de `theme-base/` et les sept compositions de référence restent ceux de #153 ; aucune correction CSS de la barre mobile n'a été jugée nécessaire.

## Demande → changement → preuve

Toutes les conclusions ci-dessous sont **CONFIRMÉES DANS LE CODE** ; les reproductions indiquées sont réalisées avec données isolées et fournisseurs simulés, sans authentification de fournisseur.

| Demande / cause corrigée | Implémentation | Vérification |
|---|---|---|
| La première création utilisait encore l'ancienne grille ; visite originale avant choix | `tab-boutique.tsx` ouvre la même `ThemeGallery` que l'éditeur, navigation de la démo complète, choix explicite seulement | Navigateur compilé : 8 pages proposées, zéro version/tâche/appel pendant la visite ; puis véritable route de choix, worker natif et version client enregistrée. [Parcours](../../reports/issue154/preuves/parcours-initial.json) |
| Les réglages de composition pouvaient être perdus ou remplacés par les valeurs de bibliothèque | `reference-shapes.json`, `composeShop(..., clientAdaptation)`, `client-adaptation.ts`, `client-copy.ts` : structure, ordre, proportions et réglages visuels de référence, y compris en-tête, pied de page et réglages globaux artistiques ; textes traités séparément | Sept profils adaptés ; régressions des démos originales ; captures client/référence et tests `mission154-adaptation` |
| Images distribuées sans garantir rôle, origine et disponibilité ; logos dérivés confondus avec des photos | `client-media.ts` : inventaire scoped, décodage Sharp/ffmpeg, provenance, sujets, rôles, orientation, focal, exclusion des logos/brandboards, personnes non autorisées, stocks produit et réalisations générées | Médias fictifs réellement décodables, fichiers corrompus/étrangers refusés, médias complets et incomplets ; zéro emplacement média manquant sur les sept cas complets |
| Les images acquises lors de la préparation pouvaient être exclues à cause de leur `slot` | Seuls les emplacements réservés `theme:` imposent un placement exact ; réutilisation normale des acquisitions de préparation | Moteur image natif simulé : une acquisition, utilisation dans le thème sans nouvelle génération (`mission154-parcours`) |
| Trous de contenu masqués / faux faits de démo | Plan persistant par page/section/emplacement ; sections conservées et besoins explicites ; aucun faux avis, comparatif, mesure, presse ou fabrication ; portfolio authentique requis | [Matrice de contenu](../../reports/issue154/preuves/content-matrix.json), cas incomplet et contrôles de contenu. Une section sans preuve n'est pas annoncée comme livrée |
| Rédaction mal raccordée aux schémas : timeline, marquee, À propos, pages de guide et légendes | `client-copy.ts` utilise les vrais champs `step` / `items`, les textes acquis par intention et les faits confirmés ; CTA acquis conservés ; pas de légende de média écrasant un titre de méthode | Parcours produit et service, nouveaux cas tablier et réglage de violon ; titres/pages/SEO et absence de faits de démo vérifiés |
| Adaptation assimilée à tort à une livraison finale | `shop.ts`, jobs, `JobProgress` : phases réelles, livraison `partial` ou `to_verify`, progression partielle <100 % ; erreurs média et droits restent bloquants | Double clic, version idempotente, pipeline partiel, refus média/budget et preuves navigateur de l'éditeur partiel |
| Réparation ou reprise écrasant une retouche / réintroduisant un fichier invalide | `adaptation-preservation.ts`, `verifyAdaptationFiles` : versions, pages/SEO, réglages, menus et retouches préservés ; contrôle au chargement et avant export | [Reprise](../../reports/issue154/preuves/reprise-engine.json), retouche via route native puis nouveau contexte navigateur ; corruption et perte fichier testées |
| Reprise SEO remettant des pages générées anciennes et vides par-dessus les pages corrigées | `seo-v2/theme-delivery.ts` réconcilie les pages de référence ; `shop.ts` conserve une composition automatique intacte dans le contrôle interne pour réappliquer les véritables retouches, même après plusieurs reprises | **REPRODUIT** sur neuf pages du jeu de réception historique ([avant](../../reports/issue154/preuves/reprise-pages-avant.json)) ; test de deux reconstructions avec titre et SEO client inchangés ; toutes les pages, y compris légales et brouillons, contrôlées après correction |
| Générations manquantes déclenchées hors devis ou sur mauvais contexte | `placement-request.ts`, routes préparation/images/banque vidéo et producteurs : version/contexte/compte/références décodées vérifiés avant devis ; moteurs et consentements existants | Contexte périmé 409, autre compte 404, référence corrompue refusée avant dépense ; devis et budget natifs conservés ; zéro appel réel |
| Réparation de bibliothèque et droits en conflit entre livraisons | `plan-access.ts`, routes et worker réconciliés : réparation bornée de mauvaise famille possible, autres droits maintenus ; contrôle répété à l'exécution | Matrice trois forfaits, baisse après mise en file, publicité directe hors forfait refusée ; protections financières inchangées |
| Horizon social refusant un calendrier de la durée pourtant annoncée | `social-v2/engine.ts` limite les jours complets proposés à l'horizon existant, explique le nombre réellement possible ; aucun relèvement du plafond | Paris/Kiritimati et bornes réelles de chaque créneau ; réparation intégrée avec #146/#151 |
| Export affiché disponible avec média absent/corrompu | `cms-v2/export.ts` / `record.ts` recontrôlent les fichiers actuels ; manifest `adaptation-client.json` ; refus 422 documenté sans suppression des acquis | Fichiers ZIP réels sur cinq plateformes, téléchargements natifs sur trois, décodage des images/vidéos embarquées ; limites CMS ci-dessous |
| Barre d'achat mobile possiblement obstructive | Inspection réelle de NOCTIL/TRAVERSE à 360/390/430, haut/achat/détails/menu/focus/footer | 36 viewports : aucun débordement ; barre masquée menu/footer et viewport réduit avec champ ciblé. Voir [mesures](../../reports/issue154/preuves/barre-mobile.json) et captures ; pas de changement artistique |

## Réception fonctionnelle et visuelle

La charte fictive comprend le logo fourni et sa variante claire locale, sans altérer le fichier original. Les réglages commerciaux du panier sont exclus de l’extraction artistique. Les images client sont des **illustrations de test produites localement**, avec variantes de cadrage et véritables JPEG/MP4. Elles prouvent le cheminement et le rendu de fichiers distincts, **pas une qualité photographique ou créative de fournisseur**. Les scènes de portfolio du service sont des fixtures déclarées authentiques dans ce projet fictif uniquement ; les scènes générées ne sont pas acceptées comme portfolio en production.

| Cas isolé | Couverture média | État honnête attendu |
|---|---|---|
| Céramor / théière, FRAISE et ONDE | 30 fichiers par profil, 39 / 35 emplacements couverts, clips inclus | Partiel : avis/comparatifs/mesures/mentions et positions de hotspots réellement absents |
| Céramor / théière, ORBE et NOCTIL | 26 / 29 fichiers, 7 / 16 emplacements couverts | Enregistré, contrôle visuel à faire (`to_verify`), pas « final » |
| Terre & Geste / ateliers individuels sur RDV, RIVE | 13 fichiers, 11 emplacements couverts | Partiel : avis authentique et informations légales à fournir ; navigation prestations/contact, sans produit forcé |
| Céramor, SILLON et TRAVERSE | 29 fichiers chacun, 23 / 19 emplacements couverts | Partiel : positions de hotspots et consentement newsletter non fournis |
| Matière Minute, TRAVERSE incomplet | 3 fichiers, 17 emplacements manquants | Partiel visible, 17 demandes d'images préparées, aucune génération déclenchée |
| Atelier Safran, nouveau projet ORBE | Visite originale → choix → worker → sauvegarde → éditeur → 3 exports | Aucun appel IA ; statut provisoire conservé |
| Pli / tablier en lin ; Accord / réglage de violon | Cas supplémentaires unitaires, données distinctes des démos et des cas visuels | Règles générales, aucun nom de projet utilisé pour décider l'adaptation |

Les trois forfaits sont contrôlés dans `mission150-forfaits`, `mission150-api` et `isolation-forfait-familles` : specialty FRAISE/ONDE/SILLON/NOCTIL/TRAVERSE à 1/3/5 ; autres familles seulement ORBE/RIVE effectivement livrés. Fonctions 8/12/20, pages et IA de section, vidéos, publicité, blog, calendrier et RDV restent centralisés. La baisse préserve les acquis et ne recrée pas le droit au RDV initial. Les contrôles financiers et Stripe ne sont pas modifiés par l'adaptation.

## Commandes exécutées et preuves

Répertoire de travail dédié, PHP 8.3 local pour les moteurs exportés. Les scripts de réception refusent un `DATA_DIR` hors préfixe de test ; transport fournisseur bloqué et Chromium limité au serveur local. Ne pas les exécuter sur des données clients.

- `npm run typecheck` : réussi, [journal](../../reports/issue154/logs/mission154-types-final.txt).
- `npm run build` : réussi sur `393dc835`, [journal](../../reports/issue154/logs/mission154-build-final.txt). Limite mémoire 2048 Mo et cache webpack désactivé pour cet environnement partagé, sans désactiver compilation ni validation. Les premiers essais interrompus par manque de mémoire ne sont pas comptés comme réussites.
- `npx vitest run --no-file-parallelism` avec les onze fichiers de la réception finale : **140 tests réussis, 11 fichiers**, [journal](../../reports/issue154/logs/mission154-targets-final.txt). Fichiers : `mission154-{adaptation,parcours,livraison}`, `mission150-{api,forfaits}`, `theme-demos`, `isolation-forfait-familles`, `mission142-{blocages-transversaux,livraison-images,livraison-logo-video}`, `social-v2` (suffixe `.test.ts`).
- `JOBS=1 scripts/verify-theme.sh --rapide` : **25 cas réussis, zéro erreur**, [journal](../../reports/issue154/logs/mission154-themecheck-final.txt). Les avertissements non bloquants restent dans le journal. Les anciens thèmes sont couverts en régression technique, sans réactivation dans la galerie.
- `node --import tsx scripts/mission154/{prepare-proof,complete-proof-media,complete-proof-identity,refresh-proof,proof-summary}.ts` : préparation et reprise isolées. Ne pas relancer la préparation sur un jeu existant.
- `node --import tsx scripts/mission154/flow-harness.ts prepare`, puis `flow-browser.ts` : parcours initial complet dans le studio compilé, worker limité au projet fictif et au seul type `shop.direction`.
- `node --import tsx scripts/mission154/{browser-proof,service-pages-proof,inspect-proof,sticky-proof}.ts` : Chromium, scroll, images décodées, retouche, nouvelle session et vidéos réelles d'interaction.
- `THEME_FILTER=<profil> node --import tsx scripts/mission154/export-proof.ts`, séparément pour chacun des sept profils : **35 ZIP**, sept Theme Check Shopify sans erreur, rendu PHP WooCommerce, HTML/CSS/JS exportés PrestaShop. **186 fichiers affectés aux sept profils et contrôlés dans chaque plateforme** (930 décodages, répétitions comprises), pas 910 créations. [Détails et empreintes des ZIP](../../reports/issue154/preuves/exports.json).
- État CI à la publication initiale des preuves : en cours. [État de réception actualisé sans modifier le code](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/156#issuecomment-6304815709). [CI du code testé](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/39520304199) et [contrôles du dernier commit de PR](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/156/checks).

Les premières suites de diagnostic local, exécutées pendant des changements ou interrompues pour corriger un écart, ne constituent pas une suite finale verte.

Réception finale : **93 contrôles navigateur sans erreur JavaScript, 115 captures et 5 vidéos MP4** ; tous les H1 des pages client contrôlées sont présents, y compris les pages légales et brouillons. **0 appel fournisseur IA réel et 0 € de coût IA réel**. Le [manifeste des pièces](../../reports/issue154/manifest.json) permet de contrôler leurs empreintes. Les signatures d'aperçu, sessions et secret du banc de test ont été recherchés dans les fichiers et les ZIP avant publication : aucun exporté.

## Exports et limites de réception

| Plateforme | Vérifié | Reste à vérifier |
|---|---|---|
| Shopify | ZIP natif, adaptation, médias décodés et Theme Check officiel ; aperçu natif et panier simulé | Installation réelle, checkout/paiement, médias hébergés par Shopify, vente réelle |
| WooCommerce | ZIP natif, moteur PHP livré, ses CSS/JS dans Chromium mobile, médias et interactions locales | Installation WordPress/Woo réelle, extensions, paiement/stock/mail et données serveur |
| PrestaShop | ZIP natif, rendu HTML et scripts/CSS réellement exportés, médias et interactions locales | Installation PrestaShop réelle, modules et tunnel de paiement |
| Wix / Squarespace | Paquets existants préservés, export et décodage des fichiers | Montage effectif dans leurs éditeurs ; pas de promesse d'import natif complet ni de paiement vérifié |

Les exports restent provisoires lorsque la vérification commerciale/visuelle n'est pas acquise ; télécharger un ZIP ne certifie ni un site final ni un CMS installé. Aucun achat, RDV, email commercial ou publication sociale réel n'a été exécuté.

**Limites explicites :** les kits photographiques originaux FRAISE et ONDE (9 fichiers chacun) ne sont pas présents dans les ressources accessibles. Leurs schémas et le rendu client sont vérifiés, mais une comparaison photographique originale complète de ces deux démos est bloquée. Les cinq autres références originales sont comparées dans les captures. ORBE et RIVE utilisent les kits privés déjà fournis, hors dépôt conformément à `tests/demo-fixtures.ts` ; leur cache complet doit être préparé sur l’hébergement avec ces kits. Ils ne sont pas ajoutés au dépôt, et le démarrage Docker seul ne prouve pas la disponibilité des démos privées. Le clavier mobile est simulé par focus/réduction du viewport ; Safari/iOS et Android physiques restent à vérifier. Aucun appel IA réel : fidélité photoréaliste, qualité créative et authentification fournisseur non certifiées. L'analyse d'image utilise la provenance, le rôle, les métadonnées et les validations acquises ; elle ne remplace pas une nouvelle inspection visuelle IA de chaque photo inconnue. Les faits manquants restent à recueillir auprès du client. [Liste précise des 18 vues originales absentes](../../reports/issue154/preuves/kits-manquants.json).

Voir la [galerie de preuves, vidéos et ZIP téléchargeables](../../reports/issue154/README.md). La livraison est préparée et testée pour revue ; elle n'est ni fusionnée ni servie dans le Codespace client. Aucune refonte artistique supplémentaire proposée à Claude.
