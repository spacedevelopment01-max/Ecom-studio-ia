# A2 — contexte précis, versions et reprise après conflit

Autorisation : [GO A2 uniquement](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/284#issuecomment-6545568330). Branche `codex/syna-284-a2`, empilée sur A1 `2f6b5c6f67d08ffb3871aa7e9759a3694ee54571`. La PR cible `codex/syna-284-a1`, pas main. A1/#286 et l'audit/#285 restent inchangés et non fusionnés.

## Fait

- Adresses natives page/section/bloc/champ texte/image résolues côté serveur ; projet propriétaire, plan, version, schéma, visibilité et provenance vérifiés. Références médias avec version/rôle ; texte exact ou référence intégrale si trop long. Refus explicite des champs absents, non raccordés ou remplacés au rendu par les contenus métier. Aucun texte DOM, sélecteur CSS ou lien client pris comme preuve.
- Sélection persistante séparée de l'onglet actif. Navigation et rechargement conservent la cible ; retrait explicite par `clear`. État périmé visible et reprise manuelle proposée sans substitution par nom.
- Revalidation exigeant l'ancien repère **et** l'empreinte du nouveau contexte affiché. Une deuxième modification manuelle pendant la lecture de la proposition invalide cet accord. Les réessais rendent le même reçu et la projection actuelle sans nouvelle application.
- Repère capturé et relu au devis, à la confirmation et dans le worker de l'outil exact de thème existant ; refus d'une proposition visant un autre champ. Deux devis sur N suivis d'une édition manuelle N+1 ne produisent ni tâche ni écriture silencieuse. La reprise consentie puis un nouveau devis/accord créent une seule version native. Le réessai d'une tâche déjà terminée rend son résultat sans tenter une progression supplémentaire.
- A1 demeure en lecture seule, sans Préparation, cognition ou devis métier activé. Historique SYNA, anciennes versions, shop.chat et autres données préservés. Le contexte n'ouvre aucun outil ni drapeau.
- [Contrat stable et guide d'intégration pour Claude](CONTRAT-CONTEXTE-A2.md), partagé par les deux futurs modes ; aucune modification de `src/components`, des maquettes, du CSS, des thèmes ou des préférences.

## Vérifications

Les tests ciblés utilisent les vraies fonctions du dépôt et des bases SQLite/fichiers temporaires, avec sessions HTTP de route simulées seulement pour next/headers. Le harnais complémentaire utilise de vraies routes Next.js en serveur local. Fixtures boutique et services dont projets historiques A1, objets texte/image/section/bloc, droits et isolation, drapeaux, objets supprimés/étrangers, versions, idempotence, conflit avant accord et pendant la file, revalidation et réessai sans double version.

Commandes reproductibles :

```sh
node node_modules/typescript/bin/tsc --noEmit
NODE_OPTIONS="--import=$PWD/scripts/lot9/network-guard.mjs" node node_modules/vitest/vitest.mjs run tests/conversation284-a2-context.test.ts tests/conversation211-active-context.test.ts tests/conversation284-recovery.test.ts tests/conversation211-theme-tools.test.ts tests/conversation209-core.test.ts tests/conversation209-http.test.ts tests/conversation211-context-presentation.test.ts tests/conversation211-tools.test.ts tests/composition211-syna.test.ts --maxWorkers=2
node --import ./scripts/lot9/network-guard.mjs --import tsx scripts/verify-syna284-a2-context.ts /tmp/preuves-a2
```

**Passe finale : 145 tests réussis / 9 fichiers (23 nouveaux cas A2), typage sans erreur, 24 contrôles HTTP Next.js réussis, 4 comparaisons métier inchangées, 0 appel réel et 0 € API.** Commit applicatif : `a8ac6edb0570f9ccd6437752e75931112df131f4`.

Résultat final et empreintes source : [SOURCE-ET-VERIFICATIONS.json](SOURCE-ET-VERIFICATIONS.json). [Synthèse des contrôles HTTP sans identifiants ni données de base](preuves/RESUME-HTTP.json). Les empreintes comparent toutes les tables hors conversation et tous les octets de stockage. Pour la concurrence, la comparaison est refaite **après** l'édition manuelle volontaire du scénario : cette édition ne doit pas être effacée par SYNA.

Les premières passes ont révélé un ancien test qui attendait la perte de sélection lors d'un changement d'onglet, un format de repère attendu à tort sur 64 caractères au lieu des 16 du moteur existant, un cas de progression après tâche terminée et un drapeau SPECIALISTS omis dans le harnais HTTP. Les corrections et la nouvelle recette sont couvertes par la passe finale. Aucun échec n'est masqué. La recette renforcée couvre aussi N+1 affiché puis N+2 avant revalidation.

## Non fait et limites

- Aucun nouveau sélecteur graphique ni raccordement des clics fins dans les composants de Claude. L'API et l'adaptateur natifs sont prêts pour son intégration ; les captures A1 restent des preuves de l'ancienne UI, pas d'une nouvelle interface A2. Pas de nouvelles captures pertinentes : ce diff ne change aucun composant visuel.
- Pas de retouches B1/B2/B3, de moteur de création, de nouvelle fonction payante, de fusion shop.chat ou de réécriture de withContenus. Le conflit d'exécution est démontré sur l'outil exact de thème existant ; les autres modules conservent leurs contrôles natifs et ne deviennent pas nouvellement raccordés.
- La suite complète, le build de production, Docker et Theme Check ne sont pas revendiqués comme exécutés localement. État CI publié séparément au SHA de livraison ; une CI en cours n'est pas une validation verte.
- Aucun fournisseur réel : **0 appel, 0 € API**. Aucun flag de production, projet réel, droit, tarif, déploiement ou fusion modifié. Les seuls flags ouverts le sont dans les processus de test temporaires.
- Si A1 évolue avant intégration, réconcilier la branche et rejouer la recette. PR brouillon : **arrêt après A2, B1 attend une validation distincte**.
