# #211 — D4 : recherche native et reprise depuis SYNA

## Version et périmètre

Livrable pour revue dans **PR #221**, branche `codex/211-lot-d4-recherche-native`, dépendance directe **#220** `c053d5452ea62e56348b14bc9536683702c09d2f`. Code testé et réellement servi dans la recette : **`c6cbc69b4be33ea8c216c0887f2cd09a5a95c5ff`**, arbre propre, version issue du build de production. Les preuves suivantes sont ajoutées après ce code ; elles ne constituent pas un déploiement. Main n’est pas modifié.

SYNA peut proposer une recherche du moteur Préparation, établir son devis natif, attendre un accord distinct, lancer le vrai job puis afficher le résultat conservé dans une version immuable. Les sources, observations, cinq hypothèses et recommandation restent à relire. **Aucun angle sélectionné/approuvé, quota consommé, marque, rédaction, média ou thème créé automatiquement.** La compréhension préalable doit déjà avoir été validée dans le parcours natif ; D4 ne raccorde pas cette validation au dialogue.

La mission #211 continue après cet incrément. Aucune fusion, activation, publication, connexion, modification commerciale, donnée client/démo ou composition de Claude touchée. Les drapeaux sont inactifs par défaut.

## Changements et preuves

| Changement | Fichiers / fonctions | Vérification |
|---|---|---|
| Outil recherche strict et contrôlé | `research-tool-contract.ts`, `research-tool-execution.ts` : `quoteResearch`, `confirmResearch`, `researchReceipt`, `researchRegistry` ; route `/api/studio-agent/conversations/[cid]/research` | Droits, propriétaire, forfait, révisions, expiration, proposition liée, champs forgés et limites testés. Aucun job avant accord. |
| Réutilisation des moteurs existants | `createQuote` / `quoteOf`, `queuePreparation`, `project.prepare`, moteur et worker Préparation natifs | Vraie version `preparation.version.N`, appel réussi lié au même compte/projet/job/usage ; un simple job `done` ne suffit pas. Aucune seconde orchestration ni mémoire parallèle. |
| Devis honnête | `quoteResearch` et `conversation-research-tools.tsx` | Le moteur n’a pas d’estimation pour cette opération : « Indisponible » affiché, maximum natif et expiration visibles, accord distinct. Aucun prix probable inventé. |
| Acquis et corrections conservés | Reçus, versions natives, corrections dans la mémoire commune ; `intelligence-context.ts` | Reconnexion, changement d’onglet, relecture et réutilisation sans nouvel appel. Échec de correction : première recherche toujours consultable. |
| Conversation unique et résultat lisible | `conversation-panel.tsx`, `conversation-research-tools.tsx`, contrat/vue/drapeaux et registre | Même SYNA, sources et cinq cartes détaillées, provenance et hypothèses explicites. Aucun choix stratégique automatique. |
| Projection manuelle actualisée | `marketing-strategy.tsx` | **REPRODUIT puis corrigé** : après succès dans SYNA, la carte manuelle restait sur « avant les propositions ». Elle relit maintenant sa projection quand la révision native du projet change, sans effacer une saisie ou un choix. Assertion API `research_ready`, puis bouton de reprise sans appel visible dans le navigateur. |
| Reprise après échec | Effet de rafraîchissement des reçus dans `conversation-research-tools.tsx` | **REPRODUIT puis corrigé** : une tâche échouée changeait la révision native, mais seul un succès rafraîchissait la conversation. Le message suivant était refusé pour conflit. Un état terminal déclenche maintenant une seule relecture groupée. Message gratuit après échec : HTTP 200, présent dans l’historique visible et relu en API. Aucun retry de génération. |
| Limite avant devis | `requestHash` et `attemptProblem` natifs relus par `quoteResearch` | Deux demandes au plus pour les mêmes données, échecs compris. Troisième demande refusée **avant nouveau devis/accord/job/réservation**, y compris après une nouvelle intervention dans le chat. Aucune limite relevée. |

Les chemins abrégés de la première colonne serveur sont dans `src/lib/orchestrator/conversation/`, les composants dans `src/components/studio/`. Tests : `tests/conversation211-research.test.ts`. Recette : `scripts/verify-agent211-build.ts --research-ui`, `verify-agent211-research-ui.ts`, `research211-ui-fixtures.ts`. La CI conserve ses contrôles antérieurs et ajoute cette recette et son artefact.

## Budget, sécurité et états

- Plafond natif de recherche **1 000 000 micro** inchangé ; affichage client en pourcentage du budget commun. Règles abonnement 40 % HT et recharge 50 % HT conservées. Aucun portefeuille par spécialiste.
- Enveloppe commune, profondeur et échéance natives ; maximum de réparations JSON dérivé du parseur existant, pas d’une liste de modèles ajoutée. Un résultat incertain empêche une nouvelle confirmation dans la même enveloppe.
- Consentement idempotent : plusieurs confirmations du même devis retrouvent le même job. Fournisseur indisponible, forfait révoqué, conflit ou plafond : refus explicite, pas de résultat local de remplacement.
- Isolation : conversation/projet/propriétaire, CSRF, contrôle du forfait et des préconditions à la confirmation. Un compte étranger reçoit 404 ; origine étrangère 403. Champs `capMicro`, `approve` et commandes non prévues refusés.
- Preuve : job fermé correctement + version native possédée + trace d’appel liée. Un drapeau de simulation hérité ne masque pas l’absence de reçu si une exécution fournisseur est annoncée. Aucun statut « recherche enregistrée » fondé seulement sur HTTP 200.
- Corrections : 1 200 caractères au plus dans le contrat existant. Version précédente conservée, aucun effacement ou remplacement automatique. Les acquis restent lisibles même sans budget pour un nouvel essai.
- Activation : `STUDIO_CONVERSATION_RESEARCH=1` dépend des drapeaux conversation IA/spécialistes/outils. Aucune activation de l’instance réelle effectuée.

## Commandes réellement exécutées

Depuis la copie dédiée, sans `.env` ni sélecteur de stockage client :

```bash
npx tsc --noEmit
npx vitest run tests/conversation211-research.test.ts tests/conversation211-tools.test.ts
NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs XDG_CACHE_HOME=/tmp/ecom209-font-cache npx vitest run
NEXT_TELEMETRY_DISABLED=1 XDG_CACHE_HOME=/tmp/ecom209-font-cache npm run build
CHROMIUM=/usr/bin/chromium PLAYWRIGHT_BROWSERS_PATH=/tmp/ecom211-playwright XDG_CACHE_HOME=/tmp/ecom209-font-cache NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs npx tsx scripts/verify-agent211-build.ts /tmp/ecom211-D4-delivery --research-ui
```

Résultat final : **3 688 réussis, 45 ignorés, 427 fichiers réussis / un ignoré, 723,34 s** ; **25 ciblés / deux fichiers, 6,63 s** ; types et build propre réussis. Les treize fichiers applicatifs/tests modifiés ont été gelés puis comparés par SHA-256 pendant la dernière suite. Deux suites complètes antérieures avaient également réussi ; elles ont été suivies des corrections de projection et de reprise, puis du contrôle complet final. Aucune assertion métier supprimée pour faire passer les recettes.

Les premiers harnais ont été corrigés : mauvais sélecteur Playwright relatif, puis attente explicite de la réponse de confirmation avant de démarrer le worker. La reprise est maintenant vérifiée par HTTP 200 **et** par l’historique natif, pas par le seul texte éventuellement encore présent dans une zone de saisie.

Pas de changement de renderer ou thème dans D4 : aucun nouveau Theme Check local spécifique revendiqué. Tous les contrôles de thèmes/exports de la CI sont conservés ; CI des parents #218, #219 et #220 vérifiées vertes. **CI finale #221 à suivre, non présumée verte.**

## Recette finale et fichiers

[Galerie : 34 captures originales et deux vidéos](preuves-211-D4/README.md) · [preuve du serveur compilé](preuves-211-D4/api-proof.json) · [vérifications et empreintes](preuves-211-D4/verifications.json) · [budget et reprise](preuves-211-D4/budget-et-reprise.json).

Deux projets fictifs, nouveaux dans ce développement : kit de semis pour balcon et restauration de cartes anciennes apportées par leur propriétaire. Aucun traitement dépendant de leur nom dans l’application.

1. Compréhension native préalablement approuvée dans la fixture, demande libre dans SYNA et proposition IA simulée.
2. Devis natif séparé, estimation indisponible signalée, maximum affiché, consentement, véritable job/worker/SDK et version conservée.
3. Contrôle de la projection manuelle, ouverture des cinq hypothèses, comparaison de **tous leurs champs textuels** avec le résultat natif ; sources fictives explicitement étiquetées.
4. Ordinateur 1440 px pour le produit, téléphone 390 px pour le service ; contrôle des résultats à **390 et 360 px** pour les deux, sans débordement de document. Le devis final est capturé à 390 px ; ce n’est pas une qualification de chaque composant à toutes les largeurs.
5. Nouvel onglet et nouvelle session : résultat identique, aucun appel supplémentaire. Réutilisation acquise, 404 inter-compte et CSRF 403.
6. Correction explicitement demandée et consentie, panne HTTP 503 simulée : échec visible, aucune relance, recherche précédente conservée.
7. Message gratuit après échec réellement enregistré ; troisième demande refusée avant devis/accord, sans appel supplémentaire.

Les vidéos sont les enregistrements réels de Chromium, transcodés en MP4 : toutes les images et la durée conservées, aucune coupe ni accélération. Contrôles `ffprobe` dans [videos-inspection.json](preuves-211-D4/videos-inspection.json). Les 34 captures ont été ouvertes en six planches, cinq originaux clés lus en pleine résolution ; six images des deux vidéos ont été extraites et ouvertes. Les données sont fictives ; les identifiants textuels de modèles dans les JSON sont remplacés par des empreintes. Les captures originales gardent les libellés réellement affichés par le Studio.

## Réel, simulé, non vérifié

**RÉEL DANS LA RECETTE ISOLÉE** : navigateur, build propre identifié, authentification, routes, consentements, worker, réservations/usages, versions, mémoires, affichage et reprise. Pas de base ni média client utilisé.

**SIMULÉ** : fournisseur HTTP local derrière le vrai SDK et contenu de la recherche. Les cinq pages sources sont **entièrement fictives et préacquises** dans le checkpoint `research-pages-v3` avant le démarrage du worker. La collecte Internet n’a donc pas été exécutée ni qualifiée. Les contrôles natifs de catégories, citations, distinctivité, reçus et versions s’exécutent ; ils ne prouvent ni la véracité d’un marché ni la pertinence créative d’une stratégie.

Neuf requêtes de **génération** locales simulées, neuf traces, sept usages connus : **55 384 micro fictifs**. Deux réservations incertaines de 503 : maximum agrégé **329 095 micro fictifs**, conservé séparément, **pas annoncé comme coût confirmé**. Les comptes de recette sont distincts ; ces totaux ne sont pas une facture client. **Zéro fournisseur réel, coût réel 0 €.** Les requêtes de comptage de jetons du faux fournisseur ne sont pas assimilées à des générations.

**PARTIEL / À POURSUIVRE** :

- Le contexte cognitif reçoit un index déclaré des sources/hypothèses et les observations exactes. Extraits intégraux, objections, arguments et justifications longues exclus sont nommés explicitement ; le résultat entier reste dans la carte et Préparation. Aucun document entier prétendument lu à partir de cet index.
- **Limite native reproduite** : `analyzeResearch` appelle `lintClaims(out.angles,p)` ; une direction visuelle négative « sans personne ni avis » est refusée lexicalement pour « avis ». Une réserve négative contenant « garanti » dans un argument est également refusée. Aucune protection supprimée : les arguments du faux fournisseur ont été rendus factuels et sa direction visuelle réduite au matériel seul ; description/réserves client et sources restent intégrales. Correctif de portée à traiter séparément, avec cas affirmatifs/négatifs ; D4 ne qualifie pas ce contrôle sémantiquement. [Évidence fermée](preuves-211-D4/limite-native.json).
- Certains panneaux manuels, notamment l’en-tête Images avec la colonne SYNA ouverte, restent visuellement comprimés ; cela apparaît dans les originaux. Finition F2 à poursuivre, sans modification des compositions de thèmes. L’indisponibilité d’images affichée dans cette recette provient des clés réelles volontairement absentes ; ce n’est pas un diagnostic de vos fournisseurs configurés.
- Pas de sélection/validation de recherche par conversation, de marque/logo, nouveaux textes de Site, images, vidéos, catalogue/variantes, SEO/blog, campagnes, réseaux/calendrier, RDV ou connexions raccordés par ce lot. Les exports/compositions/captures déjà livrés dans leurs parents sont conservés. Ni CMS installé, paiement, publication, recherche Internet ou fournisseur réel testé.
- La troncature des entrées des correcteurs/rédactions natifs est traitée en parallèle dans E4, copie indépendante ; **pas incluse dans #221**. Les créations professionnelles et les autres outils D/E/F2 restent dans #211.

## Complément propriétaire 6476774872 : compagnon permanent et couverture réelle

La définition de SYNA comme compagnon expert permanent est intégrée à la suite de #211. Ce livrable ne constitue pas encore la matrice exhaustive de chaque contrôle du Studio. État honnête des opérations concernées :

| Opération / connaissance | État à cette livraison | Limite |
|---|---|---|
| Recherche : devis, accord, lancement, reçu, correction, reprise, refus d’un essai supplémentaire | Testé isolé avec fournisseur simulé | Sources fictives préacquises ; Internet et fournisseur réel non testés. |
| Analyse d’offre D1, retouche exacte D2, composition avec acquis E2, export D3, captures techniques E3 | Testés isolés dans leurs parents, avec niveaux de preuve décrits dans leurs rapports | Aucune qualification créative réelle ni activation client. |
| Sources/observations/cinq hypothèses de cette recherche, versions et erreurs | Implémenté et testé isolé | Lecture complète pour le client ; contexte IA sous forme d’index explicitement délimité. |
| Choisir/valider un angle depuis la conversation, comparer librement A/B avec recommandation vérifiée | Pas encore raccordé | Consultation ne vaut pas sélection et ne consomme pas de quota. |
| Résoudre « cette section », « la deuxième proposition », « cette image » depuis la sélection courante | Pas encore raccordé au contexte actif complet | Les plans déjà branchés emploient des IDs/versions explicites ; ne pas prétendre connaître une sélection absente. |
| Documentation exhaustive et versionnée de tous écrans, droits, erreurs et opérations | Pas encore raccordée | Les sources produit limitées du lot B restent disponibles ; elles ne constituent pas une connaissance exhaustive. |
| Marque/logo, médias, catalogue/variantes, rédaction/SEO/blog, campagnes, réseaux/calendrier, RDV, connexions | Pas encore raccordés par D4 | Leurs onglets/moteurs natifs existent ; existence manuelle ne vaut pas capacité conversationnelle. |
| Fournisseur réel, instance client, validation visuelle propriétaire de SYNA | Non vérifiés / non obtenus pour ce lot | Aucun statut « testé réel », « sur instance client » ou « validé propriétaire » attribué. |

Après D4/E4 : inventorier réellement les opérations/contrôles et leurs sources ; distinguer absent, connexion en développement, implémenté, testé simulé, testé réel après accord, testé sur instance client et validé propriétaire. Compléter la connaissance produit, la cible active et les comparaisons versionnées, puis les outils natifs par PRs ciblées. Une déclaration de rôle, un texte convaincant ou une option affichée ne prouve pas l’exécution. Aucun changement de budget, autorisation ou accès commercial n’en découle.

### Reprise de l’environnement

L’interruption a été levée : les 47 fichiers d’artefacts, les 46 empreintes déclarées et les treize empreintes de code/tests ont été revérifiés sans écart. Les journaux temporaires ont disparu ; aucune nouvelle génération D4 n’a été nécessaire. Les captures/vidéos publiées sont celles du build propre déjà contrôlé. Le dernier complet E4 n’étant pas récupérable, il est vérifié à nouveau séparément avec journal persistant ; aucun résultat inconnu n’est annoncé réussi.

## Intégration proposée, sans la réaliser

Respecter les dépendances ouvertes : #208/#210 → B #212 → C #213 → F1 #214 → D1 #215 → D2 #216 → E1 #217 → E2/F2 #218 → D3 #219 → E3 #220 → **D4 #221**. Relire la CI et le SHA exact avant toute décision d’intégration. Les droits, budgets, historiques, VANS étape 1, Contretemps et les démonstrations restent préservés ; aucune activation ou fusion n’est déduite de cette livraison.
