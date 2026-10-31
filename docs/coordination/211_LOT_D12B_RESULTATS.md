# #211 — D12b : terminer le suivi lorsque SYNA est replié

## Fait

Défaut **REPRODUIT** sur le Studio compilé `c4c31a0e37953cf117f8a1381c4c199524aa3bf7` (#260) : fermer SYNA pendant une acquisition démontait ses composants de suivi. Le worker terminait et le reçu serveur prouvait la livraison, mais le compteur natif restait à zéro. Ce n'était pas une panne fournisseur ; augmenter le délai n'aurait pas rétabli le composant démonté.

Correction dans `src/components/studio/conversation-panel.tsx` : après la première ouverture volontaire, le panneau reste monté lorsqu'il est replié, masqué et absent du parcours clavier. Les suivis existants peuvent constater la fin et émettre les événements natifs. Le texte non envoyé reste disponible. Le changement de projet réinitialise cette ouverture ; aucun montage ni accès conversationnel avant le premier choix du client. Aucun nouveau moteur, génération ou consentement implicite.

Application, harnais et build vérifiés : **`4efb32af32e033572e142fc0f842734f6f3e200a`**. Parent documentaire #260 `b1ab323f7c81025fe01aa72173f416ab90108a25`, dépendances antérieures conservées. Une seule recette CI d'intégration est étendue à ce cas ; aucune ancienne vérification supprimée, aucune seconde exécution identique ajoutée.

## Validé / preuves

- **24 tests ciblés distincts / 4 fichiers réussis**. Après le dernier ajustement de la recette CI, ses 3 tests de placement sont rejoués sur le commit propre : ils recouvrent les 24 précédents. Types réussis avant les dernières assertions du harnais ; le build final réalise de nouveau la validation TypeScript complète.
- `npm run build` : réussi, commit propre ci-dessus et sources inchangées. Cache de compilation local supprimé seulement après succès ; application compilée conservée.
- Chromium sur ce build, vrai worker et SDK natifs vers HTTP local simulé : réussi. Panneau fermé pendant l'acquisition ; compteur « Publicités image 1 » mis à jour avant réouverture ; même fichier téléchargé, note non envoyée retrouvée. Aucun appel `/api/studio-agent/` ni conversation créée pour le projet manuel jamais ouvert dans SYNA.
- Contrôles conservés : compte étranger 404, CSRF 403, entrée forgée 400 ; second HTTP 503 = un seul essai, premier acquis intact. Éditeur natif et modification humaine non enregistrée préservés. Le parcours social commun vérifie également conflit d'attache, réemploi explicite du même fichier sans fournisseur sous budget épuisé et devis expiré, sans réinitialiser les bornes. Cas : tranchet de sellier et compas de charpentier ; aucune règle liée à leurs noms dans le moteur.

Commandes réellement exécutées, depuis la copie isolée sans `.env` ni données client (variables du navigateur : `CHROMIUM=/usr/bin/chromium`, runtime Playwright installé ; garde réseau `NODE_OPTIONS=--import=./scripts/lot9/network-guard.mjs`) :

```bash
npm test -- tests/conversation211-communication-registry.test.ts tests/conversation211-studio-knowledge.test.ts tests/ci-native-production-placement.test.ts tests/ci-native-social-placement.test.ts
npm run typecheck
npm run build
npm test -- tests/ci-native-production-placement.test.ts tests/ci-native-social-placement.test.ts
node --import tsx scripts/verify-agent211-build.ts /workspace/reviews/ecom-211-state/D12b-closed-panel-after-proof --background-communication-ui
```

Le build emploie son propre `DATA_DIR=/tmp/ecs-d12b-build`. La recette refuse tout sélecteur de stockage préexistant et crée sa base temporaire ; aucun sélecteur de stockage n'est transmis à cette commande navigateur. L'échec avant correction utilise la même recette, dossier distinct `D12b-closed-panel-before-proof`, sur le build c4c31a0e ; son statut rouge est conservé dans [checks.json](preuves-211-D12b/checks.json).

- [Mobile, résultat reçu panneau fermé](preuves-211-D12b/01-panneau-ferme-mobile.png)
- [Mobile, réouverture et note conservée](preuves-211-D12b/02-reouverture-note-mobile.png)
- [Éditeur natif sur ordinateur](preuves-211-D12b/03-editeur-natif-ordinateur.png)
- [Film réel de l'interaction](preuves-211-D12b/panneau-ferme.mp4)
- [Assertions campagne](preuves-211-D12b/campaign-visual-proof.json), [assertions sociales](preuves-211-D12b/social-production-proof.json), [statuts avant/après et commandes](preuves-211-D12b/checks.json).

Trois captures effectivement ouvertes et inspectées. Une mire synthétique remplace le rendu fournisseur ; **0 appel fournisseur réel, 0 € réel, aucune qualité créative réelle qualifiée**. Les montants `simulatedMicro` des reçus sont des écritures de recette isolées.

## CI complète / reste

La PR demeure en brouillon tant que sa CI complète finale n'est pas terminée sur sa tête exacte. Consulter les contrôles GitHub de la PR pour son état actuel ; les réussites locales ci-dessus ne valent pas CI verte présumée.

Ce correctif prouve le suivi après repli du panneau, pas un agent actif en continu ni une notification navigateur après fermeture de l'onglet. La persistance serveur, le rechargement et les reprises restent ceux des outils natifs déjà raccordés. Recette native commune exécutée, aucune installation CMS ni publication externe testée.

**#211 reste partielle** : rédaction Site qualifiée et mode sans thème, autres raccordements D12/E/F et limites vidéo restantes. Les API métier de Claude #245 et leur future intégration #247/#248 demeurent des dépendances distinctes ; aucun code/composition Claude recopié ou modifié. Aucun merge, changement de main, déploiement, activation, redémarrage du Studio ou modification client.
