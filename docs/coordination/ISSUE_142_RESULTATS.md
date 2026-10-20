# Mission #142 — budgets, suivi et reprise des générations

Livraison de corrections sur `codex/142-budgets-suivi-reprise`, sans fusion, déploiement ni mise à jour du Codespace. Mission : [issue #142](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/142), confirmée par le [commentaire de coordination de #140](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/140#issuecomment-6274653623).

## Extension de mission — livraison intermédiaire vérifiée

Le [complément 6287157369](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/142#issuecomment-6287157369) étend la mission à tous les parcours IA. La nouvelle [matrice de la chaîne IA, corrections de livraison, tests et 20 captures avant/après](ISSUE_142_CHAINE_IA.md) décrit le code **cfceadb67356a242ab9eafb514e32a19cf0ed863** : **2 443 tests réussis, 13 ignorés, 317 fichiers**, types/build réussis, deux parcours publicitaires produit/service contrôlés dans le navigateur. Les preuves et la reprise client du volet initial ci-dessous restent conservées.

Un diagnostic privé d'une exécution existante a été transmis et examiné : `image.ai_post` est en échec à 15 %, sans image. Le premier champ `budget` est une heuristique du diagnostic, pas une preuve de cause ; un complément strictement en lecture seule est publié au commit **f5457deffa467d1b57d95c2d20be303aec5b5276**, 11 cas contrôlés. La branche exacte de l'incident réel reste à déterminer à partir de ce complément. Aucun diagnostic privé, média ou identifiant client n'est publié et aucun fournisseur n'est relancé.

Le Codespace reste inaccessible directement au moyen de Codex (`CONNECT 403`). Le diagnostic transmis indique la version servie **d97e0b9577128eeb39b403dae281da6bd835fc65** ; les corrections de #146 restent **non fusionnées et non servies**. La frontière de coordination reste **Claude #145** : thèmes, sections, headers/footers et rendus préservés. Cette livraison n'affirme pas que toute l'IA est validée en production.

## Version et frontière d’intégration

- Base : **482d5d3d2f3fa49073d836c23b2453f15ab5046d**, livraison figée de #140. Ce commit n’a pas été déplacé par Codex.
- Premiers correctifs publiés : **9c4e4f2437414b8ae278e4ad1f4b7d443d79891f**, puis **0591a94d071b79eb9b4659100bc41bc38a343e6c**.
- Code du volet initial testé et construit : **8b8f8b0b9b97581061e683f57c990deb077ffbbb**. La réception initiale e10847a1 / 1ac72548 reste conservée dans l’historique. Le complément 8b8f8b0b ferme la reprise depuis l’écran client ; 8696f74e ne modifie que les preuves et ce rapport ; les compléments f5457def et cfceadb6 ajoutent le diagnostic puis les corrections détaillées dans la nouvelle matrice. PR de livraison : [#146](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/146).
- PR distincte vers `main`. Relevé distant du 20 octobre : `main` = **d97e0b9577128eeb39b403dae281da6bd835fc65**, intégration réalisée par Claude via #144 ; #140 et #139 sont déjà fusionnées. L’ancêtre commun avec cette branche reste **482d5d3d** : le delta de PR contient seulement #142, sans reprise d’une tête Claude ni rebase silencieux. La branche source figée de #140 a été supprimée à distance après intégration ; le commit reste accessible dans la PR et l’historique.
- Aucun changement dans `theme-base/`, `src/lib/theme/`, les compositions, médias, bibliothèques de sections ou headers/footers. Aucun travail de #141 récupéré. Les quatre thèmes restent sous la responsabilité de Claude.

## Inventaire et défauts vérifiés

Les réservations, portefeuilles, prix, traces, checkpoints, baux des workers et routes propriétaires existaient déjà. Ils ont été corrigés dans leur emplacement natif ; aucun deuxième portefeuille ni plafond par moteur ajouté.

| Fonction existante et branchement | Défaut et conséquence | Correction et preuve |
| --- | --- | --- |
| `billing.recordUsage` → événement, débit, règlement | **REPRODUIT, simulation isolée** : un incident SQLite après insertion pouvait conserver l’événement sans débit ; la reprise se dédupliquait alors à tort. Une même clé brute entre comptes masquait aussi le second coût. | Transaction immédiate commune et clés limitées au compte/projet/tâche. Échec injecté par trigger, reprise et deux comptes dans `mission142-billing.test.ts`. [Avant correction](../../reports/issue142/tests/billing-avant.txt). |
| `reserve`, `settleUncertain`, `reconcileReservation`, clôture de période | **REPRODUIT, simulation isolée** : coût tardif ignoré ; remboursement d’un ancien appel soustrait au nouveau mois ; recharge ancienne effaçant l’usage courant ; engagement ouvert mal affecté au renouvellement. | Coût réel rapproché avec la réservation et sa période d’origine, reliquat de recharge conservé. Tests ancien/nouveau mois, recharge et double callback. |
| Plafond de tâche dans `ai/trace.ts` et réserve serveur | **REPRODUIT, simulation isolée** : engagements simultanés et coût incertain du premier essai exclus du plafond de tâche. | Contrôle dans la même transaction que la réserve, incluant engagements et coût incertain sans doubler les événements reliés. Trois processus SQLite concurrents : un seul peut réserver 60 000 sur un reste de 100 000. |
| `llmText` / `llmJson`, adaptateurs texte et `media-providers.traced` | **REPRODUIT, fournisseurs simulés** : dédupliquer seulement l’imputation ne prévenait pas un deuxième envoi payant ; certaines erreurs serveur libéraient un coût incertain. | Reçu et résultat sur la réservation native ; même requête rejouée depuis le résultat, envoi concurrent bloqué avant fournisseur ; erreur ambiguë conservatrice. Changement de requête sous la même clé refusé explicitement. |
| Dépôts et téléchargements asynchrones vidéo/image | **REPRODUIT, fournisseurs simulés** : après résultat acquis mais téléchargement perdu, risque de nouveau dépôt ; ancien suivi non limité au compte. | Identifiant d’opération conservé immédiatement, récupération de la même opération sans nouveau POST ni nouvelle réserve, rapprochement du résultat tardif. Prix servi inconnu : arrêt explicite, jamais coût zéro inventé. |
| `jobs.enqueue`, dépendances, `completeJob`, `JobContext` | **REPRODUIT, simulation isolée** : clé commune entre comptes, dépendance disparue bloquée sans issue, notification répétée, ancien contexte écrivant après arrêt, date de fin conservée à la relance. | Portée compte/projet/type, dépendances invalides expliquées, transition conditionnelle avant notification, contrôle du bail et de l’état, relance avec checkpoints et date cohérente. [Avant](../../reports/issue142/tests/jobs-avant.txt). |
| Préparation, route GET propriétaire, `tab-preparation`, `JobProgress`, `WaitTime` | **REPRODUIT en tests et navigateur isolé** : retry du même travail invalidé par sa propre révision d’erreur ; spinner et message « en cours » après arrêt ; progression fabriquée par une minuterie. | Reprise du même job/révision inchangée, édition client protégée ; bouton de récupération depuis le client, aucune nouvelle réservation pendant cette action ; statut réel joint à la préparation ; attente temporelle explicitement estimée, barre seulement si progression enregistrée. `blockers()` distingue pause/arrêt/activité réelle. |
| Budget affiché dans compte et abonnement projet | **REPRODUIT en tests et navigateur isolé** : réserve temporaire présentée comme « 100 % dépensé ». | Montant engagé distinct du montant consommé, message d’attente temporaire. Aucun changement des règles de forfait. |
| Réécriture SEO volontaire hors job | **REPRODUIT en régression Lot 1** : clé constante réutilisée pour deux réécritures différentes. | Identifiant propre à chaque nouvelle demande explicite ; reprise d’un même job stable. Test vérifie deux acquisitions distinctes et la conservation de la version client. |
| Mixage local `video-v2/audio.ts` | **REPRODUIT avec FFmpeg réel, sans fournisseur** : musique bouclée pouvait maintenir le démultiplexeur actif malgré le découpage en aval, notamment avec six voix ; worker bloqué. | La première borne d’entrée seule s’est révélée insuffisante en suite complète. Mixage des voix, atténuation de la musique et mix final séparés, fichiers intermédiaires finis en flottant puis supprimés ; durée/signal/niveau/crête contrôlés sans augmenter les délais. La reproduction en étapes a terminé 20 répétitions (environ une seconde chacune). [Comparaison](../../reports/issue142/tests/audio-stages-comparaison.json). |

Les constats de cette mission ne proviennent pas de journaux de production. « Reproduit » signifie ici exécution locale avec données isolées et/ou réponses fournisseur simulées. Aucun fournisseur réel n’est déclaré validé.

## Règles et protections conservées

**CONFIRMÉ DANS LE CODE et contrôlé par les tests existants** : allocation fournisseur mensuelle à **40 % du prix mensuel HT**, recharge à **50 % HT**, annuel ramené au mois, prix forfaitaires et rattachement aux abonnements payés existants. Les crédits commerciaux et les coûts fournisseurs ne sont pas confondus. Un projet ne reçoit pas une enveloppe supplémentaire créée par cette livraison.

Les contrôles serveur avant appel, fournisseurs désactivés, prix vérifiés, limites d’essais, plafond de devis, baux, arrêt des appels payants interrompus, annulation, checkpoints, versions client et accès propriétaires restent actifs. Les montants maximaux déjà engagés ne disparaissent pas à la relance. Une erreur ambiguë n’entraîne ni remboursement gratuit ni nouvelle génération automatique.

Les contrôles simulés couvrent texte/vision de contrôle qualité, images, logo et relais, clips vidéo, voix, callbacks et téléchargement/reprise via les adaptateurs communs. Les moteurs consommateurs ne sont pas réécrits pour cette mission. Les tests métier existants vérifient aussi leur compatibilité ; cela ne mesure pas la qualité des créations des fournisseurs.

## Recette navigateur : deux nouveaux comptes et projets

Recette réelle de formulaires, routes, SQLite, médias et worker local ; seule la dépendance d’analyse fournisseur est injectée. Les appels externes sont bloqués. Comptes fictifs séparés, sans données client.

- Produit inédit : thermomètre pour jardinières, demande d’une phrase, cible laissée vide, photo fournie de test.
- Service inédit : affûtage d’outils de jardin, demande d’une phrase, contact incomplet volontairement, photo fournie de test.
- Création, modification et sauvegarde ; fermeture du contexte navigateur puis reconnexion : brief exact et identifiant du média retrouvés.
- Devis serveur, confirmation, réserve en cours, progression réellement enregistrée à 25 %, affichage du budget temporairement engagé.
- Produit : incident injecté après résultat acquis. Service : arrêt réel du worker après checkpoint, expiration de son bail dans la base de test, nouveau worker et échec borné visible.
- Reprise par **un vrai clic sur « Récupérer les étapes acquises »**, dans l’écran de préparation des deux clients. Le bouton est désactivé si des retouches ne sont pas enregistrées ; une révision périmée est refusée (409). Checkpoints réutilisés, aucune deuxième acquisition ni imputation. Le garde serveur `recoveryOnly` interdit toute nouvelle réservation fournisseur, même si une sous-étape tente de retirer cette protection ; les dépendances susceptibles d’être payantes restent bloquées. Un résultat absent nécessite un nouvel essai avec devis, jamais une dépense cachée pendant la récupération.
- Budget rendu insuffisant dans la fixture : devis refusé par le serveur (HTTP 422), erreur visible sans génération.
- Depuis l’autre compte : préparation, jobs, abonnement, fichier et détail de job refusés (404), modification/retry et récupération de préparation également refusés.
- Ordinateur 1440 × 1000 et téléphone 390 × 844 ; absence de débordement horizontal et d’erreur JavaScript. Les détails manquants restent visibles, aucun projet complet annoncé prêt, aucun thème créé.

Résultats machine : [parcours](../../reports/issue142/parcours/results.json) et [registre synthétique](../../reports/issue142/parcours/ledger-public.json). **Deux réservations et deux événements d’usage**, coût synthétique de 40 000 micro par projet (0,04 € fictif), soit **0,08 € synthétique** au total. Les plafonds réservés sont 2 800 000 et 3 400 000 micro. Les instantanés avant réservation, pendant l’engagement, après incident et après retry sont dans `results.json` ; les deux derniers sont strictement identiques. Les soldes mensuels comprennent des consommations préchargées par la fixture pour provoquer les états de budget : ils ne sont pas des dépenses réelles. **Coût fournisseur réellement engagé : 0 €**.

### Captures consultables et téléchargeables

Les images portent le bandeau « données et fournisseurs simulés ». Liens vers les fichiers PNG originaux :

| État | Produit | Service |
| --- | --- | --- |
| Demande peu détaillée | [Création](../../reports/issue142/parcours/produit-thermometre-01-demande-peu-detaillee.png) | [Création mobile](../../reports/issue142/parcours/service-affutage-01-demande-peu-detaillee.png) |
| Retour après reconnexion | [Produit](../../reports/issue142/parcours/produit-thermometre-02-reconnexion.png) | [Service](../../reports/issue142/parcours/service-affutage-02-reconnexion.png) |
| En cours, ordinateur | [Produit](../../reports/issue142/parcours/produit-thermometre-03-en-cours-ordinateur.png) | [Service](../../reports/issue142/parcours/service-affutage-03-en-cours-ordinateur.png) |
| En cours, téléphone | [Produit](../../reports/issue142/parcours/produit-thermometre-03-en-cours-mobile.png) | [Service](../../reports/issue142/parcours/service-affutage-03-en-cours-mobile.png) |
| Budget engagé | [Produit](../../reports/issue142/parcours/produit-thermometre-04-budget-engage.png) | [Service](../../reports/issue142/parcours/service-affutage-04-budget-engage.png) |
| Arrêt, ordinateur | [Produit](../../reports/issue142/parcours/produit-thermometre-05-arret-conserve-ordinateur.png) | [Service](../../reports/issue142/parcours/service-affutage-05-arret-conserve-ordinateur.png) |
| Arrêt, téléphone | [Produit](../../reports/issue142/parcours/produit-thermometre-05-arret-conserve-mobile.png) | [Service](../../reports/issue142/parcours/service-affutage-05-arret-conserve-mobile.png) |
| Résultat repris, ordinateur | [Produit](../../reports/issue142/parcours/produit-thermometre-06-resultat-repris-ordinateur.png) | [Service](../../reports/issue142/parcours/service-affutage-06-resultat-repris-ordinateur.png) |
| Résultat repris, téléphone | [Produit](../../reports/issue142/parcours/produit-thermometre-06-resultat-repris-mobile.png) | [Service](../../reports/issue142/parcours/service-affutage-06-resultat-repris-mobile.png) |
| Budget insuffisant | [Produit](../../reports/issue142/parcours/produit-thermometre-07-budget-insuffisant.png) | [Service](../../reports/issue142/parcours/service-affutage-07-budget-insuffisant.png) |

## Commandes et contrôles

Commandes réellement exécutées sur le code final, dans l’environnement isolé :

| Commande / contrôle | Résultat | Preuve |
| --- | --- | --- |
| `npx tsc --noEmit` | Réussi, zéro erreur (également après l’ajustement du script de mesure du devis public) | [Journal](../../reports/issue142/tests/types-final.txt) |
| `npx vitest run --maxWorkers=2` | **2 409 réussis, 13 ignorés, 313 fichiers réussis**, 993,82 s | [Suite générale](../../reports/issue142/tests/suite-finale.txt) |
| `npx vitest run tests/mission142-billing.test.ts tests/mission142-jobs.test.ts tests/mission142-preparation-reprise.test.ts tests/budget-ia.test.ts tests/taches-fond-robustesse.test.ts --maxWorkers=2` | **66 réussis / 5 fichiers**, acquisition manquante bloquée avant envoi, résultat texte natif réutilisé, garde conservé dans les sous-étapes, dépendances en attente protégées | [Reprise client](../../reports/issue142/tests/reprise-client-66.txt) |
| `npx vitest run tests/trace-appels.test.ts tests/budget-ia.test.ts --maxWorkers=2` | 36 réussis / 2 fichiers | [Trace et budget](../../reports/issue142/tests/trace-36.txt) |
| `npx vitest run tests/video-audio-termination.test.ts tests/video-v2-engine.test.ts tests/video-v2-bench.test.ts --maxWorkers=2` | 20 réussis / 3 fichiers | [Rendu réel local](../../reports/issue142/tests/audio-stages-20.txt) |
| `npx vitest run tests/video-audio-termination.test.ts --maxWorkers=1` | 2 réussis ; 12 mixages, durée, niveau, crête, temporaires supprimés | [Dernier format audio intermédiaire](../../reports/issue142/tests/audio-flottant-2.txt) |
| `npm run build`, données et clé de recette fictives, réseau fournisseur bloqué par le garde de démarrage | Réussi ; `/api/version` du serveur renvoie le SHA **8b8f8b0b…** | [Construction](../../reports/issue142/tests/build-final.txt), `compiledVersion` du résultat navigateur |
| `npx tsx scripts/mission142/harness.ts seed`, puis `npx tsx scripts/mission142/browser.ts` | Réussi, deux comptes neufs, deux projets, 20 captures, zéro appel externe réel | [Journal navigateur](../../reports/issue142/tests/navigateur-final.txt), [résultats](../../reports/issue142/parcours/results.json) |
| `git diff --exit-code 482d5d3d HEAD -- theme-base src/lib/theme public/demo` | Réussi, aucun delta dans ces chemins | [Version et frontière](../../reports/issue142/version.json), [fichiers de code](../../reports/issue142/fichiers-code.txt) |

Autres contrôles ciblés réellement exécutés pendant la stabilisation : [118 tests / 7 fichiers](../../reports/issue142/tests/cibles-118.txt), [55 régressions / 3 fichiers](../../reports/issue142/tests/regressions-55.txt), [22 tests période/abonnement](../../reports/issue142/tests/periode-abonnement-22.txt), [8 tests de reprise/arrêt](../../reports/issue142/tests/reception-fixes-8.txt). Ces exécutions se recoupent : leurs totaux ne doivent pas être additionnés à la suite générale.

Historique explicite : une première suite complète avait 2 404 succès et un échec de l’ancien test de trace (il attendait deux envois sous la même clé). La réémission n’est plus attendue ; la fixture représente maintenant une trace ancienne sans reçu et vérifie l’arrêt avant un deuxième envoi. Le cache avec reçu natif est vérifié séparément. Une suite suivante a retrouvé le blocage audio intermittent, puis a été invalidée par un disque temporaire plein pendant la construction concurrente. Ces lancements ne sont pas annoncés réussis. Des caches Webpack régénérables ont été supprimés, sans supprimer de données/médias/preuves ; le build et la suite ont été relancés. [Historique conservé](../../reports/issue142/tests/historique-suites.txt).

La première réception complète e10847a1 avait 2 405 succès / 313 fichiers, zéro échec ; le complément de reprise client est contrôlé séparément ci-dessus. Les 13 tests ignorés ne sont pas comptés comme validés : 11 nécessitent PHP, absent de cet environnement (`lot2a-php-export`, calendrier de réservation, parité CMS), et 2 sont déjà désactivés dans `films-accueil.test.ts`. Aucun nouveau test ignoré ni délai augmenté pour faire passer cette livraison.

Un lancement plus ancien avait été refusé par le contrôle automatique d’autorisation à cause d’une limite d’utilisation : il n’avait pas été exécuté. Deux arrêts du script navigateur de réception concernaient ses sélecteurs ou son relevé d’un champ de devis non public ; ils ont été corrigés, puis la recette entière a été rejouée sur des comptes neufs, sans effacer les jeux précédents et sans coût fournisseur.

CI GitHub du code **8b8f8b0b…** : [run 39398393912](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/39398393912). Relevé du 20 octobre à 09:30 UTC : **types, tests complets et Docker réussis** ; Theme Check encore en cours, build standard pas encore commencé. [Instantané des étapes](../../reports/issue142/tests/ci-code.json). Aucun contrôle restant n’est présenté comme réussi. Les contrôles de la tête contenant seulement les preuves sont à distinguer de ceux du commit applicatif testé. Le rapprochement `git diff` des fichiers billing, DB, jobs, audio et préparation avec le main déjà intégré ne montre aucun changement concurrent à reprendre ; la PR est annoncée fusionnable par GitHub au relevé, mais aucune fusion n’est lancée.

Recette reproductible dans un répertoire **neuf** dont le nom commence par `ecs-parcours-test-142-` :

```bash
export DATA_DIR=/tmp/ecs-parcours-test-142-recette-neuve
export APP_SECRET=cle-fictive-uniquement-pour-la-recette-isolee
export STOCK_OFFLINE=1
npx tsx scripts/mission142/harness.ts seed
NODE_OPTIONS='--import ./scripts/verify-video-network-guard.mjs' npx next start -H 127.0.0.1 -p 18242
# Dans un autre terminal, avec les trois mêmes variables de test :
npx tsx scripts/mission142/browser.ts
```

Ne jamais pointer cette recette vers les données du studio. `private.json`, les sessions, la base et la configuration ne font pas partie de la livraison. Le navigateur utilise uniquement les comptes synthétiques créés par le seed.

## Limites précises et note d’intégration pour Claude

1. Aucune facture fournisseur, clé réelle, latence réelle, callback externe authentifié ou rendu IA payant vérifié. Les tarifs inconnus bloquent, mais le rapprochement commercial réel reste à contrôler lors d’un essai ultérieurement autorisé.
2. Le navigateur couvre la préparation/brief, son média, l’accès et la reprise ; il ne constitue pas une création réelle complète de marque, logo, textes, images, vidéo et thème. Les autres chemins sont contrôlés par tests locaux avec doubles fournisseurs. Aucun CMS ni publication sociale testé.
3. Après coupure entre envoi et réception d’un identifiant fournisseur, l’issue reste incertaine : retenue conservatrice et absence de réémission automatique. Un reçu ancien insuffisant est bloqué pour examen, jamais effacé pour permettre une dépense cachée. Un bail de récupération abandonné après crash dure jusqu’à 30 minutes ; les erreurs normalement interceptées libèrent ce verrou.
4. Le cache de résultat natif évite les nouveaux appels quand le résultat a pu être sauvegardé ; il ne rend pas atomique un réseau externe avec SQLite. Les binaires acquis sont conservés sous le stockage existant `ai-results/`. Ne pas purger ce stockage entre arrêt et reprise. Il ajoute une copie de récupération ; aucune purge automatique n’est introduite. Sa durée de conservation et son volume physique restent à surveiller séparément des quotas de la bibliothèque.
5. Fichier partagé à préserver lors de l’intégration : `src/lib/db.ts`, ajouts **additifs** à `ai_reservations` (`usage_event_id`, `settled_period_start`, `operation_key`, `request_hash`, `result`, `provider_receipt`, `recovery_until`) et index d’opération non libérée. Pas de suppression/migration de projets existants. Cette frontière a été signalée dans l’issue avant publication.
6. Également partagés : billing, adaptateurs IA, jobs, préparation et indicateurs du compte. Comparer les éventuels changements de Claude à ces endroits ; aucun fichier de son chantier de sections n’a été modifié.
7. Intégration de #142 ultérieure seulement selon la validation des sections par Thomas. Les intégrations déjà effectuées par Claude ne sont ni annulées ni reproduites par Codex. Dépendance #140 à **482d5d3d** (inclut déjà #138 à **301e9484** et la livraison initiale Claude **b4557d64**). La restauration validée #139 à **a75664cd40903647bd87342b34334e89a7342c31** est déjà ancêtre du `main` distant relevé ci-dessus ; cette branche n’en absorbe pas une nouvelle tête mouvante. [Passation #140](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/9172938ad9d42cbef4b9a1f17542324dc5be53a0/docs/coordination/PR_140_PASSATION_CLAUDE.md).
8. Aucun accès au Codespace ni actualisation du studio dans cette mission. Son dossier local `reports/logo-debug-sebastien-blanc/`, sa configuration, `.env.local`, ses données et médias sont à préserver. Claude reste chargé de l’intégration et devra vérifier le SHA réellement compilé via `/api/version` ; cette livraison ne déclare pas le studio utilisateur mis à jour.

9. **OBSERVÉ DANS LE NAVIGATEUR SIMULÉ, non corrigé dans ce lot** : pour « Affûtage d’outils de jardin », la proposition affiche une catégorie « Paysagiste ». La description saisie et la prestation « Affûtage » sont intactes, mais la pertinence métier de cette inférence doit être examinée séparément (`preparation/brief.analyzeLocally`, `engine/local.localServiceAnalysis` et registre métier). La proposition reste « à vérifier » ; ni la simulation ni cette mission de budgets ne valident la qualité d’une analyse IA réelle. Voir la capture service après reprise.
