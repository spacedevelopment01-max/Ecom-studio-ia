# #211 — E4 : textes intégraux dans les reprises et les relectures

Livraison ciblée, non fusionnée et non activée. Base : #220, `c053d5452ea62e56348b14bc9536683702c09d2f`. Branche : `codex/211-lot-e4-textes-integraux`. D4 (#221) est une branche sœur : ses modifications de recherche ne sont ni remplacées ni incluses ici.

## Problème et correction

**CONFIRMÉ DANS LE CODE et REPRODUIT** : `aiShopCopy` coupait la version précédente à 24 000 caractères ; `aiQcText` et `aiCopyReview` coupaient le contenu à 30 000. Une longue description pouvait donc produire un JSON interrompu, perdre les derniers champs et faire relire seulement le début du document.

`src/lib/ai/tasks.ts` transmet maintenant les trois documents JSON entiers. Le routeur natif calcule l’entrée et réserve le coût complet : aucun plafond augmenté, aucun découpage en appels supplémentaires, aucun modèle/fournisseur ajouté. Une limite réelle peut toujours arrêter la demande ; une relecture partielle n’est pas présentée comme complète.

**REPRODUIT pendant la correction** : retirer seulement les coupures aurait transformé une entrée `undefined` en chaîne « undefined », permettant au double de test de renvoyer une relecture faussement réussie. `fullCopyJson` refuse explicitement cette absence avant `llmJson`, avec `COPY_INPUT_MISSING`, erreur utilisateur permanente native. Les deux tests ont échoué avant cette protection, puis réussi sans aucun appel. Les autres comportements JSON, dont `null`, ne sont pas redéfinis.

Les plafonds de sortie existants restent 24 000 pour la rédaction et 8 000 pour la relecture. Les reprises bornées, reçus acquis, meilleure version conservée et relecture provisoire existants restent en place ; ce lot ne les remplace pas par un deuxième moteur.

## Tests réellement exécutés

Les données sont fictives et isolées : puzzle tactile en bois ; numérisation de photos familiales confiées par le client. Aucune règle applicative ne dépend de leur nom. Un document de plus de 40 000 caractères contient français, japonais et emoji, puis un dernier champ sentinelle exact. La totalité du document est comparée après extraction JSON, pas seulement sa longueur.

- `tests/conversation211-copy-input.test.ts` : version précédente entière pour chaque activité ; contrôle factuel et rédactionnel entiers ; refus budgétaire propagé ; entrée absente refusée avant appel. Double explicite de `llmJson`, aucun HTTP.
- `tests/conversation211-copy-sdk.test.ts` : routeur, précomptage, enveloppe native, réservation, usages et traces réellement traversés ; seul le SDK fournisseur est remplacé en mémoire. Pour chaque activité, les trois fonctions transmettent le document entier au SDK : un reçu réglé et un usage par appel, réserve libérée. Plafond de tâche et budget projet épuisé refusent avant génération, sans réservation créée. Aucun HTTP fournisseur.
- `tests/copy211-fixtures.ts` : contenu synthétique commun. Le moteur local sert uniquement à fabriquer la donnée de test ; il n’est pas présenté comme une création IA.

Commandes (dans la copie isolée sans fichier d’environnement) :

```bash
NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs npx vitest run tests/conversation211-copy-input.test.ts -t 'transmet|propage'
NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs npx vitest run tests/conversation211-copy-input.test.ts tests/conversation211-copy-sdk.test.ts tests/excellence-strategie-redaction.test.ts tests/qualite-textes-marque.test.ts tests/idempotence-reprise.test.ts
NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs npx tsc --noEmit
NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs npx vitest run
NEXT_TELEMETRY_DISABLED=1 npm run build
```

Le lanceur `run-checked.py`, hors dépôt, enregistre chaque commande, son SHA de base, les empreintes des quatre fichiers, code retour, durée et empreinte du journal. Les résultats et leurs limites figurent dans `preuves-211-E4/verifications.json`. [Résultats et empreintes](preuves-211-E4/verifications.json) · [sept régressions du parent](preuves-211-E4/parent-red.log) · [entrée absente avant protection](preuves-211-E4/missing-red.log) · [ciblés](preuves-211-E4/target-final.log) · [complet](preuves-211-E4/full-final.log) · [build](preuves-211-E4/build-final.log).

La première commande a aussi été exécutée contre le fichier applicatif exact du parent : **sept échecs attendus**, JSON coupé, puis restauration octet pour octet de la correction. Ce n’est pas une suite réussie.

**Résultats finaux : 3 691 réussis / 45 ignorés**, 428 fichiers réussis / un ignoré, 705,73 s. **61 ciblés / cinq fichiers**, 5,47 s ; types réussis. Build du code exact réussi (18:45:05–18:46:41 UTC). Empreintes des sources identiques pendant les contrôles et comparées au commit publié. La première suite après reprise (3 689/45) précède les deux protections d’entrée absente ; elle n’est pas confondue avec le résultat final.

**Commit du code testé et compilé : dd5dea5f2bcddefb01c32f3a46c4335e94188313.** Le commit documentaire de livraison n’ajoutera aucun changement applicatif/test par rapport à ce SHA.

## Niveau de preuve et limites

- Transport intégral, schéma, refus avant appel et comptabilité native : **testé isolé, SDK simulé**.
- Tous les appels de cette recette sont simulés : **0 fournisseur réel, 0 coût réel**. Les coûts/réservations du double ne sont pas une facture ni une mesure du coût d’un rendu accepté.
- La qualité de rédaction, compréhension du modèle, pertinence commerciale, travail par page/produit/section et qualification d’un fournisseur réel restent **non vérifiés par E4**. Les scores positifs du double sont une donnée technique, pas un verdict créatif.
- Aucune nouvelle interface dans E4 : pas de nouvelle capture présentée comme preuve de création. Les preuves de rendu, retouche, annulation et export des parents E2/E3 restent distinctes ; E4 ne prouve pas à lui seul tout le parcours client jusqu’au CMS.
- Les autres points où des contenus peuvent être résumés ou normalisés ne sont pas déclarés résolus par ces trois suppressions de coupure. Ce lot ne raccorde pas encore un nouvel outil de rédaction conversationnel.
- Aucun test de l’instance client ni validation créative propriétaire. Aucun déploiement, activation, merge, appel réel ou changement des compositions de Claude, VANS, Contretemps, données, forfaits ou budgets.

## Suite du complément 6476774872

SYNA compagnon permanent reste l’objectif de D/E/F2. D4 livre la recherche native ; E4 corrige cette perte transversale de textes. La suite doit encore fournir la connaissance versionnée, une couverture honnête par opération, la cible active, les comparaisons de propositions et les autres outils natifs. **#211 n’est pas terminé.** Les capacités absentes restent indisponibles ; un test simulé ne devient pas une validation fournisseur/client/propriétaire.
