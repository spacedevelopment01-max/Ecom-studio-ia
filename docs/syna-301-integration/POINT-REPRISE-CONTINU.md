# Point de reprise après #402

La mission #301 reste inachevée. Continuer les lots indépendants sans demander une nouvelle validation. Aucun fournisseur réel, projet client, publication, activation, fusion main ou déploiement.

## Dernière livraison et environnement

**PR brouillon #402 : `5950fc2c2cdd1639634d38274a38791c52331881`, branche `codex/parity301-existing-folder-access`.** Parent : convergence #401, `e745263291dc36ded53a858ca90851008867b3ad`. Aucun composant Claude modifié.

Le code de travail se trouve dans `/workspace/work/parity301-ci-guards`. Cette branche documentaire reprend le code #402 et actualise seulement la matrice et ce point. Le checkout d’exécution `/workspace/work/parity301-intents-v5` reste propre sur D7, avec le build `tf_kwZDK1SseJ07RKa0Tp` ; aucun serveur ni navigateur n’est actif.

## Accès A1 raccordé et borné

#402 raccorde le renommage et le déplacement natifs aux anciens projets A1, sous deux drapeaux indépendants, **fermés par défaut** : `STUDIO_CONVERSATION_EXISTING_FOLDER_RENAME` et `STUDIO_CONVERSATION_EXISTING_FOLDER_MOVE`. Ils exigent aussi EXISTING_LOCAL et les gardes natifs. Aucun environnement client ou fichier .env n’a été activé.

La fiche et les outils IA gardent leurs permissions actuelles : `actionsEnabled:false`, `aiEnabled:false`, `projectRevision:null`, `creation:null`, `correctionFields:[]`. Les cas testés conservent leur absence de Préparation (`stateOf:null`). Aucun identifiant ou numéro de version de fiche n’est inventé pour accéder aux dossiers.

**106 tests sur cinq fichiers et les types passent**, dont 20 nouveaux cas A1. Produits/services acquis, shop.chat, actifs, octets et dépenses restent identiques. Les contrôles couvrent HTTP/auth/CSRF/accord littéral, réponse perdue récupérée par GET sans second POST, concurrence, expiration, annulation, nouveau tour, bit client forgé et retrait du drapeau ou du forfait avant cache. Quatre cas manquants ont échoué avant raccordement. Voir `LOT-ANCIENS-PROJETS-DOSSIERS.md`.

À Claude : les deux cartes utilisent `localEditAllowed(view,'folder-rename'|'folder-move')` et leur capacité serveur. Les factories ont ce contrôle ; ne pas bloquer ces exceptions explicitement déclarées par un rejet global de `view.recovery`. `nativeLocalEditAllowed` reste inchangé et interdit les autres domaines A1. L’adaptation de la carte Prompts préparée et les nouvelles cartes de dossiers, leur verrou commun et les recettes compilées dans les quatre formats après au moins 17 secondes restent ouvertes. Contrats et commits publiés dans #369, commentaire `6632303636`. Dernier HEAD Claude observé : `ecfaa73d27e9e4ece1cb10adee04053e42b33f36`, à reconsulter avant intégration ; aucun nouvel accord de sa part n’est supposé.

## CI observées sur les SHA livrés

| Source | Run | Résultat observé |
|---|---|---|
| #394/#395, CB | 41825544838 et 41825362424 | **SUCCESS complet**. 5 832 tests réussis, 31 exclusions existantes ; 627 fichiers réussis, 1 exclu. Natif 69/69, confirmation 18/18, Docker et verdict verts. |
| #396, 506735a7 | 41828309600 | **SUCCESS complet**. 5 840 tests réussis, 31 exclusions ; 627 fichiers réussis, 1 exclu. Tous les contrôles sont verts. |
| #397, D7 | 41829717764 | **SUCCESS complet**. 5 841 tests réussis, 31 exclusions ; 627 fichiers réussis, 1 exclu. Tous les contrôles sont verts. |
| #398, 504de588 | 41832270177 | Suite 5 869 tests réussis / 31 exclusions, 628 fichiers / 1 exclu. Docker et confirmation verts ; grandes recettes en cours. |
| #399, f7b26159 | 41833620428 | Suite 5 873 tests réussis / 31 exclusions, 629 fichiers / 1 exclu. Docker et confirmation verts ; grandes recettes en cours. |
| #400, 9b050ff3 | 41835440257 | Suite 5 902 tests réussis / 31 exclusions, 630 fichiers / 1 exclu. Docker et confirmation verts ; grandes recettes en cours. |
| #401, e7452632 | 41837147432 | Suite 5 913 tests réussis / 31 exclusions, 631 fichiers / 1 exclu. Docker et confirmation verts ; grandes recettes en cours. |
| #402, 5950fc2c | 41840639425 | En cours, Docker vert. Aucun autre verdict anticipé. |

Les 31 exclusions sont préexistantes. Aucun test ni contrôle obligatoire ou financier n’a été supprimé. Ne pas relancer les contrôles déjà verts.

## Prochaines actions

1. Observer les CI restantes sur leurs SHA, tout en continuant les lots indépendants. Préserver les têtes des PR pour laisser finir leurs CI.
2. Reconsulter les travaux de Claude et intégrer ses cartes sur une nouvelle branche. Qualifier A1 produits/services, Encre/Plein ordinateur/toucher, au moins 17 secondes, source native, reçu, rechargement, réponse perdue et conflit. Les fonctions A1 de #402 n’ont pas encore de preuve navigateur.
3. Vérifier la prochaine lacune sûre : bibliothèque de prompts en lecture seule sur A1, actuellement hors reprise, ou CRUD profil/réservation par store natif distinct. Un droit de lecture ne donne aucun droit d’édition ou de génération. Les pièces jointes demandent un contrat distinct : `photoIds` modifie encore la fiche ; ne pas forcer `assertBriefWritable`.

Matrice unique : **165 unités, 62 PARTIEL, 73 ABSENT, 4 NON_TESTE, 26 BLOQUE, aucune complète**. Les modes A1 ajoutés ne sont pas de nouvelles opérations. Les preuves UI antérieures gardent leur SHA : CB pour quatre recettes (84 étapes, 40 accords après au moins 17 secondes), D7 pour Fichiers naturels (40 étapes, 8 accords). Captures locales seulement. L’historique ci-dessous conserve les preuves et leurs limites.

---

# Convergence backend V8 — priorité de reprise

La mission #301 reste ouverte. Cette convergence reprend les parents `db7600b4` (preuves), `9b050ff3` (Fichiers et dossiers) et `506735a7` (prompts). Tous les composants de Claude restent identiques à `ecfaa73d` ; sa branche n’est pas modifiée.

- **124 tests ciblés sur six fichiers et les types passent** sur cette réunion de branches. Trois nouveaux parcours croisés vérifient les anciens accords invalidés par une lecture, le nouvel accord explicite encore possible, la composition renommage de fichier/renommage de dossier/déplacement et les domaines fermés indépendamment. Préparation acquise et dépenses restent intactes ; zéro appel fournisseur.
- **#400 / `9b050ff3a14411867b3fa768c58138c8393494ec`** raccorde `folders.move` : 90 tests sur sept fichiers et types, dont 29 nouveaux. Contrat `LOT-DEPLACEMENT-DOSSIER.md`. Carte et recette navigateur compilée restent à intégrer par Claude, comme `folders.rename` #398.
- **#399 / `f7b261591cf4c024f54fbc57182d0698f2ba44f8`** corrige le défaut natif démontré à 70 niveaux : deux rouges→verts, déplacement valide conservé,35 tests / types. Aucun dossier client modifié. Contrat `LOT-CYCLE-DOSSIER-PROFOND.md`.
- Claude a reçu ces contrats et commits dans #369, commentaires `6631194514` et `6631466853`. L’adaptation de la bibliothèque de prompts sur projet préparé et les deux nouvelles cartes de dossiers restent ouvertes. Ne pas présenter un moteur/API testé comme une interface qualifiée.
- **CI complète CB / #394 et #395 : SUCCESS**, runs `41825544838` et `41825362424`. Pour41825544838 : 5 832 tests réussis,31 exclusions préexistantes,627 fichiers réussis et1 exclu ;Docker 7/7 étapes,confirmation gratuite obligatoire 18/18,recettes natives 69/69,verdict global vert. Aucun contrôle ignoré dans ces jobs.
- **#396 /506735a7** :suite5 840 tests réussis/31 exclusions,627 fichiers/1 exclu ;Docker etconfirmation verts,grandes recettes encore à observer (run41828309600). **#397 /D7** :suite5 841 tests réussis/31 exclusions,627 fichiers/1 exclu ;Docker etconfirmation verts,grandes recettes en cours (run41829717764).
- **#398 /504de588** :run41832270177 en cours, Docker / confirmation verts au dernier relevé. **#399 /f7b26159** :run41833620428 en cours. **#400 /9b050ff3** :run41835440257 en cours. La CI de cette nouvelle convergence doit être observée sur son propre SHA  ; aucun verdict anticipé.
- Matrice unique :**165 unités** (164 conservées+omission `folders.move`),**62 PARTIEL / 73 ABSENT / 4 NON_TESTE / 26 BLOQUE**, aucune complète. Les preuves compilées antérieures gardent leurs SHA :CB pour Stock / Profil-Dossiers / Calendrier / SEO-Pages-Section,D7 pour Fichiers naturels ;ne pas les réattribuer à V8.

Prochaines actions :observer les CI sans relancer les contrôles verts ;reprendre la prochaine lacune indépendante pendant les CI et les cartes Claude (autres CRUD / profil et réservation,pièces jointes conversationnelles distinctes de la fiche,autres domaines de la matrice). Dès que les cartes arrivent,converger sur une autre branche etqualifier prompts / dossiers dans les quatre formats≥17 s. Garder A1 strictement dans ses permissions actuelles ;aucune dépense réelle, activation, action externe,main ou déploiement.

Le checkout d’exécution reste `/workspace/work/parity301-intents-v5`, propre surD7 avec build `tf_kwZDK1SseJ07RKa0Tp`, sans serveur navigateur actif. Le checkout de travail est `/workspace/work/parity301-ci-guards`, branche `codex/parity301-convergence-v8`. Aligner l’arbre / commit API avant tout lot suivant. Voir ci-dessous les preuves et limites cumulatives.

---

# Point de reprise — lots naturels et renommage de dossier

La mission reste inachevée. Continuer les lots indépendants sans demander une nouvelle autorisation. Aucun fournisseur réel, projet client, activation, publication, fusion main ou déploiement.

## Livraisons et preuves actuelles

- **Fichiers, PR #397 : `d7a04a1612096288c436c7b60ae7d8feba82a0aa`.** Branche `codex/parity301-natural-file-metadata`. Compilation propre, production, BUILD_ID `tf_kwZDK1SseJ07RKa0Tp`. Le checkout d’exécution `/workspace/work/parity301-intents-v5` reste propre sur `codex/parity301-compiled-files-natural`. Aucun navigateur ni build ne tourne après la recette.
- **Recette Fichiers préparés : 4/4, 40 étapes, 8 accords après au moins 17 secondes.** Formulations sans guillemets sur ordinateur et polies au toucher ; désignation native, clarification, annulation, réponse perdue sur les deux ordinateurs récupérée avec un seul POST, reçu/rechargement, déplacement dans les quatre formats, octets et version 1 conservés, aucune copie. L’API confirme la permission native, le verrou de fiche et le SHA du build. Les quatre recherches simulées acquises restent intégralement identiques : 4→4, aucune nouvelle tentative IA, tâche ou erreur JS. Quatre requêtes Google Fonts sont bloquées. Voir `PREUVE-FICHIERS-NATURELS-PREPARE-V2.json` et `scripts/parity301-prepared-natural-files-proof.ts`. Captures locales dans `/tmp/parity301-prepared-natural-files-v2`, jamais ajoutées à GitHub.
- **Traçabilité du harnais :** V1 a échoué avant accord car l’import `waitAtLeast` manquait ; brut conservé dans `PREUVE-FICHIERS-NATURELS-HARNAIS-V1.json`. Aucun correctif applicatif pour cet échec. Une première compilation locale a également été arrêtée pour charger explicitement la garde réseau ; seule la compilation V2 terminée avec cette garde est utilisée comme preuve. Logs distincts `/tmp/parity301-natural-files-build-initial-stopped.log` et `/tmp/parity301-natural-files-build-v2.log`.
- **Renommage d’un dossier, PR #398 : `504de58833ed3851b31719c9e1efe865ad8126d7`.** Branche `codex/parity301-folder-rename`, parent D7. Moteur natif partagé avec PATCH, contrat et transport, aucun composant Claude modifié. **57 tests et types passent** : 28 nouveaux et 29 régressions, routes authentifiées/CSRF, préparation conservée, A1, solde nul, homonymes/concurrence, rollback du reçu et des métadonnées, réponse perdue, ancien pending et changement de projet. Voir `LOT-RENOMMAGE-DOSSIER.md`. Carte et recette compilée indépendante encore requises ; ne pas afficher cette action dans la carte Nouveau dossier.
- **Bibliothèque de prompts, PR #396 : `506735a7b19b972d4b613d05db2eeb4f537232ed`.** Lecture des métadonnées sur projet préparé et formulations usuelles. L’adaptation de la carte par Claude reste ouverte : `nativeLocalEditAllowed(view)` et `localPromptsRead.enabled`, sans ouvrir A1, ni corps/exécution/édition de prompt.

Claude a reçu les contrats et SHA dans #369, commentaires `6630709513` et `6630984345`. Son dernier HEAD observé est `ecfaa73d27e9e4ece1cb10adee04053e42b33f36` : le relire avant toute nouvelle convergence. Sa branche reste intacte.

## CI exacte au dernier relevé

| Source | Run | Résultat observé |
|---|---|---|
| CB / #394 et #395 | 41825544838 | **5 832 tests réussis**, 31 exclusions préexistantes ; 627 fichiers réussis, 1 exclu. Docker et confirmation gratuite obligatoire verts. Grandes recettes encore en cours. |
| #396 / 506735a7 | 41828309600 | Docker et confirmation obligatoire verts ; suite et grandes recettes en cours. |
| #397 / D7 | 41829717764 | Docker et confirmation obligatoire verts ; suite et grandes recettes en cours. |
| #398 / 504de588 | 41832270177 | En cours ; aucun verdict final anticipé. |

La matrice conserve les 163 unités précédentes et ajoute l’omission native `folders.rename` : **164 unités, 61 PARTIEL, 73 ABSENT, 4 NON_TESTE, 26 BLOQUE, aucune complète**. Chaque ligne garde son responsable, sa dépendance, son critère et sa preuve. Cette branche de preuves réunit réellement les parents `5faaf289` et D7 ; le code Fichiers D7 et les composants graphiques Claude sont conservés.

## Prochaines actions

1. Observer les CI finales de ces SHA ; ne pas relancer les contrôles déjà verts.
2. Converger `506735a7` et `504de588` avec les composants Claude dès qu’ils sont prêts, sur une nouvelle branche indépendante. Qualifier la bibliothèque préparée et la nouvelle carte de renommage de dossier dans les quatre formats, avec au moins 17 secondes avant accord.
3. Continuer les autres lacunes indépendantes : déplacement/suppression de dossiers vides, autres CRUD, contenus et réservation. Les pièces jointes méritent un contrat distinct : `photoIds` modifie encore la fiche, donc ne pas forcer `assertBriefWritable` pour ouvrir les projets préparés.

---

# Reprise prioritaire — convergence compilée V7

Source actuelle **cb383590a7811df94153b9698754d3b071bde228**, PR brouillon #394 et complément isolé #395. Vrai merge ce6f96a6 de 06c35ebf et Claude ecfaa73d ; composants Claude repris à l’identique. Le texte historique ci-dessous reste daté ; ne pas en déduire que les anciennes cartes attendent encore leur adaptation : ecfaa73d l’a intégrée, les preuves compilées restent à qualifier domaine par domaine.

Build production propre terminé, BUILD_ID **KqRyToh4Fq2rBTZFXDwi3**. Stock multivariante PRÉPARÉ réellement exécuté : **4/4,20 étapes**, Encre/Plein ordinateur/toucher mobile. Annulation sans écriture,4 confirmations après17001.52/17002.38/17001.02/17002.69ms, reçu/reload sans doublon ; seule quantité ciblée changée, versions produit/variante +1, sœur/prix/SKU/politiques/options identiques. APIversion SHA/prod/clean/build et permission native + fiche verrouillée vérifiées. Baseline4recherches simulées 4→4 intégralement inchangée,0nouvelle tentative/0job/0JS ;4requêtes GoogleFonts CSS bloquées conservées. Rapport PREUVE-STOCK-MULTIVARIANTE-PREPARE-V7.json et harnais scripts/parity301-prepared-stock-proof.ts. Captures locales /tmp/parity301-prepared-multivariant-stock-v7 uniquement. Ancien Stock multivariante a593 non préparé4/4 conservé séparément V6. Aucun correctif applicatif supplémentaire nécessaire pour le sélecteur de variantes déjà natif.

#395 : serviceName du profil proposé/appliqué, aucun nom singulier inventé en ambiguïté ;6tests dont5rouges avant+29régressions/types. Événements Calendrier/Choix de thème nommés explicitement, anciens alias conservés. Claude informé #369/6630144835 des preuves Stock et du SHA exploitable.

CI CB en cours : runs41825544838 et41825362424. Aucun verdict final anticipé. Profil prix/durée/description et dossier sur projets préparés, même build :4/4,16étapes,20accords tous≥17000ms ; prix75€/durée45min/description fournie/effacementprix/destinationracine clarifiée aprèsreload/dossier relu. Baseline4→4 inchangée,0nouvelle tentative/0externe/0JS. Rapport PREUVE-PROFIL-DOSSIERS-PREPARE-V7.json, harnais scripts/parity301-prepared-profile-folder-proof.ts ;captures locales /tmp/parity301-prepared-lot6-v7. Calendrier préparé terminé :4/4,20étapes,4accords≥17s,annulation/reload/+2jours,fuseau/texte/statut/réseauconservés,0nouvelleIA/0job/0JS,4GoogleFonts bloquées. Rapport PREUVE-CALENDRIER-PREPARE-V7.json etharnais scripts/parity301-prepared-calendar-proof.ts. Branche d’exécution codex/parity301-compiled-v7, aucun build supplémentaire à lancer pendant Chromium. Pour reprendre : vérifier log et processus, puis qualifier domaines indépendants, observer CI exacteCB, actualiser matrice sans déclarer la parité complète. 163unités conservées,60PARTIEL/73ABSENT/4NON_TESTE/26BLOQUE à ce relevé. Lecture metadata de prompts corrigée dansPRbrouillon#396/b59283baf847785c739bad9f0c51476daa46db0c (parentCB),2rouges→verts,42tests/types ; adaptationUI transmiseClaude#369/6630247893,CI41827028216en cours. Photos liées à une fiche verrouillée restent à analyser séparément ; ne pas élargir A1.

---

# Reprise continue #301 — 4 novembre 2026, 11 h 30 UTC

**Mission inachevée : continuer sans nouvelle autorisation entre les lots.** Aucun fournisseur réel, client, envoi/activation, fusion main ou déploiement. Codex possède moteurs/contrats/intentions/permissions/reprise ; Claude possède composants, désignation, aperçu, verrou commun et recettes indépendantes. Ne pas refaire #348.

## Source commune actuelle

**PR brouillon #394, branche codex/parity301-convergence-v6, SHA a593e6ea510232f0a0946c369538fab29a60a327.**

- Parent du correctif :895f2895b5f3e3e3ba19b3185fe2e4a38f6d0aee, vrai merge de Codex 72111052a36cae4bcbd729a7b2d3a4f29af72b12 et Claude 12d75fed730636a8727aa340535541882c27d39c.
- Tous les composants graphiques Claude sont repris à l'identique. Sa branche est inchangée. Son correctif de désignation Stock depuis le message est conservé et testé.
- a593e6ea ajoute le contrat de permission native décrit ci-dessous ; aucun composant/style modifié dans ce correctif. La branche codex/parity301-prepared-local-permissions pointe aussi sur ce SHA, sans PR supplémentaire nécessaire.
- Ne pas refusionner l'ancienne convergence #371 / 827795d :ses anciens défauts sont déjà corrigés dans l'ascendance.

## Blocage préparé : contrat corrigé, cartes à intégrer

Claude #369/commentaire6628337323 a démontré qu'un projet dont la préparation est acquise garde un readOnlyReason de FICHE, et que ce verrou masquait des exécutions natives gratuites pourtant acceptées par les moteurs. Trois tests normatifs ont reproduit le défaut.

Contrat livré dans a593e6ea :**localEditsWritable:boolean**, calculé serveur propriétaire/forfait actif ; drapeau de chaque opération et tous ses contrôles natifs restent obligatoires. readOnlyReason/correctionFields et le refus409 de réécriture de fiche restent inchangés. `nativeLocalEditAllowed(v)` pour les domaines sans exception A1 ; `localEditAllowed(v,'local-site'|'files')` conserve exclusivement recovery.localEdits.ops en A1. Aucun droit A1 supplémentaire. Photo/brief et prompts gardent leurs conditions existantes pour ce lot.

**226 tests ciblés et types passent** :4 métier dont3 rouges avant,140 protocole dont42 nouveaux,1désignationStockClaude,81 régressions A1/recovery/corbeille/Site/Publicité. Stock vraiment confirmé par son contrôleur/moteur/SQLite sur projet préparé, préparation entière identique ; interdiction explicite et abonnement révoqué bloquent.

À Claude :adapter les conditions des cartes encore fondées sur !readOnlyReason (Stock/Calendrier/Thème/SEO/Pages/Profil/Publicité etc., et revalidation ad-document dans conversation-panel). Site/Fichiers utilisent déjà le helper partagé. Contrat complet :LOT-PERMISSIONS-PROJET-PREPARE.md. Message avec SHA et instructions transmis dans #369/commentaires6629227199 et6629399174.

## Preuve compilée réellement exécutée

Build production propre **a593e6ea**, BUILD_ID **jwsvUx8YsZIInqI3NCScA**. /api/version confirme ce SHA, originbuild,production,treeclean,compiled-build.

**Image sur projets PRÉPARÉS :4/4 parcours,16 étapes**, Encre/Plein×1440/390, produits/services. Les4vues servies prouvent localEditsWritable=true et fiche encore verrouillée. Première image native désignée à la souris/au toucher réel ; miniatures chargées/pixels après exacts ; annulation sans écriture ; nouvelle proposition,minimum monotone17 s,accord/version/champ exact,image iframe effectivement chargée ; reload sans doublon ; annulation naturelle avec accord et restauration exacte.

La fixture contient4 recherches acquises SIMULÉES. Premier relevé brut conservé :parcours4/4 mais échec du compteur globalai_calls=4. Second relevé capture et vérifie intégralement la baseline identifiée provider=simulated/model=fixture/id=fixture_research_*. **4→4,baseline inchangée,0nouvelle tentative,0externe,0JS.** Aucune ligne supprimée, tout appel inconnu/nouveau ou baseline modifiée ferait échouer la recette. Voir PREUVE-IMAGE-PROJET-PREPARE.md, PREUVE-IMAGE-PREPARE-V2.json et scripts/parity301-prepared-image-proof.ts. Captures locales /tmp/parity301-prepared-image-v2 uniquement ; aucune capture GitHub ajoutée.

Cette preuve qualifie Image/Site préparé ; pas les autres cartes. La précédente preuve Image4/4 sur488da3e est conservée dans PREUVE-IMAGE-CONVERGENCE-V5.json. Le signalement hero_editorial_1 non visible n'a pas été reproduit :première cible native produits réellement cliquée/touchée, template es-image→img ; aucune correction graphique spéculative.

## Lots livrés, tous brouillon et non fusionnés

| PR | SHA | Résultat local et limite |
|---|---|---|
| #372 image | 73c8865a942b556035dd89258a05f6cdfdf2a4c1 | 12 métier+24 régressions,recette production4/4 ; noms/stems uniques,octets/source/version/undo natifs |
| #373 stock | 97a8a15820fca4f350845b7b8473d9f41650cdac | 11 métier+9PATCH natifs ; produit/variante/CAS,aucune synchronisation |
| #374 nom prestation | d315af5ea0c82f646bc531b40f941a4fa777934d | 7 métier,identités/alias natifs ; pas un service réservable |
| #375 calendrier | 0561c6cfc9aee5609fe71e00dd07544efe5e6258 | 16 métier ; brouillons/planned/review seulement,timezone/DST,snapshot entier ; aucun envoi |
| #376 choix thème | cf159b91358934c3d83bb203a2c011eb1a49360d | 10 métier ; aperçu INACTIF puis choix de travail gratuit,garde natif et report manuel ; amélioré#381 |
| #377 bibliothèque | 2da4884f4c828e588992f9da3471d3c70132db0c | 7 nouveaux+20 fichiers ; metadata/ID/URL/version,aucune vision |
| #378 photo | 0d37f5fc74490b378c81d997150172613e56b439 | 14routes/SQLite/fichiers/reçu atomique ; photo explicitement jointe,aucune analyse ; UI encore ouverte |
| #379 animation | 93f5bf94b865f5ea5065970ccd801a022b7f000f | 9 nouveaux+93 régressions ; droits natifs/Créer/locks conservés |
| #380 deux tests CI | 1091793754e016ee8bf98cd671368c1379afc0a6 | 59 ciblés ; attentes services/calendar obsolètes corrigées,seulement2 tests ; son autre défaut de harnais temps est#385 |
| #381 baseline manuelle | 04b37b021fc3cd88bc1954e86c51d56cc2316c96 | 3 rouges→verts+10thème+14natifs ; fallback natif seulement,perte bloquée avant choix |
| #382 restauration site | 0b627c90cceead14070e4c159b9b0e2d43a64366 | 13 métier+112 régressions ; versions acquises/2aperçus/hashmédias/reçus undo gratuits ; importé exclu |
| #383 convergenceV4 | af6e16b85a054e02ff797f68eb24e85276dafbb1 | vrai merge miniatures Claude b280657b ; build propre/Image4/4/16 étapes |
| #384 coordonnées | 8024d2e9acbf296002ea5ef543ccb4bbedb6c771 | 8 métier+20 knowledge/types ; téléphone/email/zone ; adresse synchronisée exclue |
| #385 attente fiable | df4fce028547771f3e96d3a187a3919c51fe062d | 3 tests/types ; minimum monotone17000ms,8 accords réels en4 parcours ; aucun seuil/workflow/garde réduit |
| #386 atomicité dossier | 3a035bf2a44eb37bedf0e249e6f0f9f38d22cee3 | 2 rouges→verts,3 tests+7bibliothèque ; validation avant UPDATE des seuls champs fournis |
| #387 créer dossier | 9c9efda6f23224f9983fb39c932af181154fc128 | 14 métier+91 transports+30 régressions ; parent/racine exacts,aucun fichier déplacé |
| #388 convergenceV5 | 488da3e572c0fd2d2289021c1134b795d3719dce | vrai merge#387/#385 ; production/Image4/4/16 étapes,versionAPI vérifiée |
| #389 dialogue dossier | e8c5a2c15332c270d06db13b3b0c6903e315b9db | 8 nouveaux+14 métier+91 transports ; phrases sans guillemets,précision persistante du parent,reload/TTL,accord distinct |
| #390 prix profil | 43b1256c3fbd98501299ba5169c0618f53715ce6 | 8 nouveaux+52 régressions ; prix affiché textuel,effacement natif rouge→vert,réservation inchangée |
| #391 durée profil | 4f3f0df14310f0ed5c8593f0016a9834e06b0bf3 | 7 nouveaux+68 régressions ; durée affichée textuelle,effacement natif rouge→vert,aucun créneau modifié |
| #392 description profil | 9f40fb52b3bcd25d1172672077d39e03896f3812 | 7 nouveaux+59 régressions ; texte fourni multiligne,aucun fait généré,bulk=clarification gratuite |
| #393 corbeille | 72111052a36cae4bcbd729a7b2d3a4f29af72b12 | 162 ciblés/types ; restauration d’un fichier acquis,ID/version/octets/statut conservés ; pas de nouveau droit A1 |
| #394 convergence/permission | a593e6ea510232f0a0946c369538fab29a60a327 | Claude 12d+Codex 721,vrai merge ; 226 ciblés/types+preuve Image préparée4/4 ; autres cartes préparées à adapter |

Les contrats LOT-*.md sont dans ce dossier et chaque SHA exploitable a été transmis à Claude dans #369. Les cartes des nouveaux champs Profil, photo, animation, restauration site, dossiers et corbeille restent à intégrer/qualifier. Les recettes déclarées par Claude sur 12d (Stock/Calendrier/Prestation/Bibliothèque4/4,Thème services2/2) ne sont pas des preuves indépendantes compilées sur a593 ; produits/préparés restent à rejouer.

## CI exacte au dernier relevé

| PR/SHA | Run | Résultat |
|---|---|---|
| #372 / 73c8865 | 41797066076 | SUCCESS :5556 pass/31 skips,601fichierspass/1skip |
| #373 / 97a8a15 | 41799372210 | SUCCESS :5574 pass/31 skips,602fichierspass/1skip |
| #381 / 04b37b0 | 41808380657 | SUCCESS :5661 pass/31 skips,609fichierspass/1skip |
| #382 / 0b627c9 | 41808879291 | SUCCESS :5681 pass/31 skips,610fichierspass/1skip |
| #383 / af6e16b | 41809285172 | SUCCESS :5682 pass/31 skips,611fichierspass/1skip |
| #384 / 8024d2e | 41812294387 | SUCCESS :5690 pass/31 skips,612fichierspass/1skip |
| #385 / df4fce0 | 41812683859 | SUCCESS :5685 pass/31 skips,612fichierspass/1skip |
| #388 / 488da3e | 41813937435 | Suite5717 pass/31 skips,615fichierspass/1skip ; Docker etconfirmation obligatoire verts,grandes recettes en cours |
| #394a593e6ea | 41820841545 | CI en cours sur CE SHA,aucun verdict anticipé |

Les skips sont préexistants,pas ajoutés. Les anciennes CI #374/#375 attendent à tort services.update/calendar.update absents ; #380 corrige ces deux attentes en renforçant les assertions. Les stderr cookies hors contexte sont des tests administrateur qui passent. #380 reste historiquement rouge sur son assertion de temps avant clic :#385 corrige la mesure monotone,sans prétendre réparer une perte applicative ni maquiller l'ancien SHA.

Création d'une PR séparée poura593 :plusieurs ReadTimeout puis erreur interne MCP32603 ; liste de PR vérifiée,sans doublon. CLI configurée mais appel réseau Forbidden :aucun proxy/politique/identité modifié. Solution livrée :avance rapide non forcée de notre branche #394895→a593,PR toujours brouillon,CI déclenchée. Ne pas continuer à créer une hypothétique#395.

## Matrice unique et workspace

Même CSV/MD historiques MATRICE-CONVERGENCE-84.*,163 unités (162conservées+omission folders.create). **60 PARTIEL,73 ABSENT,4 NON_TESTE,26 BLOQUE ; aucune complète.** Les77 décompositions sont un inventaire,pas77bugs prouvés. Corbeille et champs Profil actualisés ; cartes préparées/CI communes restent des critères ouverts.

- Source compilée propre :/workspace/work/parity301-intents-v5,branche locale codex/parity301-compiled-permissions,HEAD a593. Build /tmp/parity301-prepared-permissions-build.log terminé0.
- Recette préparée :/tmp/parity301-prepared-image-v2,log voisin ; harnais temporaire ignoré.next/prepared-image-proof.mts,version publiée comme scripts/parity301-prepared-image-proof.ts. Premier relevé brut conservé /tmp/parity301-prepared-image.
- Documentation courante :/workspace/work/parity301-ci-guards,branche codex/parity301-continuous-matrix-v6,base a593,modifications de docs/harnais/preuves seulement. .next y est un lien vers le build source.
- Ancien checkout de panne parity301-next-domains avec merge/WIP reste INTACT. Ne pas reset/clean ce checkout. Aucun build/Chromium concurrent nécessaire. Garder suffisamment de disque ; seul notre cache.next/cache/webpack peut être libéré quand inactif.

## Prochaines actions exactes

1. Suivre la CI41820841545 au SHA a593 ; corriger seulement les défauts démontrés,ne pas relancer tous les tests sans cause.
2. Intégrer sur NOTRE branche le prochain commit exploitable Claude qui adapte ses cartes à localEditsWritable/helpers. Ne pas modifier sa branche. Rebuild propre,puis vraies recettes préparéesStock/Calendrier/Thème/SEO/Pages/Profil/Publicité4modes17 s,toucher,accord/annulation/reload/conflits. Les transports sont prêts ; pas de preuve finale de ces cartes actuellement.
3. Continuer les lacunes moteur indépendantes durant les CI :variantes multiples et clarifications Stock dans le vrai parcours (Claude ne les a pas qualifiées),CRUD dossiers,versions/corbeille/consignes,nouveaux champs et services réservables avec leurs propres IDs/versions. Adresse du profil appelle syncBookingAddress et crée une version du site :pas d'écriture simple de profil.
4. Photo/brief sur projet préparé,lecture de prompts après verrou,réservations et demandes externes restent à qualifier. A1 garde seulement ses exceptions explicitement existantes,aucune permission générale déduite du nouveau booléen.
5. Connexions/envois/publication/domaine/paiement réels restent non autorisés. Préparer les scénarios/contrats nécessaires,poursuivre les autres modules sans achat ni activation. Mission complète seulement après couverture vérifiée ou exclusion précise décidée par le propriétaire,aucune conclusion “terminé” par fin de lot/CI.

Précision preuve Profil V7 : le libellé brut du harnais Claude disait «description multiligne», mais sa phrase envoyée contient UNE ligne, vérifiée exactement. Le brut est conservé ; seul le compte rendu/harnais reproductible corrige ce libellé, sans revendiquer de preuve navigateur multiligne. Les tests moteur multiligne #392 restent distincts.


## Relevé suivant : SEO/Pages/Section et intentions naturelles

Sur le même CB compilé, SEO/Pages/Section préparé **4/4,28étapes,12accords≥17s** : titre SEO relu dans le<title> servi, annulation métadescription sans écriture, modèle natif sélectionné, page brouillon enregistrée et relue, seule section désignée masquée. Baseline4simulées→4 inchangée,0nouvelle tentative/0externe/0JS. Harnais scripts/parity301-prepared-seo-pages-proof.ts et PREUVE-SEO-PAGES-SECTION-PREPARE-V7.json. Premier essai de harnais avait omis l’import all et échoué avant navigateur ;corrigé sans changement applicatif,log /tmp/parity301-prepared-seo-pages-v7.log distinct du succès /tmp/parity301-prepared-seo-pages-v7-v2. Captures locales seulement.

#396 est désormais **506735a7b19b972d4b613d05db2eeb4f537232ed**,2commits depuisCB. Lecture préparée +4formulations usuelles dont polies,4rouges→verts et2demandes mixtes refusées.42tests initiaux,39bibliothèque/consentement puis31bibliothèque avec2mixtes ;types verts. CI du nouveauSHA run41828309600 ;ancienb592 nonattribuable. Carte Claude encore à adapter ;message#369/6630431121.

#397 indépendante **19b546e8a6921fdd26b312b81316f45a05e2601d**,parentCB,branche codex/parity301-natural-file-metadata. Renommage/déplacement gratuits sans guillemets obligatoires etpolitesse,reçus/DTO/transports natifs inchangés.4rouges→verts,56ciblés(Fichiers/A1/bibliothèque),puis29Fichiers avec4mixtes+1nom cité littéral ;types verts. Aucune preuve compilée de ces NOUVELLES formulations anticipée. Contrat LOT-FICHIERS-PHRASES-NATURELLES.md ;Claudeinformé#369/6630530671.

CI CB run41825544838 :Docker ETconfirmationgratuite obligatoire SUCCESS ;suitecomplète etgrandesrecettes encoreencours au dernier relevé. Prochaine action :observer ces verdicts et CI#396/#397 sans relancer les contrôles déjàverts ;converger les petits lots surune nouvelle branche,reprendre les cartes Claude sans modifier sa branche,qualifier les nouvelles formulations compilées,puis continuer les lacunes restantes. Photo :import natif gratuit possible mais photoIds modifie actuellement la fiche ;ne pas ouvrir l’UI surprojetpréparé sans contrat de piècejointe distinct,ne pas forcer assertBriefWritable. Toutes lesrestrictions initiales demeurent.
