# #211 — D7 : comparer les angles acquis et conserver les décisions

**Livraison pour revue dans #225 ; #211 reste partiel.** Branche `codex/211-lot-d7-choix-versions`, code et build réellement servi `a1fab8a1c90083c4dfa8c2ca61b901fae133a295`. Parent D6 #224 `ef67bebe88c73d803d34d03536f80c64f41e4bae`. E4 #222 et les corrections d’interface #226/#227 sont des dépendances sœurs à conserver lors d’une intégration ultérieure autorisée. Aucun merge, activation, déploiement ou fournisseur réel.

## Ce que cette tranche fait réellement

La commande explicite reprend les propositions du moteur `marketing-strategy.proposeStrategies/getStrategyState`, issues d’une recherche acquise vérifiée par ses gardes natifs. Elle ne relance pas la recherche et ne fabrique aucun angle local. Cette reprise peut actualiser la projection native des propositions ; elle n’approuve aucune étape.

Deux à cinq options sont conservées intégralement, dans un ordre explicite, avec projet, identifiants natifs, empreinte complète, contexte et recherche d’origine. Le client peut sélectionner un sous-ensemble, rouvrir une comparaison, retenir ou écarter une option avec ses propres raisons, puis annuler sa dernière décision. Les états avant/après et les raisons restent dans la même mémoire/conversation. Une ancienne comparaison ne devient pas actuelle par substitution. La limite de vingt comparaisons et cent décisions refuse une nouvelle écriture sans purger l’historique.

**Une préférence de discussion n’est pas une activation stratégique.** Aucun quota d’angle, marque, contenu ou thème n’est consommé/modifié. L’activation reste dans le parcours natif et ses confirmations. Pour les services, la portée reste celle des communications ; le Site généraliste et ses prestations ne sont pas réécrits. Comparaison, choix, rejet et annulation coûtent 0 % du budget IA.

Les cartes présentent les publics, bénéfices, limites et raisons déjà acquis, leurs sources et leur caractère hypothétique/simulé. Un nouveau conseil raisonné passe par le routeur/Brain/SDK et le devis natifs de conversation. Une demande libre de retenir la deuxième option peut produire une proposition avec citation client et références exactes ; elle attend encore une confirmation distincte. La raison de ce conseil garde sa provenance, sans devenir un fait commercial client. Le choix seul ne génère rien.

Le contexte fournit les options intégrales de la comparaison active, pas seulement l’index D4. Aucun texte n’est tronqué pour passer les limites : comparaison trop longue ou contexte total excessif = refus explicite avec acquis conservés. La dernière demande exacte est identifiée même répétée, indépendamment d’une ancienne raison ou note. Les références périmées, étrangères ou forgées sont refusées.

Le drapeau serveur `STUDIO_CONVERSATION_CHOICES`, dépendant de LOT_A/AI, reste **fermé par défaut**. Il ne crée aucun droit : propriétaire, forfait actif, révisions et idempotence sont contrôlés. Le budget épuisé n’empêche pas cette préférence gratuite ; une réflexion IA conserve tous ses contrôles financiers.

## Fichiers

- [strategy-choices.ts](../../src/lib/orchestrator/conversation/strategy-choices.ts), [strategy-choice-contract.ts](../../src/lib/orchestrator/conversation/strategy-choice-contract.ts) : projection native, versions, historique, décisions et validation.
- [contract.ts](../../src/lib/orchestrator/conversation/contract.ts), [index.ts](../../src/lib/orchestrator/conversation/index.ts) : commandes strictes et mémoire commune.
- [intelligence-context.ts](../../src/lib/orchestrator/conversation/intelligence-context.ts), [intelligence-contract.ts](../../src/lib/orchestrator/conversation/intelligence-contract.ts), [intelligence.ts](../../src/lib/orchestrator/conversation/intelligence.ts) : dernière demande, sources, proposition sans exécution.
- [conversation-strategy-choices.tsx](../../src/components/studio/conversation-strategy-choices.tsx), panneau et présentation : cartes, choix, raisons, annulation et reprise.
- [studio-operations.ts](../../src/lib/orchestrator/conversation/studio-operations.ts) : deux opérations précises ajoutées ; comparaison générique toujours absente.
- [tests ciblés](../../tests/conversation211-strategy-choices.test.ts), [recette navigateur](../../scripts/verify-agent211-choices-ui.ts), [harnais compilé](../../scripts/verify-agent211-build.ts).

## Vérifications réellement exécutées

| Commande | Résultat | Portée |
| --- | --- | --- |
| `npx vitest run` | **3 738 réussis / 45 ignorés**, 431 fichiers réussis / un ignoré, 1 386,03 s | Suite complète, sources gelées inchangées |
| `npx vitest run tests/conversation211-strategy-choices.test.ts tests/conversation211-studio-knowledge.test.ts tests/conversation211-intelligence.test.ts` | **57 réussis**, dont 14 cas D7 | Comptes fictifs, fonctions natives, fournisseur remplacé ; aucun réseau |
| `npx tsc --noEmit` | Réussi | Application et harnais |
| `NEXT_TELEMETRY_DISABLED=1 npm run build` | Réussi, arbre propre | Commit a1fab8a1 exact |
| `npx tsx scripts/verify-agent211-build.ts <dossier-isolé> --choices-ui` | Réussi | Chromium système, serveur/worker/SDK natifs vers HTTP loopback simulé |

Le complet a été exécuté avant le commit sur les quatorze fichiers gelés ; leurs empreintes ont été comparées au commit publié, puis le build propre et le navigateur ont été exécutés sur ce commit. Les scripts de navigateur autonomes ne sont pas collectés par Vitest : ils sont typés et exécutés séparément.

Les tests vérifient notamment propriétaire/forfait, historique et sous-ensemble ordonné, refus de version étrangère ou périmée, idempotence et concurrence, abonnement annulé, budget épuisé, recherche absente, fermeture du drapeau, limites sans purge/troncature et demande répétée. Aucun angle activé ni étape approuvée par ces commandes.

### Recette compilée

Trois projets fictifs : produit mono 1 440 px, produit multi 1 024 px, service 390 px. Cinq options acquises → sous-ensemble exact de deux → raison/choix → rejet → annulation → demande libre → devis et accord distincts → proposition sourcée → confirmation → fermeture/reprise après modification native du contexte. Les références historiques restent visibles et le choix est désactivé. Compte étranger : 404 ; aucune erreur JavaScript ou débordement horizontal. Les états natifs constatent l’absence d’angle actif et de quota consommé. La modification du contexte pour ce dernier cas est effectuée dans la fixture via la fonction native, pas par une retouche client réelle.

**27 PNG originaux et trois vidéos réelles**, avec mêmes nombres d’images et durées que les WebM sources (9,88 / 9,36 / 8,92 s, sans coupe ni accélération). Planches des 27 captures et échantillons des vidéos inspectés, originaux clés ouverts. Les vidéos paraissent plus claires que les PNG ; une comparaison RGB avec les WebM sources ne permet pas d’attribuer cela au transcodage. Aucun recoloriage des preuves ; les PNG restent la référence pour les couleurs. Les mesures de fidélité sont jointes.

### Coûts et nature des données

**Six appels HTTP simulés / six usages connus = 47 472 micro fictifs** : trois contrôles de base et trois réponses D7 à 7 912 chacune. Trois reçus synthétiques de recherche sont insérés comme acquis de fixture, sans invocation ; ils expliquent les neuf lignes `ai_calls`. Neuf lignes ne prouvent donc pas neuf appels fournisseur. Le champ natif `provenance=provider` décrit ici la route SDK configurée, entièrement redirigée vers le faux serveur local ; ce n’est pas une qualification réelle.

Les options sont celles d’une fixture technique préexistante de recherche, réutilisée pour vérifier le transport et la persistance. Certains publics de cette fixture ne correspondent pas aux métiers de recette : **ces cartes et réponses prédéfinies ne sont ni des démonstrations commerciales ni une preuve de conseil cohérent ou de généralisation créative**. Aucun marché, résultat marketing, vision ou qualité professionnelle d’un modèle réel n’est qualifié.

**Zéro fournisseur réel / coût réel nul.** Aucun projet client, VANS étape 1, Contretemps, média réel, composition de Claude, forfait ou plafond modifié. Aucune publication, connexion ou installation CMS.

## Échecs et limites conservés

Les premiers ciblés ont détecté une incohérence entre empreinte abrégée et contrat de version ; une empreinte complète la corrige. Un autre échec venait d’une fixture tentant une migration non raccordée : fixture corrigée, garde natif conservé. Deux suites préliminaires ont été interrompues pendant les corrections d’ordre et de dernière demande ; elles ne comptent pas comme succès. [Chronologie](preuves-211-D7/chronologie.json).

Le catalogue passe à **50 opérations explicites**, toujours non exhaustives. Seuls les angles marketing sont comparés dans D7. Logos, images, thèmes, mélange de couleurs/propositions, vision, nouvelles alternatives, activation stratégique depuis SYNA et routage de toutes les formulations libres restent absents ou partiels. La sélection du sous-ensemble et l’annulation sont vérifiées par les boutons natifs ; toutes les phrases possibles de commande ne sont pas qualifiées.

La CI D5 #223 a révélé un autre défaut Site à 390×844, reproduit puis traité séparément dans #227. D7 ne contient pas cette correction sœur ; **aucun feu vert global de CI n’est déduit de sa recette**. F2 Images #226 et E4 #222 restent également à intégrer explicitement, sans fusion implicite. L’instance client n’est pas mise à jour et aucun drapeau n’y est activé.

[Galerie/téléchargements](preuves-211-D7/README.md) · [traces et empreintes de sources](preuves-211-D7/verifications.json) · [fidélité vidéo](preuves-211-D7/fidelite-video.json) · [couverture](211_D7_COUVERTURE.md). Les fichiers distants et des retéléchargements doivent être vérifiés avant l’annonce de publication. **#211 continue : autres outils, composition originale, connaissance exhaustive, qualité IA réelle et finitions restent ouverts.**
