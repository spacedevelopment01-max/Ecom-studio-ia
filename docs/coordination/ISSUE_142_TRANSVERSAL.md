# Issue 142 — audit transversal des blocages et reprise des créations

Complément de mission lu : [#6290494641](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/142#issuecomment-6290494641), 20 octobre 2026. Livraison sur **PR #146**, branche `codex/142-budgets-suivi-reprise`. Aucun merge, déploiement, modification du Codespace, nouvelle connexion, appel fournisseur réel ou modification de données client.

## Version et portée

- Départ distant vérifié : `cddbcbddbe492d54ce6ec859c758d6d3bb977376`, arbre propre.
- Collecte unique ciblée v5 : `1b93022b123c1555e9d91f48a6e58f8ca1098ff7`, téléchargement comparé au fichier publié, 28 tests isolés.
- Corrections principales : `a2b991f54c44fb8044b0d064ecdbe5bcebdcb9d3`, arbre `01f21a3c128c4837dfe6d83e0f1db945aa3816f0`.
- Code final construit et vérifié : **d6777986cee8997ad5f1614c52f604bc32da395f**. Le commit a01c5dd640ae9cbc8e35cbf498e2c620ea7da6fc renforce le reçu vidéo en cas d'échec de stockage et la persistance des codes métier ; d6777986 corrige le débordement des boutons sur mobile. Le pilote navigateur renforcé est livré dans le commit de preuves, sans changement ultérieur de src/.
- Dernière version réellement servie remontée par la collecte privée : **`d97e0b9577128eeb39b403dae281da6bd835fc65`**. La livraison de cette PR ne met pas ce studio à jour. Intégration et vérification de la version servie réservées à Claude.

Les fournisseurs sont **simulés** dans les tests et recettes. Les fichiers, routes, authentification, base, moteur, checkpoints, réservations/décomptes synthétiques, navigateur et téléchargements restent natifs. Une compilation, un fichier valide et une relecture simulée ne certifient pas la qualité créative ni l'authentification d'un fournisseur réel.

## Incident existant : ce qui est établi

**OBSERVÉ DANS LES JOURNAUX privés**, puis **CONFIRMÉ DANS LE CODE** : la tâche reste en échec à 15 %, sans résultat image. La collecte v4 avait attribué son origine à `COPY_FACTS_REJECTED`, et non à un garde budgétaire. Les empreintes concordent avec la version servie : `social-v2/ai-post.ts` ligne 630 et `engine/ai-post-image.ts` ligne 213, au commit `d97e0b95`.

Une **seule collecte ciblée supplémentaire**, en lecture seule, a retrouvé le reçu exact de rédaction lié à l'appel réussi du même projet/de la même tâche. Elle renvoie les champs et des booléens fermés, jamais leur texte, nombre commercial, nom, identifiant ou configuration :

| Champ | Ancien garde | Règle identifiée |
| --- | --- | --- |
| `headline` | Accepté | Aucun déclencheur |
| `subline` | Refusé | Nombre commercial non retrouvé dans les faits confirmés du sujet ni dans sa demande |
| `cta` | Accepté | Aucun déclencheur signalé |

Le reçu précède l'échec ; le projet n'a pas été modifié depuis. **Limite :** la collecte compare aux sources autorisées par ce garde historique, pas à toutes les informations possibles du client. Elle ne prouve ni une invention volontaire, ni l'absence d'une information située ailleurs, ni l'état historique du portefeuille. Le prix saisi d'une prestation, par exemple, était ignoré par ce contrôle ; ce défaut général est traité et testé séparément sans l'attribuer arbitrairement à l'incident.

La conséquence injustifiée démontrée est le **cul-de-sac du parcours** : un passage facultatif refusé empêche de récupérer le travail acquis, sans correction locale disponible ; un nouvel essai peut simplement relire le même échec. La correction conserve le refus de l'assertion non étayée, rend le passage accessible au propriétaire, propose son retrait, puis attend sa validation pour reprendre l'image. **Aucune tâche client n'a été réparée ou relancée pendant cet audit.** Aucun texte privé ni coût client n'est joint à cette livraison.

## Causes corrigées et preuves

| Priorité et conclusion | Cause et conséquence | Correction et fichiers | Preuve |
| --- | --- | --- | --- |
| P1 — **REPRODUIT** : rédaction achetée avant indisponibilité connue de l'image | `maxMicro`/compatibilité et mise en page contrôlés après `copy`; une demande impossible peut consommer une rédaction avant l'arrêt | `social-v2/ai-post.ts`, `designSinglePostWithAi` : modèles/références essentielles, mode, coût du premier rendu et contrôles vérifiés avant la rédaction et avant le reçu pending | Comparaison exécutée du code historique : 1 appel texte simulé avant, 0 après. Absence de reçu pending et reprise possible une fois le prérequis corrigé |
| P1 — **REPRODUIT** : rédaction acquise sans voie de correction | Le garde refuse un champ, l'enveloppe `ctx.step('ai-post')` conserve le résultat nul et l'interface propose de recommencer | Nouveau `publication-copy-recovery.ts`, route `images/copy-review`, composant `copy-correction.tsx` ; passage, motif et proposition visibles. Sauvegarde gratuite, original/scene/concept/stratégie conservés. Reprise explicite de la même tâche, devis/droits revérifiés, seul wrapper en échec rouvert | API/native produit/service : refus sous-ligne → sauvegarde → lecture persistée → reprise → fichier décodé ; copy appelée une seule fois. Cas historique sans nouveau format de checkpoint couvert |
| P1 — **REPRODUIT** : mot-clé pris pour une preuve commerciale | « Votre avis compte », « de meilleurs moments » et un nom de marque validé contenant le mot surveillé échouent | `publication-copy-policy.ts` : reconnaissance de segments neutres précis et des noms fournis. Les autres assertions de la phrase sont toujours contrôlées | Comparaison avant/après historique : 3 refus avant, 3 acceptations après ; remises, garantie/classement/étoiles non étayés restent refusés |
| P1 — **CONFIRMÉ DANS LE CODE / REPRODUIT** : demande d'opinion assimilée à un témoignage, y compris vidéo | `creative-contract` requiert une citation autorisée dès le mot « avis » ; `scriptIssues` rejette aussi les questions d'opinion | `creative-contract.ts`, `video-v2/script.ts` et `engine.ts` : même distinction de langage, noms contextuels transmis. Les blocs de citation et témoignages restent protégés | Plans natifs produit/service conservant « Donnez votre avis » sans réécriture ; faux témoignage et « 98 % de clients satisfaits » refusés |
| P1 — **REPRODUIT** : refus avant envoi transformé en résultat incertain | Le reçu `pending` est créé avant une réservation ; même un refus budgétaire garanti avant envoi rend ensuite la reprise impossible | `billing.ts`, `ai/access.ts` : type `UnsentBudgetError`; `publication-recipe.ts` : `not_sent` uniquement pour ce type/`CostCapReached`, tâche connue et tables natives d'appels/réservations/usages inchangées. Claim atomique à la reprise | Budget synthétique engagé → 0 envoi → libération de l'engagement → reprise explicite réussie → résultat réutilisé. Si un appel est déjà enregistré avant le refus suivant, le reçu reste pending et le renvoi est interdit |
| P1 — **REPRODUIT** : échec d'écriture du reçu initial vidéo crée un blocage durable | Une création exclusive peut laisser un JSON vide/tronqué avant `produce`; lecture suivante en erreur de parsing, aucun chemin de reprise justifié | `video-v2/receipts.ts` : fd exclusif, écriture/fsync avant `produce`. Seul le claim créé par ce processus est retiré s'il échoue avant envoi. Les anciens reçus illisibles restent conservés ; les fichiers reçus restent prioritaires. Fichiers temporaires atomiques propres nettoyés | ENOSPC injecté : 0 appel, reprise réussie une seule fois après retour du stockage. Ancien JSON tronqué : octets inchangés et 0 appel. Cas découvert pendant la saturation du disque de tests ; pas présenté comme incident client |
| P1 — **REPRODUIT** : contrôle commercial incomplet selon l'écriture du montant | Ancien nettoyage surveille €/$ mais peut laisser passer EUR/USD. Un séparateur de milliers peut être lu comme le seul suffixe du montant | `publication-copy-policy.ts`, `cleanAiCopy` : même analyse pour symboles/codes, espaces ordinaires/insécables/fins et décimales ; nombre confirmé ET demandé toujours exigé | Code historique accepte EUR sans preuve ; correction refuse. 1 250 n'est pas confondu avec 250 ; écritures équivalentes confirmées acceptées |
| P1 — **CONFIRMÉ DANS LE CODE / REPRODUIT** : contexte de prestation présent mais ignoré | Prix saisi dans `services.services[].price` absent des faits examinés | Politique : prix fourni de la seule prestation sélectionnée utilisable ; aucun prix emprunté à une autre prestation. `projectForSubject` conserve l'isolation de l'offre | Prix demandé de la prestation sélectionnée accepté ; prix d'une autre prestation refusé ; prix absent n'empêche pas une présentation sans prix |
| P1 — **REPRODUIT** : sujet explicitement supprimé remplacé silencieusement | `resolveSubject` retombe sur le premier produit/service | `creative-subject.ts` : absence de choix facultatif garde le défaut ; choix explicite inconnu donne `SUBJECT_NOT_FOUND` et demande une nouvelle sélection | Produit et service absents refusés, choix omis accepté ; helper partagé images/publications/vidéos |
| P2 — **REPRODUIT** : consigne de vocabulaire modifie un texte client exact dans le prompt | La protection du nom de marque ne couvre pas les autres textes exacts ; transformation du prompt complet peut les réécrire après leur validation | `ai-post.ts` : segments exacts client/correction protégés, y compris dans la consigne finale ; vocabulaire générique conservé | Consigne contradictoire de vocabulaire, titre exact toujours présent dans la requête image et aucun titre substitué |
| P2 — **REPRODUIT** : résultat acquis rendu dépendant du fournisseur actuel | Un précontrôle ajouté trop tôt peut bloquer une simple récupération | Reçu final utilisable relu avant les nouveaux prérequis de génération, puis livraison technique native vérifiée | 4 activités : même asset récupéré après indisponibilité du modèle, sans nouveau copy/image/review |
| P2 — **REPRODUIT** : correction concurrente ou contexte changé | Deux fenêtres peuvent écraser la correction ; reprendre sur une clé différente peut racheter une rédaction | Version du reçu + révision de correction, conflit 409. `expectedCopyKey` oblige à réutiliser le reçu acquis ; contexte changé bloque avant copy. Plafond enregistré de la tâche utilisé par le moteur | Ancienne fenêtre refusée sans écrasement ; double reprise refusée ; contexte modifié n'appelle ni texte ni image ; plafond de tâche inchangé |
| P2 — **REPRODUIT** : cause métier perdue après persistance | Erreur métier seulement en texte, reprise pouvant laisser un code de la tentative précédente | `jobs.ts`, `http.ts` : code contrôlé des `UserFacingError`, conservé sans dévoiler les checkpoints ; code ancien retiré en cas d'échec suivant sans code. Les résultats annulés/pausés et le bail ne sont pas modifiés | Test de file/échec/relecture : code présent, acquis privés conservés sans être exportés ; échec suivant ne reprend pas le code précédent |

## Matrice transversale des parcours réellement présents

« Tests » signifie exécution locale avec dépendances fournisseurs simulées. « Code » n'est pas une observation de production. Une cellule « aucune anomalie supplémentaire reproduite » n'est pas une certification générale.

| Parcours | Garde examiné | Cas légitime accepté | Vrai refus conservé | Défaut / correction | Preuve | Limite restante |
| --- | --- | --- | --- | --- | --- | --- |
| Création/brief, originaux | `preparation/brief`, `inspectBrief`, `assertFresh`, quote/owner/plan | Description simple sauvegardée, champs facultatifs sans prix, réponses ajoutées sans refaire l'analyse | Source originale étrangère/absente, offre modifiée après accord, donnée essentielle manquante | Récupération acquise et brouillon sale déjà corrigés dans #146, conservés | `preparation-analysis`, `preparation-analyse-reprise`, `preparation-collecte-reprise`, `mission142-preparation-reprise`, parcours complet `preparation.test` | Analyse multimodale et sources réelles non appelées |
| Recherche stratégique | `validateResearch`, preuves d'exécution, déduplication des sources | Sources distinctes simulées, limites partielles dites | Citation inventée/source absente/angles dupliqués | Aucun garde supprimé ; réutilisation des étapes déjà acquises | `preparation-nouvelle-mission`, `preparation-adapters`, `preparation.test` | Validité actuelle d'une page externe non certifiée |
| Nom/marque/accroche/identité | Identité confirmée, révision de préparation, contexte Brain | Nom fourni préservé, choix explicite de palette/typo, versions | Contradictions de faits et changement dans un autre onglet | Faux mots-clés et textes exacts corrigés dans les médias, sans modifier l'identité active | `identite-validation-parcours`, `audit-amont-regressions`, nouveaux tests | Jugement créatif sur vraie marque/fournisseur non validé |
| Logo, directions, choix et déclinaisons | `runLogoEngineV2`, quote/config/forfait avant `reserveDirectionSeries`, fatal/name exact, résultat incertain | Styles différents, choix permis d'un original non fatal ; reprise directions manquantes | Nom faux, fatal, série non complète, coût incertain non rapproché | Contrôles de livraison précédents conservés ; aucune modification du moteur artistique dans cette passe | `logo-v2`, `logo-v2-artwork`, `preparation-directions-integration`, `mission142-livraison-logo-video` | UI de toutes les directions et vrai dessin non réessayés aujourd'hui |
| Banque d'images/recherche/import | Owner, droits, références, fichiers, disponibilité réelle du mode | Photo importée ou résultat partiel visible et réutilisable | Fichier étranger/invalide, IA désactivée, faux mode local | Idempotence et résultats partiels de #146 conservés | `mission142-images-idempotence`, `mission142-livraison-images`, preuves navigateur antérieures clairement datées | Licences/résultats de vraies banques non recherchés dans cette passe |
| Image IA unitaire / jeu | `imageDelivery`, décodage, statut/projet, checkpoint et cap | Images neutres sans prix facultatif, lots dont acquis restent conservés | Référence indispensable manquante, aucun résultat, fichier non décodable | Pas de succès vide ; prérequis copy/image et reçus corrigés | `mission142-producteurs-directs`, `mission142-livraison-images`, nouveaux tests | Qualité photo réelle non évaluée par les mires simulées |
| Retouche d'une image | Source scoped, autorisation/coût, cible de modification | Même source, consigne et textes exacts, versions conservées | Photo étrangère, source effacée, résultat sans image | Protection des textes dans la consigne finale ; idempotence précédente conservée | `mission142-images-idempotence`, `retouches-composees`, `creation-guidee` | Toutes les retouches payantes et fidélité réelle non vérifiées |
| Publicité image guidée | Préconditions, assertion par champ, devis, reçu et livraison | Projet produit/service simple, sous-ligne facultative retirée par le propriétaire | Montant non confirmé, devis non accepté, fournisseur non compatible, budget réellement insuffisant | Correction gratuite persistée et reprise du seul aval, aucun achat de copy supplémentaire | [Recette native et indicateurs](../../reports/issue142/transversal/parcours-navigateur.json), 12 captures et 4 vidéos ci-dessous | Tâche du client non relancée ; authentification/rendu fournisseur réels non testés |
| Campagne / variantes | Offre confirmée, clés de concepts/plateformes/aspects, droits et nombre d'essais | Offres demandées et confirmées, résultat par format | Offre inventée, coût au-delà du cap, médias partiels | Moteur commun corrigé ; pas de règle par nom de démonstration | `publications-qualite`, `publications-campagnes`, `ads-v2`, nouveaux tests | La correction UI ciblée est celle des tâches `image.ai_post`, pas une réparation universelle de toutes les variantes d'une campagne |
| Textes / pages / SEO | Cible stable, exigences, faits confirmés, lock/révision, contrôle éditorial | Contenu complet versionné, retouche ciblée, dernier texte client protégé | Mauvaise cible, chiffre/avis inventé, JSON invalide, budget atteint | Aucune anomalie supplémentaire de blocage reproduite ici ; réécriture explicite/idempotence précédente conservée | `seo-v2-engine`, `lot1-rattachement-parcours`, `qualite-textes-marque`, `preparation-textes-reprise` | Quelques replis locaux existent encore : brouillon/partiel/à vérifier, jamais assimilés ici à une création premium validée. Pas de preuve de qualité commerciale réelle |
| Blog | Droits blog, quotas, store existant, publication séparée | Brouillon natif réutilisable, coût unique, réécriture locale/IA selon droit | Quota/forfait et publication sans accord | Aucun contournement de droit ajouté | `seo-v2-engine`, `blog.test.ts` | Pas de publication CMS réelle ni trafic SEO mesuré |
| Publications organiques | Contrat éditorial, sources, consentement de citation et personne | Question communautaire, photographie sans bouton commercial, contenu utile | Faux témoignage, source non autorisée, CTA de vente imposé | Faux positif d'avis neutralisé dans contrat/copy/script ; assertion chiffrée toujours retenue | `publications-editoriales`, `video-editorial-contract`, nouveaux tests | Réparation complète d'un wrapper `social.v2.media` déjà échoué reste partielle : le panneau vise les tâches `image.ai_post` identifiables |
| Calendrier et programmation | Approbation par version, limites du forfait, connexion, état incertain de publication | Déplacement/édition après nouvelle approbation, plan local sauvegardé | Publication sans approbation/connexion, quota, résultat distant ambigu | Aucune publication ni nouvelle connexion ; état et acquis conservés | `social-v2`, tests scheduler/approval/automatisation présents | Aucun envoi social réel ; état d'un fournisseur distant non rapproché pendant cet audit |
| Scénario vidéo / contenu éditorial | `scriptIssues`, durée/parole, contexte/scénario signé, références | Question d'opinion complète conservée sur produit/service, plan sans paiement | Témoignage inventé, pourcentage, voix trop longue, contexte modifié | Distinction d'opinion et de preuve ; sujet supprimé refusé plutôt que changé | Nouveaux plans natifs + `video-editorial-contract`, `video-receipts-approval` | Prix/garanties dans toutes les paraphrases et appréciation sémantique restent à vérifier ; ce contrôle lexical n'est pas une validation universelle |
| Clips guidés/directs/référence | `runThreeScenes`, validation devis/scénario, route compatible, durée reçue, qc, reçus | Clips et stills acquis réutilisés ; scénario/voix conservés | Référence étrangère, clip trop court/non contrôlé, mode indisponible | Protection du reçu initial en échec de stockage et conservation des ambiguïtés | `video-beginners-direct`, `video-receipts-approval`, tests clips natifs du groupe vidéo | Aucun clip fournisseur réel ni comparaison artistique aujourd'hui |
| Voix, musique, rendu et reprise | Consentement, moteur vocal installé, durée mesurée, débit, fichier/durée/frame | Petit rendu MP4 réel, reprise d'un encodage sans refaire les médias | Voix absente/trop longue, document client modifié pendant encodage, fichier invalide | Mixage borné et livraison de #146 conservés ; reçu de stockage renforcé | `video-voice-*`, `video-render-conflict`, `mission142-livraison-logo-video` | Pas de nouvelle voix fournisseur ; présence/qualité de tous les moteurs sur le Codespace non vérifiée |
| UGC | Forfait projet, marque, script/consentement, image/vidéo/vision avant médias, vrai produit | Scénario synthétique déclaré et autorisé dans tests | Faux avis personnel, droit manquant, fournisseur/vision ou photo manquants | Aucun garde retiré ; pas de nouvel acteur généré | `ugc.test.ts`, `ugc-rules-en.test.ts`, moteur `engine/ugc.ts` relu, contrôles de livraison conservés | Pas de production UGC réelle ; disponibilité actuelle des moteurs de ce serveur inconnue |
| Chat de thème / sections / sur-mesure | Droits projet dans worker/routes, quotas, versions/attentes de parent, choix explicite | Section existante éditable, bibliothèque selon forfait, thème actif préservé | Nouvelle section sur mauvais forfait, sur-mesure hors Dominer, conflit de version | Lecture transversale seulement ; aucun fichier de thème modifié. Périmètre coordonné avec Claude #145/#147/#148 | `plan-gates.ts`, `theme/custom-access.ts`, `engine/shop.ts`, tests thèmes des groupes ; diff #147 comparé : aucun fichier en commun à cette passe | Les corrections de #147 ne sont pas intégrées ni validées par cette branche ; revalidation commune après intégration par Claude |
| Exports / CMS / téléchargements | Version exacte du projet, forfait, export gate, fichier et scope, plateformes autorisées | PNG réellement téléchargé et décodé ; ZIP natifs testés localement | Absence de version, plateforme inconnue, archive refusée, fichier d'un autre compte | Aucun adaptateur modifié dans cette passe ; défauts d'adaptateurs déjà pris en charge par #147 préservés | Route `theme/export`, tests `cms-v2`, `lot2a-php-export`, `plateformes-honnetes`, navigateur de reprise | ZIP/aperçu local ≠ installation CMS. Shopify, WooCommerce et PrestaShop nécessitent installation de test ; Wix/WiziShop restent limités au mode de livraison documenté. Aucune nouvelle connexion autorisée |
| Tâches / budgets / concurrence | Lease, checkpoints, scopes, réservations et règlement, 40 % HT / 50 % HT | Reprise acquise sans coût doublé, correction locale même IA épuisée, code métier après reconnexion | Incertitude, mauvais propriétaire, compte/plan sans droit, vrai cap/minimum | `not_sent` prouvé, codes persistants, ancien code retiré, progression/galerie conservées | `mission142-jobs`, `mission142-billing`, `mission142-confirmation-cout`, navigateur | Pas d'instantané historique du portefeuille client ; aucune remise à zéro/recharge gratuite ni augmentation de plafond |

## Vérifications réellement exécutées

| Vérification | Résultat retenu | Version / preuve |
| --- | --- | --- |
| 320 fichiers Vitest en quatre groupes de 80 | **2 503 réussis, 13 ignorés** : 611+596+617+679 ; 3+10+0+0 ignorés | [Groupes exacts](../../reports/issue142/transversal/groupes-tests.json), journaux [1](../../reports/issue142/transversal/logs/suite-groupe-1.txt), [2 final](../../reports/issue142/transversal/logs/suite-groupe-2.txt), [3](../../reports/issue142/transversal/logs/suite-groupe-3.txt), [4](../../reports/issue142/transversal/logs/suite-groupe-4.txt) |
| Derniers tests concernés après renforcement stockage/cause | **69 réussis / 5 fichiers** | Exécutés sur a01c5dd6 ; [journal](../../reports/issue142/transversal/logs/controles-cibles-69.txt) |
| Diagnostic v5 | **28 réussis** | 1b93022b ; [journal](../../reports/issue142/transversal/logs/diagnostic-v5-28.txt) |
| Comparaison avec le garde historique d97e0b95 | Faux refus reproduits ; EUR non confirmé désormais refusé ; appel copy évitable 1 → 0 | [Indicateurs](../../reports/issue142/transversal/comparaison-historique.json) et [journal](../../reports/issue142/transversal/logs/comparaison-historique.txt) ; dépendances simulées |
| `npx tsc --noEmit` | Réussi, sortie vide | Dernier passage après le pilote navigateur renforcé ; [journal](../../reports/issue142/transversal/logs/types.txt) |
| Construction production | Réussie **avec le cache Webpack désactivé seulement** | Code d6777986, [journal](../../reports/issue142/transversal/logs/build-production.txt), [hook local auditable](../../reports/issue142/transversal/build-without-cache.cjs) |
| Navigateur natif produit + service | Réussi, nouvelle session, worker arrêté/redémarré, galerie, PNG téléchargé/décodé, isolation 404, aucun débordement 390/1440 px | Code compilé d6777986 renvoyé par `/api/version` ; [journal](../../reports/issue142/transversal/logs/navigateur.txt), [résultats](../../reports/issue142/transversal/parcours-navigateur.json) |

Les quatre groupes ont été exécutés avant certains derniers ajustements de stockage/cause ; les 69 tests concernés ont ensuite été rejoués sur a01c5dd6. Le dernier changement applicatif d6777986 porte sur la disposition mobile, revérifiée par types, build et navigateur. **Les 2 503 succès ne sont donc pas présentés comme une exécution unique sur le SHA final**, ni additionnés aux sous-ensembles rejoués. Les 13 ignorés correspondent à 11 contrôles PHP (PHP absent ici) et 2 tests déjà désactivés.

Commandes réellement exécutées (variables locales de recette isolée, jamais de configuration client) :

```bash
# Chaque liste exacte de groupes-tests.json a été passée en arguments à cette commande :
npx vitest run <les 80 chemins du groupe>
npx vitest run tests/mission142-jobs.test.ts tests/mission142-blocages-transversaux.test.ts tests/mission142-billing.test.ts tests/video-receipts-approval.test.ts tests/images-faire-un-visuel.test.ts
npx vitest run tests/mission142-diagnostic-livraison.test.ts
npx tsc --noEmit
# Build local, réseau fournisseur bloqué, seul cache Webpack désactivé :
NODE_OPTIONS='--require=/workspace/work/mission142-build-without-cache.cjs --import=/workspace/work/publications-qualite/scripts/verify-video-network-guard.mjs' npm run build
# Base isolée préfixée ecs-parcours-test-142-, DELIVERY_PHASE=after :
node --import tsx scripts/mission142/delivery-harness.ts seed
node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 18242
# COPY_RECOVERY_SUITE=1 ; le pilote démarre/arrête son propre worker simulé :
node --import tsx scripts/mission142/copy-recovery-browser.ts
# Conversion des enregistrements réels, aucune image générée :
ffmpeg -y -i <enregistrement.webm> -c:v libx264 -preset fast -crf 25 -pix_fmt yuv420p -movflags +faststart <preuve.mp4>
ffprobe -v error -show_entries stream=codec_name,width,height:format=duration -of json <preuve.mp4>
```

Le serveur et le worker reçoivent `DATA_DIR`, secret généré localement, `STOCK_OFFLINE=1`, date de prix synthétique et garde réseau avant démarrage ; aucune valeur secrète n'est exportée. Le navigateur et les transports du worker refusent les hôtes externes. Ces lignes décrivent la recette exécutée, **pas une commande de mise à jour à lancer dans un studio client**.

La construction standard initiale a échoué faute d'espace (`ENOSPC`) pendant l'écriture du cache. Seuls quatre fichiers temporaires incomplets produits par ce lancement ont été retirés ; les anciens caches, données et médias restent préservés. Le build final utilise le hook de cache ci-joint, sans désactiver types, validations ou compilation ; le serveur natif testé ne charge pas ce hook. Playwright emploie le Chromium et FFmpeg déjà installés, via un chemin de cache isolé pour ce dernier, sans téléchargement. Les vidéos MP4 ont été sondées : H.264, ordinateur 960×666, mobile 390×844, durées 8,36–10,60 s.


La première exécution générale non découpée a rencontré **ENOSPC / SQLite plein**, avec des fichiers de test incomplets. Elle n'est **pas** comptée comme un succès. Une autre tentative a aussi révélé une clé purement synthétique inutilement déposée dans les settings communs par le nouveau test ; elle a été retirée du test, et les cas concernés ont été revérifiés. Aucun fournisseur réel n'a été configuré par cette correction.

Les deux échecs d'un test historique d'Images venaient d'un double `ctxOf` incomplet (sans `payload`, alors que le vrai `JobContext` l'expose). Le double a été aligné sur ce contrat et les cinq cas ont été rejoués. Le parcours natif avec un vrai `JobContext`, les plafonds et la livraison ne sont pas remplacés par ce double.

Les journaux publiés ont seulement leurs espaces de fin, retours de progression et lignes vides finales normalisés ; les empreintes des originaux figurent au manifeste. La liste des 320 fichiers, leur répartition, les commandes exactes et les résultats retenus se trouvent dans le manifeste. Les essais échoués/interrompus restent distingués des vérifications réussies ; aucune addition de tests répétés n'est présentée comme un nombre de tests distincts.

## Recette navigateur et visuels

Deux cas nouveaux par rapport aux fixtures unitaires : **Boîte à semis Test** (produit) et **Reliure Ligne Test / Reliure de livre** (service). Demandes simples, sans prix ni témoignage, avec champs facultatifs absents. Le faux fournisseur fournit volontairement une sous-ligne chiffrée non autorisée. Le client la retire et change réellement le titre en « Les semis bien rangés » ou « Le soin de vos livres » ; la reconnexion retrouve ce titre, puis le moteur le transmet exactement à l'image.

Chaîne observée pour chacun : échec à 15 % sans image → motif/champ visibles → worker arrêté → correction gratuite sauvegardée sans reprise → nouvelle session → titre corrigé retrouvé → validation explicite du devis de reprise → même tâche et worker redémarré → aucun nouvel achat de rédaction → fichier en galerie après rechargement → PNG téléchargé depuis l'interface et décodé **1080×1350**. Autre compte/projet : 404. Deux lignes d'usage synthétiques, 68 000 micro-unités synthétiques au total par cas, aucune réservation ouverte ; **coût fournisseur réel : 0 €**.

Précision de preuve : l’indicateur navigateur `customHeadlinePersistedAndPassedToImage` vérifie la persistance du titre dans les métadonnées du visuel enregistré. Le contrôle du texte exact dans le prompt est couvert séparément par le test ciblé qui capture la requête image ; aucune lecture de pixels ni fidélité typographique d’un fournisseur réel n’est prouvée par ces simulations.

Les 12 captures finales ont été ouvertes et inspectées. Le premier passage avait révélé un débordement mobile (390 px de fenêtre / 467 px de contenu) ; d6777986 le corrige, puis la recette finale mesure 390/390 et 1440/1440 à toutes les étapes capturées. Les captures complètes peuvent placer les barres fixes au milieu d'une image longue ; les détails au format écran et les vidéos permettent de juger les commandes sans cette limite de capture. L'encart tutoriel natif reste visible, et aucune retouche des captures ne le masque.

| Étape | Produit | Service |
| --- | --- | --- |
| Refus ordinateur | [PNG](../../reports/issue142/transversal/captures/produit-semis-01-refus-ordinateur.png?raw=1) | [PNG](../../reports/issue142/transversal/captures/service-reliure-01-refus-ordinateur.png?raw=1) |
| Refus mobile | [PNG](../../reports/issue142/transversal/captures/produit-semis-02-refus-mobile.png?raw=1) | [PNG](../../reports/issue142/transversal/captures/service-reliure-02-refus-mobile.png?raw=1) |
| Correction après reconnexion, page entière | [PNG](../../reports/issue142/transversal/captures/produit-semis-03-correction-reconnexion-mobile.png?raw=1) | [PNG](../../reports/issue142/transversal/captures/service-reliure-03-correction-reconnexion-mobile.png?raw=1) |
| Correction après reconnexion, détail lisible | [PNG](../../reports/issue142/transversal/captures/produit-semis-03-detail-correction-mobile.png?raw=1) | [PNG](../../reports/issue142/transversal/captures/service-reliure-03-detail-correction-mobile.png?raw=1) |
| Résultat mobile | [PNG](../../reports/issue142/transversal/captures/produit-semis-04-resultat-mobile.png?raw=1) | [PNG](../../reports/issue142/transversal/captures/service-reliure-04-resultat-mobile.png?raw=1) |
| Résultat ordinateur après reconnexion | [PNG](../../reports/issue142/transversal/captures/produit-semis-05-resultat-reconnexion-ordinateur.png?raw=1) | [PNG](../../reports/issue142/transversal/captures/service-reliure-05-resultat-reconnexion-ordinateur.png?raw=1) |

| Enregistrement réel du navigateur | Produit | Service |
| --- | --- | --- |
| Ordinateur | [Lire / télécharger MP4](../../reports/issue142/transversal/videos/produit-semis-ordinateur.mp4?raw=1) | [Lire / télécharger MP4](../../reports/issue142/transversal/videos/service-reliure-ordinateur.mp4?raw=1) |
| Mobile : correction, reconnexion et reprise | [Lire / télécharger MP4](../../reports/issue142/transversal/videos/produit-semis-mobile.mp4?raw=1) | [Lire / télécharger MP4](../../reports/issue142/transversal/videos/service-reliure-mobile.mp4?raw=1) |

[Dimensions/durées des vidéos](../../reports/issue142/transversal/videos.json), [manifeste, commandes et empreintes](../../reports/issue142/transversal/verification.json). Les vidéos enregistrent les interactions ; les assertions de base/reçu/coût et la nouvelle session sont aussi consignées par le pilote. Un clip court ne remplace pas ce contrôle de persistance.


Les comptes, produits, services et images de ces captures sont fictifs. Les images simulées servent à prouver la chaîne de livraison, pas à noter un rendu professionnel produit par une IA. Les originaux de captures restent intacts ; les vidéos sont des enregistrements du navigateur, sans montage inventant une interaction.

## Dépendances et intégration avec Claude

La passe **cddbcbdd → d6777986 ne partage aucun fichier modifié avec le diff #147** examiné. Cela ne vaut pas pour l'ensemble de #146 : **14 fichiers de la PR complète et de #147 se recoupent**, à cause des livraisons antérieures. Ce recoupement a été signalé dans #145 avant livraison :

- `assets/cms/wordpress/es-woo.php`
- `docs/LISEZMOI-bibliotheques-familles.md`
- `scripts/family-gallery-export.ts`
- `scripts/family-studio-check.ts`
- `src/app/api/projects/[id]/theme/route.ts`
- `src/app/api/projects/[id]/theme/section-preview/route.ts`
- `src/lib/ai/tasks.ts`
- `src/lib/cms-v2/adapters/prestashop.ts`
- `src/lib/cms-v2/adapters/wordpress.ts`
- `src/lib/engine/local.ts`
- `tests/demos-quatre-themes.test.ts`
- `theme-base/assets/conversion.css`
- `theme-base/assets/family.css`
- `worker/handlers.ts`

Les commits 1b93022b (diagnostic), a2b991f5 (corrections principales), a01c5dd6 (stockage/codes), d6777986 (mobile), puis le commit de preuves sont des descendants de cddbcbdd et des précédents correctifs de #146. Ils dépendent notamment des réservations, traces et reçus, contrôles de livraison, suivi de tâches et interfaces déjà présents dans cette PR. **Ne pas appliquer seulement le dernier commit sur main**, ni remplacer en bloc les fichiers partagés par ceux de cette branche. Claude doit combiner les modifications nécessaires avec ses versions de thèmes/export, préserver SILLON et rejouer les contrôles d'intégration. Cette livraison n'inclut pas les changements de #147 et n'en certifie pas le fonctionnement.

Le dernier run CI de la livraison antérieure cddbcbdd était annulé ; les vérifications locales ci-dessus ne constituent pas un statut CI distant réussi. Le nouveau statut CI est à consulter sur la PR après publication. La mise à jour du studio ne sera terminée qu'après intégration par Claude et contrôle de la version compilée effectivement accessible.

## Ce qui est conservé et ce qui reste à faire

Les plafonds **40 % HT mensuel / 50 % HT recharge séparée**, le minimum de fonctionnement, les réservations incertaines et la comptabilisation des coûts acquis restent en place. Aucune attribution de droits par la recharge. Consentement humain, témoignages autorisés, sujet réel, contrôle des noms et des défauts fatals restent requis. Les quatre thèmes et SILLON n'ont pas été modifiés ; aucune donnée du Codespace, média client, `.env.local` ou dossier local client n'a été touché.

Cette PR est une étape vérifiée, **pas une validation universelle de toute la chaîne IA**. Il reste notamment :

1. Intégration coordonnée avec #147 et SILLON par Claude, puis contrôle du SHA compilé et de l'interface réellement accessible. Aucun merge concurrent de Codex.
2. Proposition de correction à faire valider par le propriétaire de la tâche existante après intégration ; aucune génération n'est nécessaire pour sauvegarder cette correction. Tout nouveau média demande son devis et reste sous les plafonds existants.
3. Vrais fournisseurs (authentification, prix et qualité), vrais CMS, publication sociale, campagnes de nombreuses variantes et reprise UI de tous les anciens wrappers non `image.ai_post` restent non validés par cette passe.
4. Les anciens reçus sans information permettant de prouver « non envoyé » demeurent conservativement bloqués. L'absence de trace n'autorise pas de double paiement. Un ancien reçu tronqué n'est pas supprimé au prétexte qu'il ne se parse pas.
5. Un contrôle lexical déterministe couvre des risques identifiés ; il ne tranche pas toutes les paraphrases commerciales, nuances de garantie ou de prix conditionnel. Les passages incertains restent soumis à preuve/validation, sans boucle de réécriture payante automatique.

Pour généraliser : rejouer les mêmes critères sur un produit physique, un produit numérique, une prestation sur devis et une activité avec prix saisi ; ajouter ensuite des projets jamais employés dans ces tests. Varier noms, langue, champs facultatifs, plusieurs sujets et montants équivalents. Vérifier qu'une information absente produit une omission approuvable ou une question précise, qu'un fait d'un autre sujet n'est pas emprunté, et que changer de fenêtre/worker/fournisseur n'efface pas les acquis. Aucune règle applicative ne dépend du nom d'un projet de démonstration.
