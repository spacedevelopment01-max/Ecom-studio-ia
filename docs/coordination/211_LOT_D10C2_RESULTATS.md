# #211 — D10c2 : reprendre un premier encodage sans changer d’offre

Code testé : `8117a3f8cbce7e6f7604344e008297d6224f164c`, parent #246 `a9fbc2119540e4cea23dae761b0c4797035c70cb`. Branche `codex/211-lot-d10c-reprise-encodage`. **Revue technique en attente de la CI finale ; aucun merge ni activation.**

## Fait

Lorsqu’aucun MP4 n’avait encore été enregistré, le rendu local reconstruisait les informations de rangement depuis le projet actuel. Une vidéo du second produit pouvait être réétiquetée comme le produit principal ; une prestation perdait sa clé native.

Le document conserve désormais le sujet natif résolu avant encodage. Les documents D10b2 déjà créés utilisent leur identité figée si leur champ sujet est vide. La reprise locale ne recherche ni une autre offre ni de nouveaux médias. Une référence native invalide provoque un arrêt explicite, sans substitution ; versions et acquis conservés.

Fichiers : `src/lib/video-v2/three-scenes.ts`, `src/lib/video-v2/engine.ts`, `tests/video-native-first-encode.test.ts` et assertion de persistance dans `tests/conversation211-video-generation.test.ts`.

## Vérifié

**8tests ciblés**, **2parcours natifs produit/service de persistance**, types et **une suite complète :4 016réussis/45ignorés**. Les45ignorés ne sont pas des succès. Quatre cas reproduits avant correction : produit/service et documents B2 anciens/nouveaux. Contrôle négatif d’une référence malformée ajouté. Demande complète, clips/audio, fichiers MP4, versions et compteurs de tâches/coûts vérifiés.

[Commandes, dates et SHA des sources](211_D10C2_PREUVES.json). Les tests utilisent des MP4 réels, un encodeur injecté pour les cas nouveaux et le moteur natif de sauvegarde/version ; aucune génération ou qualité créative IA réelle qualifiée. Les fixtures documentaires/médias existantes sont réutilisées sans recopie ni génération. Pas de capture nouvelle pour cette fonction interne. La CI conserve les parcours compilés de #246 ; son SHA final/résultat est annoncé dans la PR.

## Limites et suite

Ce correctif garantit le rangement fidèle d’un **rendu local repris**, pas une récupération fournisseur ou une réparation générative automatiquement disponible dans SYNA. Reprise du reçu agent après premier encodeur, voix seule, clip ciblé, staged et reçus interrompus restent à compléter. La recherche durable de #249 est un correctif sœur indépendant ; les deux devront être réunis dans la future recette commune.

D10c puisD11/D12/E/F restent partiels. Claude#239/#245, thèmes et données clients préservés. **0appel fournisseur IA réel,0coût IA réel ; aucun merge,main,déploiement,activation ou publication extérieure.**
