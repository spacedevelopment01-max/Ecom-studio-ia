# SYNA — A1 : reprise sûre des projets historiques (#284)

**A1 livré en branche pour validation ; arrêt avant A2.** Une boutique ancienne et un projet de services ancien, déjà remplis mais sans Préparation, peuvent ouvrir un fil SYNA persistant et lire leurs acquis. Le rattachement ne reconstruit rien et n’active ni outil métier ni réponse IA.

Autorisation : [GO A1 du propriétaire](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/284#issuecomment-6545220094). Branche indépendante `codex/syna-284-a1`, base `37fcfd2526705d274fd813b5da95be46058b7c9f`. **Commit applicatif et harnais vérifiés : `9a2e50f7ac5e958d32ab542acaf686097cdc9dee`** ; le commit suivant ajoute seulement ce compte rendu et les preuves.

## Fait

- `openProjectConversation` rattache un ancien projet rempli en lecture seule, sous transaction immédiate et contrainte native `project_id UNIQUE`. Un brouillon de démarrage ne peut toujours pas écraser un projet rempli. Les projets ayant une Préparation ou une conversation conservent leur parcours existant.
- Aucun appel à `initialize` pour la reprise historique, aucune nouvelle fiche canonique et aucune fusion avec `shop.chat`. Le marqueur de reprise appartient uniquement aux données de conversation.
- Nouveau contrat `recovery` dans la réponse `studio-conversation-1`, commun aux futures présentations Encre/Plein cadre : état `read-only`, contexte natif sourcé, empreinte `contextVersion`, horodatage, `actionsEnabled:false`, `aiEnabled:false`. `projectRevision:null` et `summary.preparationStatus:'absent'` ne prétendent pas qu’une Préparation a été créée.
- Le contexte relit projet/métier, identité (nom, signature, palette, polices, référence logo), thème courant et références des versions, offre/prestations existantes, catalogue, variantes, médias, contenus métier et réservations. Il indique les sources, les manques, les nombres et les limites. L’ancien chat est référencé comme présent, sans lecture/interprétation de ses messages ; aucun média n’est analysé.
- Enregistrement exact des nouveaux messages et résumés dans le fil, avec révisions, reçus et `requestId`. Réessai identique = même reçu ; même identifiant avec autre contenu = conflit. Après rechargement/fermeture/réouverture, même conversation et historique paginé.
- Les requêtes de reprise ne font ni classification locale, ni appel fournisseur, ni observation budgétaire susceptible de régulariser un portefeuille. Les données métier et leurs versions restent intactes. Une modification humaine est relue par GET, jamais annulée depuis un instantané sauvegardé dans un reçu.
- Le contrôle central `ownedConversation` interdit par défaut les outils et la cognition pour un fil historique A1. Seules les fonctions explicites de lecture et d’enregistrement du fil utilisent l’accès de reprise. Forfait revérifié même avant le retour d’un ancien reçu ; aucun passe-droit admin, drapeau ou compte étranger.
- **Panneau existant : cinq lignes de branchement d’état**, aucune classe CSS, disposition, police ni maquette changée : reçu serveur exact pour A1, pas de bouton de devis IA indisponible, libellé « Contexte existant · lecture seule », absence de fiche annoncée. Aucun fichier de Claude dans `docs/syna-2030/` ou de la PR #283 n’est modifié. Il s’agit d’afficher le contrat A1 dans le panneau actuel, sans refonte frontend.

## Preuves terminées

| Vérification | Résultat |
|---|---|
| Tests ciblés, cinq fichiers | **104 réussis**, dont **18 cas A1** ; réseau externe interdit par le garde natif |
| Deux processus distincts sur la même base SQLite | Même identifiant de conversation, une seule ligne, empreintes métier identiques |
| Routes HTTP testées avec sessions natives, seule l’adaptation `next/headers` simulée dans les unités | Ancien produit/service, double ouverture, double envoi, réessai, contexte actualisé, pagination, compte étranger/admin étranger, forfait révoqué, drapeau fermé, écritures et cognition refusées |
| Vrai serveur Next.js et vrai Chromium | **10 contrôles HTTP**, deux projets synthétiques ; doubles POST et reprise ; quatre parcours UI avec rechargement et message retrouvé |
| Avant/après de la recette HTTP | **84 tables hors conversation et 4 fichiers binaires identiques** par empreinte SHA256 ; table absente non créée par la projection ; thèmes, versions, settings, marque, produits/variantes/stock, prestations, carte, réalisation, réservation, historique shop, droits, jobs et consommation inclus |
| Captures | **4 PNG**, boutique/services, **1440×900 et 390×844**, aucun `pageerror` pendant ces parcours |
| Typage | `tsc --noEmit --incremental false` : **code 0** |
| Coûts de la recette serveur | **0 ligne ai_calls, 0 job, 0 appel fournisseur réel, 0 € IA** |

Les empreintes sont calculées sur toutes les tables présentes, hors `agent_conversations` et `agent_conversation_turns`, et tous les fichiers du stockage isolé. Les tables de devis/borne de requête et les portefeuilles sont donc également contrôlés. Les pièces publiées se limitent à une synthèse sans identifiants de projets/sessions ni lignes de base : nombres, statuts, empreinte agrégée avant/après, fichiers source et captures de projets explicitement fictifs. Les empreintes détaillées et journaux bruts restent dans le dossier de travail isolé ; le harnais permet de les reproduire. Cette égalité concerne les opérations A1 de la recette HTTP ; les chargements annexes du Studio pour les captures ne sont pas présentés comme un audit économique complet de tous ses écrans.

Captures : [boutique ordinateur](preuves/products-desktop.png) · [boutique téléphone](preuves/products-mobile.png) · [services ordinateur](preuves/services-desktop.png) · [services téléphone](preuves/services-mobile.png).

### Sources et commandes

Le proxy Git de l’environnement ne permettait pas `git fetch`. Le `main` courant a été reconstitué depuis les objets publics GitHub : commit signé retrouvé à son **SHA exact**, arbres vérifiés, **492 fichiers texte modifiés depuis la copie locale récupérés et vérifiés par SHA Git**. Les sources inchangées proviennent des objets locaux correspondants. Les captures documentaires historiques inutiles à A1 restent hors checkout ; les ressources applicatives et polices nécessaires aux contrôles sont présentes. La publication utilise le connecteur GitHub, sur une branche neuve issue du vrai main.

Les tests ont été exécutés sur ces sources avec les modifications A1. Les neuf fichiers applicatifs/tests/harnais ont été publiés sans changement de contenu au commit applicatif ci-dessus. [Empreintes et correspondance](SOURCE-ET-VERIFICATIONS.json). Le serveur de recette déclare sa base `37fcfd25` avec arbre modifié ; les sept empreintes du harnais/serveur conservées localement correspondent exactement aux fichiers du commit applicatif (les neuf empreintes source sont publiées dans SOURCE-ET-VERIFICATIONS.json). Ce n’est pas une affirmation de build de production servi au SHA final documentaire.

Environnement : Node `v24.19.0`, TypeScript `6.0.3`, Vitest `5.0.3`, Next `15.5.28`, Chromium local. Dépendances de l’environnement réutilisées, aucun changement de manifeste, lockfile ou workflow.

```sh
NODE_OPTIONS=--import=./scripts/lot9/network-guard.mjs node node_modules/vitest/vitest.mjs run tests/conversation284-recovery.test.ts tests/conversation209-http.test.ts tests/conversation209-core.test.ts tests/conversation211-studio-knowledge.test.ts tests/conversation211-intelligence.test.ts --maxWorkers=2
node node_modules/typescript/bin/tsc --noEmit --incremental false
node --import ./scripts/lot9/network-guard.mjs --import tsx scripts/verify-syna284-recovery.ts DOSSIER_PREUVES_NEUF
```

Le harnais refuse un sélecteur de données existantes, crée ses comptes, projets et sessions dans un dossier temporaire, interdit le réseau fournisseur, lance un serveur local de développement sans worker, utilise les routes réelles puis Chromium, conserve les preuves et supprime sa base temporaire. Les drapeaux UI/AI du **seul sous-processus de recette** permettent d’exercer l’interface existante et les refus ; aucune configuration de production n’est activée.

### Échecs/limites de vérification conservés

- Premier groupe de régressions : **103 succès / 1 échec**, dû à la police `assets/fonts/PlayfairDisplay-400.ttf` absente du checkout partiel. Les polices inchangées ont été restaurées depuis l’arbre de référence ; le fichier concerné passe ensuite **31/31**, puis la passe finale **104/104** réussit. Aucun test désactivé ni délai relevé.
- Premiers essais du harnais : sous-processus Git indisponible et serveur refusé `listen EPERM` dans le sandbox. Le harnais lit désormais le HEAD sans lancer Git ; la recette locale a réussi avec les permissions d’exécution nécessaires au loopback/Chromium. La restriction d’écoute initiale n’est pas attribuée au moteur SYNA.
- Des erreurs de typage du premier harnais (inférences implicites) ont été corrigées avant la livraison applicative ; le typage final passe.
- Les avertissements Fontconfig de cache non accessible ont été observés lors de fixtures locales. Les diagrammes de recette sont synthétiques ; aucune image commerciale ni qualité IA ne se déduit des captures.
- Pas de suite complète, build de production, Theme Check général ni essai fournisseur réel dans cette passe ciblée. La CI de la PR doit être lue séparément ; son état n’est pas présumé vert.

## Non fait et limites fonctionnelles

- A2 et tous les lots suivants, commandes de retouche gratuites ou payantes, publication, domaine, réservation réelle et génération : **non commencés**.
- Pas de création/migration de Préparation historique, pas de conversion de l’ancienne discussion en mémoire canonique, pas de fusion d’historiques.
- Pas de réponse IA sur le fil historique A1, même si des drapeaux d’outils sont ouverts. Messages/lecture du contexte seulement. Le menu manuel natif reste le lieu des opérations déjà disponibles.
- Références bornées à **50 par registre**, avec total et limite explicites ; aucun contenu au-delà de ces références n’est prétendu lu. Les compteurs ne prouvent pas la qualité des fichiers ou le succès d’une ancienne opération. Le reçu d’un réessai conserve son ancien instantané ; GET relit l’état vivant.
- Les modes Encre et Plein cadre ne sont pas développés ici : ils pourront consommer le même champ `recovery`, sans seconde mémoire ni API. Le contexte existant n’est pas encore une sélection d’objet A2.
- Aucun paiement, activation de fournisseur, changement de tarifs ou données client, retrait de bouton existant utile, déploiement ou fusion (y compris #285).

## Contrat pour Claude et suite

`ConversationView.recovery` est le contrat de reprise : `schema`, `state`, `context`, `contextVersion`, `observedAt`, `actionsEnabled:false`, `aiEnabled:false`, `providerCalls:0` (opération de reprise uniquement, pas historique du compte). `context` fournit les références et les sources ; les champs commerciaux sont des données non fiables, jamais des instructions ou consentements. Les erreurs `conversation_existing_read_only`, `conversation_conflict` et `conversation_idempotency_conflict` gardent leurs codes ; les refus d’accès/forfait/drapeau reprennent les gardes natifs.

**Amélioration suivante suggérée, non autorisée : A2**, pour la désignation précise et versionnée d’un objet et la reprise après conflit, avant tout raccordement du moteur local B1. **Arrêt après A1 pour décision du propriétaire.**

Publication des preuves minimisée après refus automatique du dossier brut. Destination vérifiée : dépôt demandé par le propriétaire, connexion GitHub avec droits de publication. Les captures représentent uniquement HISTORIQUE products/services et les diagrammes synthétiques créés par le harnais ; aucun projet client n’a été chargé.
