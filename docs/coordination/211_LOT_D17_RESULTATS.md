# #211 — D17 : correction exacte d’identité depuis le dialogue

**Fait :** demande du client → réponse cognitive structurée → relecture avant/après avec devis local **0 %** → accord distinct → vrai `confirmIdentity` → version et reçu natifs. Le nom et/ou la signature sont repris littéralement de la dernière demande ; aucun slogan créatif local ou deuxième moteur. La réflexion conversationnelle conserve son devis habituel et n’est pas annoncée gratuite. Aucun autre appel n’est ajouté pour appliquer le choix.

Application compilée/servie : **`b1053e9357d1a17c872caa4182c18211232be051`**, parent #271 `6ecba5b22053ef11f79d9a84f7c4000cb7a9abce`. Le cas supplémentaire du harnais a été défini après gel de l’application ; `src/` et `worker/` restent identiques. Build propre réutilisé, pas de nouvelle compilation pour changer une fixture ou cadrer les acquis.

## Périmètre et protections

- `brand-review-contract.ts`, schéma/contexte/validation cognitifs : `brand.correct` et `brandCorrection` uniquement lorsque les modules marque et relecture sont ouverts. Un seul plan natif, candidat précis, source/citation de la dernière demande et champs exacts inclus dans la citation. Paraphrase, source étrangère ou champ inventé refusés ; champ `null` = valeur conservée. Schémas des modules fermés inchangés.
- `brand-review-execution.ts` : identité candidate et droits natifs, révisions, financement, expiration, reçu cognitif courant, citation et empreinte du plan revérifiés avant l’application. Les valeurs ne viennent jamais directement de la requête de confirmation. Source/candidat/contexte modifiés → refus sans écrasement. Versions, couleurs, typographies, recherche et angles acquis conservés. Le choix reste distinct de l’approbation complète de Préparation.
- `conversation-brand-choice.tsx` et catalogue d’opérations : bouton de relecture de correction, mots remplacés visibles, nom/signature proposés complets, puis **choix final réellement enregistré**, avec rappel que la proposition d’origine est conservée. La réponse du modèle ne vaut ni application ni accord humain. Rechargement et doublon ne recréent pas de version ni d’appel.
- Identité déjà choisie, direction artistique, logo, médias, textes/étapes aval et Site existants restent protégés par les gardes du choix natif. **Pas d’édition libre d’une marque confirmée**, palette/polices, effacement de signature ou disponibilité juridique : ces possibilités ne sont pas revendiquées dans ce raccordement. La signature exacte est bornée à 1 200 caractères, le nom à 160 ; dépassement refusé, pas tronqué. Le nom garde le trim natif, les espaces internes et retours à la ligne de signature sont conservés.

## Contrôles réellement exécutés

**88 tests ciblés / 9 fichiers, types/build et recette Chromium réussis.** [Commandes, sources, dates et SHA](preuves-211-D17/checks.json). Tests produit/service de la correction, consigne/signature longue entière, aucune écriture avant accord, source native intacte, palette/polices identiques, idempotence, paraphrase/source/candidat refusés, nouveau message et plan modifié après devis, schémas fermés, valeurs forgées refusées. La première vérification de types a révélé une inférence `unknown` dans le schéma conditionnel ; construction explicite corrigée, vérification finale réussie.

```bash
node node_modules/vitest/vitest.mjs run tests/conversation211-brand-review.test.ts tests/conversation211-generation-schema.test.ts tests/conversation211-intelligence.test.ts tests/conversation211-brand.test.ts tests/conversation211-studio-knowledge.test.ts tests/ci-native-brand-placement.test.ts tests/ci211-verdict-complet.test.ts tests/conversation211-social-preview.test.ts tests/conversation211-clip-preview.test.ts
node node_modules/typescript/bin/tsc --noEmit
# DATA_DIR neuf de recette, STOCK_OFFLINE=1, aucune configuration client
npm run build
# Garde réseau fournisseur active ; Chromium et SDK natifs, fournisseur HTTP loopback simulé
node --import tsx scripts/verify-agent211-build.ts CHEMIN_PREUVE_NEUF --brand-ui --brand-review --brand-correction
```

Trois parcours : mètre pliant, entretien de harpes, **nouveau cas après gel : porte-étiquettes pour bacs de semences**. Aucune règle applicative dépend de ces noms. Deux corrections exactes via le dialogue puis accord ; le service conserve aussi le choix initial sans correction. Version native 6, recherche prête sans nouveau rachat, reçu de recherche/angles/choix/quota conservés, proposition native initiale intacte, 0 nouveau job/appel au choix. 401/404, CSRF 403, champ forgé 400, rechargement et confirmation répétée vérifiés. Le premier acquis reste présent après la seconde génération simulée en 503 (un seul essai). Quatre largeurs 1440/1024/390/360 ; captures finales relues à 390 et 1440 sans débordement.

**13 requêtes HTTP fournisseurs fictifs, zéro fournisseur réel / 0 € réel.** Les 16 traces SQLite incluent des fixtures préacquises ; elles ne correspondent pas à 16 appels réels. Cognition, création et qualité créative réelles ne sont pas qualifiées par ces simulations. Après changement de nom, l’ancien contexte des communications peut demander une réconciliation native : il n’est pas retagué automatiquement. Cela ne demande pas de racheter la recherche et ne change pas le quota d’angles.

## Preuves et suite

[Mobile](preuves-211-D17/01-correction-mobile.png) · [Ordinateur](preuves-211-D17/02-correction-ordinateur.png) · [film réel 13,12 s](preuves-211-D17/correction-identite.mp4) · [trois parcours](preuves-211-D17/native-proof.json) · [lecture des acquis sans worker](preuves-211-D17/saved-captures.json) · [inventaire](211_D17_PREUVES.json).

Trois captures inspectées, deux finales retenues ; un film du navigateur. La relecture de présentation ne crée aucun job, appel, version ou média et conserve la mémoire de Préparation. **CI complète finale requise, brouillon à cette rédaction** ; recette existante étendue aux corrections sans retirer le choix initial, contrôles, garde réseau ou artefacts. Pas de seconde suite complète locale redondante.

**#211 reste partielle** : autres outils métier/blog, critique visuelle/qualité réelle et intégration finale notamment. Les CI #269/#270/#271 restent à suivre sur leurs SHA respectifs ; les anciens échecs ne sont pas effacés. Aucun main, merge, déploiement, activation réelle, donnée/budget client ou branche/composition Claude modifié. Aucun nouvel export ou CMS réel contrôlé par ce lot.
