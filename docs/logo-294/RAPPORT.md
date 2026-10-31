# Issue #294 — dépenses des logos

## Diagnostic vérifié

Branche indépendante `codex/logo-294-consent`, créée depuis main `37fcfd2526705d274fd813b5da95be46058b7c9f`. Source qualifiée : `6cf1c641ef752a86b0768c0bcdf9e9037b6c35b7` ; le commit suivant ne contient que ces preuves.

Les prix, réservations fournisseurs, plafonds et droits de séries existaient. Il manquait une autorisation persistée commune aux routes natives et au worker : les deux POST sans consentement pouvaient créer une tâche. Les deux tests HTTP de régression échouent sur main (200 avec tâche), puis passent après correction. Le devis de contrôle qualité utilisait aussi une route différente de la route vision effectivement appelée.

## Correction

- Devis serveur propriétaire/projet/opération, valable 15 minutes, lié aux prix et routes réels, budget, versions, séries et empreintes des fichiers acquis. Un fichier source illisible interdit le devis.
- Confirmation explicite et plafond en pourcentage de la jauge native. Vérification au POST, au démarrage et avant les appels ; refus avant dépense si preuve absente, périmée ou modifiée. L'ancien POST non qualifié est fermé.
- Une confirmation correspond à une tâche, même après double clic ou réponse réseau perdue. Une tâche payante exécutée ne peut pas être rachetée par remise à zéro des tentatives. Aucun retry fournisseur automatique ; arrêt sur résultat incertain, y compris en cours de génération.
- Conservation des séries acquises, du logo actif, de la sélection gratuite et de la première création via l'autorisation économique existante de Préparation. La première série incluse consomme toujours son coût fournisseur dans le budget IA. Les réparations ne dessinent que les directions manquantes ; le plafond du devis reste conservateur.
- Contrôle partagé des résultats fournisseurs incertains dans l'adaptateur logo. Aucun changement de l'interface SYNA, de #292, des travaux graphiques de Claude, des workflows ou des prix.

## Vérifications

Sur la source qualifiée ci-dessus, réseau externe interdit : **187 tests passent dans 15 fichiers**, aucun ignoré ; `npx tsc --noEmit` et `npm run build` passent ; `git diff --check` passe. La matrice inclut 29 tests du nouveau contrat et deux régressions HTTP, ainsi que les tests logos, budget, facturation et sélection SYNA existants. Les anciennes assertions qui attendaient une tâche non autorisée vérifient maintenant le refus et la conservation des acquis.

Une régression supplémentaire démontre l'incertitude en cours d'exécution : avant le dernier correctif, trois tentatives de fonctions fournisseurs au lieu d'une ; après, une seule et arrêt avant les suivantes. Ce contrôle ne se limite donc pas au démarrage.

```sh
NODE_OPTIONS="--import=$PWD/scripts/lot9/network-guard.mjs" npx vitest run tests/logo294-consent.test.ts tests/logo294-unsigned-http.test.ts tests/logo-v2-route.test.ts tests/logo-budget.test.ts tests/conversation211-logos.test.ts tests/budget-ia.test.ts tests/billing.test.ts tests/conversation211-logo-selection.test.ts tests/prix-pourcentage-budget.test.ts tests/logo-relais-jamais-zero.test.ts tests/brain-memoire-coherence.test.ts tests/mission142-livraison-logo-video.test.ts tests/logo-v2-progress.test.ts tests/logo-v2.test.ts tests/logo-v2-artwork.test.ts
```

Recette navigateur réelle sur le Studio **compilé en production**, arbre propre, version vérifiée par `/api/version`. Compte, fichiers et portefeuille synthétiques, base temporaire isolée, fournisseurs factices, sorties réseau interdites. Script reproductible : `scripts/verify-logo294-native-ui.ts` ; lancer après compilation avec `LOGO294_PRODUCTION=1 NODE_OPTIONS="--import=$PWD/scripts/lot9/network-guard.mjs" npx tsx scripts/verify-logo294-native-ui.ts /tmp/preuves-logo294`. Ne pas définir de DATA_DIR existant.

Le parcours ouvre le vrai devis, annule sans tâche ni débit, confirme avec double clic, perd volontairement la réponse après l'enqueue serveur, puis réessaie explicitement la même confirmation : **une seule tâche**. Le vrai worker protégé enregistre trois images synthétiques et un reçu natif ; l'identité validée reste identique, la galerie et les fichiers persistent après rechargement. Aucune erreur JavaScript. Voir [résumé machine](RESUME-NAVIGATEUR.json).

Captures inspectées, données uniquement synthétiques, fichiers inchangés et empreintes dans [SHA256.json](SHA256.json) :

- [Devis ordinateur](captures/desktop-devis.png)
- [Devis mobile](captures/mobile-devis.png)
- [Réponse perdue et reprise explicite](captures/desktop-reponse-perdue.png)
- [Trois résultats enregistrés](captures/desktop-resultat.png)

**Dépense IA réelle : 0 € ; appels fournisseurs réels : 0.** La recette simule 150 micro-unités comptabilisées via les vraies fonctions de réservation/règlement sur un portefeuille fictif. Ce montant n'est pas une facture fournisseur.

## Limites, CI et retour arrière

La qualité graphique et les services fournisseurs réels ne sont pas qualifiés par ces tests. Une autorisation périmée exige un nouveau devis ; un résultat fournisseur incertain impose sa réconciliation avant un nouvel achat. Les jobs historiques sans preuve sont refusés. Aucun nouveau mécanisme de relais ni lot SYNA n'est développé.

Les résultats locaux ci-dessus sont acquis. Le statut CI GitHub doit être lu sur le SHA final de la PR ; il ne peut pas être déduit de ces tests ciblés. Le compte rendu de PR/issue donne son dernier état observé.

Aucune migration, activation, fusion ou mise en production effectuée. Pour abandonner : fermer la PR brouillon. Un éventuel retour arrière après adoption devra conserver le refus des chemins sans consentement, sans rouvrir les anciens achats implicites. Arrêt pour validation après livraison de cette PR.
