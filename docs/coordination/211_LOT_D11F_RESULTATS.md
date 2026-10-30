# #211 D11f — Le ratio demandé reste celui de la publication

**Code, build et navigateur : `9708be906bdc0e951c6b32fa70d6c32115af40f9`.** Base #257 `54767c35`, dépendances précédentes conservées. Aucun merge, main, déploiement, activation ou client modifié.

**Cause confirmée dans le code :** le producteur déduisait toujours les proportions du réseau et du format, sans champ pour le ratio demandé. La recherche d’un acquis compatible ne distinguait pas les proportions. Une demande de carré pouvait ainsi devenir un portrait ou réemployer le mauvais format.

**Corrigé :** ratio typé 1:1 / 4:5 / 9:16 / 16:9, conservé dans le plan proposé, le brouillon natif, le devis, l’empreinte, la requête au moteur et le reçu. Un nouveau visuel en attente exige un ratio explicite avant confirmation. Les anciens brouillons sans ce champ gardent leur défaut natif ; aucune migration. Le réemploi et l’attache refusent un visuel de proportions différentes, en conservant le fichier sans nouvelle dépense. Pas de gabarit ni nouvel outil de génération.

Fichiers principaux : `social-tool-contract/validation/execution`, `social-production-execution`, `social-v2/post-aspect`, `production`, `deps`, `bounded-production-quote`, contexte et composants de conversation. L’annonce native transmet également son ratio au devis commun ; ses tests sont conservés.

## Vérifié

- `npm test -- tests/conversation211-social-production.test.ts tests/conversation211-campaign-visual.test.ts tests/social-native-production-binding.test.ts tests/publications-qualite.test.ts` : **84 tests réussis, 4 fichiers**. Quatre ratios, devis/moteur/reçu, mauvais ratio acquis conservé sans attache, portrait non réemployé pour un carré, ancien brouillon et clarification du ratio manquant ; régressions produit/multi/service, droits, coûts, versions et acquis.
- `npm run typecheck` puis `npm run build` réussis ; build propre exact `9708be90`. Pas de nouvelle répétition locale de l’ancienne suite complète ; CI complète finale exigée sur la tête publiée, état dans la PR.
- `node --import tsx scripts/verify-agent211-build.ts <dossier-vide> --social-aspect-ui` : **vrai Studio compilé + worker + SDK vers faux HTTP**. Carré confirmé, brief natif 1:1, requête image 1:1 / taille native 1024 × 1024, fichier final 1080 × 1080 et téléchargement exact. Référence transmise/hash vérifié. Deuxième visuel : 503 simulé, un seul essai, échec à 95 %, premier fichier intact, rechargement sans appel. Auth/isolement/CSRF/plafond forgé restent contrôlés. Même SHA, sources inchangées.

[Commandes et empreintes](211_D11F_PREUVES.json) · [preuve native](preuves-211-D11f/native-square-proof.json) · [ordinateur](preuves-211-D11f/01-devis-visuel-ordinateur.png) · [mobile](preuves-211-D11f/02-devis-visuel-mobile.png) · [échec et acquis conservé](preuves-211-D11f/04-echec-mobile.png) · [film réel 16,6 s](preuves-211-D11f/social-square-workflow.mp4). Quatre captures ouvertes, trois sélectionnées, un film sans accélération. Mire synthétique ; original PNG/WebM gardé dans la recette/artefact CI.

## Limites et suite

**0 fournisseur réel / 0 € réel**, aucune qualité créative réelle qualifiée. Le parcours SDK complet couvre le carré ; les trois autres ratios sont vérifiés au contrat et au moteur injecté. Un ratio vertical ne prouve ni une story publiée ni une compatibilité réelle de compte social. Aucun nouvel accès, publication ou transformation d’un média existant.

Le réemploi explicite d’un acquis de publication après conflit, le registre des nouvelles capacités et l’actualisation des onglets restent à compléter séparément, puis intégration D12/E/F et limites vidéo restantes. **#211 reste partielle ; Studio client inchangé.** Compositions et branches Claude préservées.
