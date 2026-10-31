# #211 — D9b : retouches natives depuis SYNA

29 octobre 2026. Livraison pour revue, sans fusion, activation, redémarrage du Studio réel ni appel fournisseur réel. Suite de la [décision propriétaire](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/211#issuecomment-6488971173). **D9 et la mission #211 restent ouverts** : logos D9c, puis D10/D11 et D12/E/F ne sont pas livrés par cette PR.

## Version et dépendances

- PR #231, branche `codex/211-lot-d9b-retouches-syna`, empilée sur #230, parent documentaire `2549f17706906e5466502ccd0690489988288828`.
- Code final, build vierge et navigateur réellement servi : **`12f3617f5f00018fa1892f9ccacfe841ad820e0e`**, arbre `d84cfd9fb02ed60438a9402ae912f3a04b3d957f`.
- Premier candidat `d1e16e82125522fc0445d4164f8d5ca4ab9189d4` : non substitué au code final ; la revue a ensuite corrigé une contradiction entre les références du contrôle et renforcé les preuves négatives.
- Dépendances antérieures : D9a #230, D8 #229, intégration I1 #228. Aucune de ces branches n'est présumée fusionnée. `main` observé à `70204a7ff83eb2382835a27a37a8465c0851a70a` ; aucun changement appliqué à main ou à l'instance du client.
- Le présent complément ajoute seulement rapports et preuves après le code testé. [Empreintes de sources et objets protégés](preuves-211-D9b/traces/protection-sources.json). La suite complète a tourné sur d1 avec les huit corrections locales ensuite publiées exactement dans 12f ; leurs SHA-256 sont comparés au code publié, sources inchangées pendant le test. Build et navigateur ont ensuite tourné sur 12f propre.

## Résultat utilisable sous drapeau de revue

Dans **la même conversation SYNA**, le client peut désigner une image acquise et demander une retouche, avec un style facultatif issu d'une autre image : proposition cognitive → source et style identifiés → devis natif distinct → confirmation → worker et moteur ImageV2 existants → nouvelle version dans la bibliothèque → reçu, aperçu, téléchargement et reprise. Aucune insertion de page automatique. Le drapeau existant `STUDIO_CONVERSATION_IMAGES` reste désactivé par défaut.

Le parcours peut ensuite proposer séparément l'insertion de ce nouvel acquis dans une image native du Site, avec avant/après et accord, via l'opération D2 existante. L'export D3 et l'annulation native conservent les trois versions du thème et l'image retouchée. Il ne s'agit pas d'un deuxième assistant, d'un nouveau moteur d'images ou d'un fournisseur ajouté.

## Causes corrigées et fichiers

| Constat et statut | Correction et emplacement |
| --- | --- |
| **CONFIRMÉ DANS LE CODE / REPRODUIT** : les anciennes propositions ne pouvaient pas exprimer une retouche avec source/style par position d'un reçu. | Contrat strict `image-tool-contract.ts`, résolution `image-tool-sources.ts`, validation `image-tool-validation.ts` dans `src/lib/orchestrator/conversation/`. Les positions sont prouvées par le reçu, le checkpoint et les fichiers natifs ; aucun choix de « première image » implicite. |
| **REPRODUIT** : une référence pouvait être confondue avec une autre ou évincée pour tenir dans les capacités du modèle. | `src/lib/image-v2/request-binding.ts`, `edit-request.ts`, `creation-quote.ts` : source, style facultatif et vraie référence produit distincte, dans cet ordre. Versions, propriétaire, produit/variante/prestation et octets verrouillés. Refus si la route ne porte pas toutes les références essentielles. |
| **REPRODUIT** sur d1, test rouge conservé : le texte du contrôle disait à la fois SOURCE=image2 et PRODUIT=image2. | `src/lib/image-v2/deps.ts`, test `image-v2-edit-review-refs.test.ts` : rôles explicites, candidat/source/style/produit effectivement joints, même contrat entre devis et contrôle. |
| **CONFIRMÉ DANS LE CODE / REPRODUIT** : un score élevé ne prouvait pas l'application de la demande sans altération hors demande. | `types.ts`, `quality.ts`, `deps.ts` : champs stricts obligatoires `sourceAltered:false` et `requestedChangeApplied:true`, en plus des contrôles critiques antérieurs. Pas de valeur permissive implicite si un champ manque. |
| **REPRODUIT EN TEST NATIF INJECTÉ** : si la relecture s'arrêtait au plafond après acquisition, le fichier pouvait rester sans reçu client consultable. | `engine.ts`, `assets.ts`, `edit-photo.ts`, `request-binding.ts`, `image-tool-execution.ts` : fichier conservé comme diagnostic non livrable, séparé des sorties réutilisables. Le plafond reste actif et aucune nouvelle tentative n'est lancée. |
| **REPRODUIT DANS LE NAVIGATEUR** : une relecture incomplète doit permettre de retrouver l'essai sans l'annoncer livré. | `conversation-image-tools.tsx`, `image-tool-execution.ts` : essais visibles, décodables et téléchargeables séparément ; aucun bouton de désignation ou d'insertion pour un essai rejeté. Message compréhensible ; détail technique conservé dans tâche/contrôle/journaux natifs. |
| **REPRODUIT** : la nouvelle image doit rester liée à sa source sans écraser les acquis. | `src/lib/library.ts` : allocation de version dans la transaction SQLite ; `edit-photo.ts` conserve `sourceAssetId` et racine `versionOf`. Originaux et style inchangés, version utilisable antérieure conservée. |

Les consignes exactes restent intactes, avec retours à la ligne et doubles espaces ; les règles de vocabulaire demeurent séparées. La requête pure de retouche est partagée par devis et génération et ne tronque pas la demande. Le transport natif conserve fetch/FormData, proxy/NO_PROXY, passerelle et absence de retry. Les contrôles D9a et les étapes CI précédentes restent présents ; une étape de recette D9b s'ajoute.

Les fichiers de tests ajoutés/modifiés sont `conversation211-images.test.ts`, `image-v2-retouch-binding.test.ts`, `image-v2-retouch-request.test.ts` et `image-v2-edit-review-refs.test.ts`. Les harnais sont `scripts/verify-agent211-build.ts`, `verify-agent211-images-ui.ts`, `verify-agent211-retouch-ui.ts`.

## Contrôles réellement exécutés

[Commandes, heures, codes de sortie et empreintes](preuves-211-D9b/verifications.json), [journaux](preuves-211-D9b/logs/), [mises au point conservées](preuves-211-D9b/traces/mises-au-point.json).

```bash
npx tsc --noEmit
npx vitest run
npx vitest run tests/image-v2-edit-review-refs.test.ts tests/conversation211-images.test.ts tests/image-v2-retouch-binding.test.ts tests/image-v2-retouch-request.test.ts tests/image-v2-binding.test.ts tests/image-v2.test.ts
npm run build
npx tsx scripts/verify-agent211-build.ts /workspace/reviews/ecom-211-state/D9b-browser-final-review-proof --retouches-ui
```

- Suite finale : **3 857 réussis / 45 ignorés**, 440 fichiers réussis et un ignoré ; 698,29 secondes. Sources figées et empreintes correspondant au code 12f.
- Ciblés : **89 réussis dans six fichiers effectivement trouvés**. Types réussis. Build propre 12f et recette finale 12f réussis, sans modification applicative après capture.
- Vrai serveur Next compilé, vraies routes, consentements, SQLite isolée, vrais jobs/worker, SDK et moteur natif. **Le serveur HTTP fournisseur est fictif et local** ; aucun appel IA réel, aucune clé réelle utilisée.
- Cinq cas ci-dessous, chacun capturé à une largeur initiale puis à l'autre format. Les 127 captures ont un contrôle géométrique ; aucune erreur JavaScript ni débordement détecté par le harnais. Les identités/versions/SHA, références préparées au SDK et requêtes multipart sont comparés. Une requête texte JSON et un multipart peuvent encoder LF/CRLF différemment ; le texte décodé et les doubles espaces restent identiques.

| Cas isolé | Créations initiales | Retouche utilisable | Références réellement envoyées |
| --- | --- | --- | --- |
| Presse de linogravure, mono | 5 | V2 liée à la deuxième image | Source + style première image + vraie photo produit |
| Cloche de bouturage, second produit d'un catalogue multiple | 2 | V2 de la deuxième image | Même combinaison à trois références, premier produit non substitué |
| Cadre de tissage portatif, cas inédit | 1 | V2 de la première image | Source + vraie photo produit, sans style ajouté |
| Entretien de vitraux, prestation | 2 | V2 de la deuxième image | Source + ambiance/style, aucune prestation convertie en article |
| Numérisation de plaques photographiques, nouveau cas service | 2 | V2 de la deuxième image | Source + ambiance/style |

Le cinquième métier a été ajouté après le premier candidat D9b. C'est un cas de généralisation technique, **pas une évaluation créative indépendante ni un test aveugle d'intelligence**. Aucune règle applicative ne dépend de ces noms.

Pour chacun : téléchargement par le navigateur et SHA identique, réouverture, double confirmation retournant le même job sans nouvel appel, reprise des reçus précédents, accès étranger 404 y compris aux fichiers, CSRF 403 et limites forgées 400. Catalogue, variantes et prestations sont comparés avant/après. Les versions utilisables et la photo/style d'origine restent inchangées.

### Échecs, limites et acquis

1. **REPRODUIT dans le navigateur final**, cas inédit : réponse HTTP de contrôle volontairement privée des deux champs critiques. Le vrai SDK la refuse. Job **failed à 90 %**, aucune sortie livrable, image conservée comme essai V3, téléchargeable avec SHA vérifié, sans bouton d'insertion. Série initiale et V2 utilisable intactes. Réouverture, attente et double confirmation : aucun nouvel appel ; compte étranger 404.
2. **REPRODUIT dans le navigateur final**, cas vitraux : HTTP 503 fictif à la deuxième image d'une nouvelle passe. Job **failed à 45 %**, premier acquis conservé, ancienne série intacte et une réservation incertaine maintenue. Pas de faux 100 %, de retry, de double débit ou de nouvelle génération à la reprise.
3. **REPRODUIT dans les tests natifs injectés, pas par panne budgétaire du navigateur** : arrêt de relecture par `CostCapReached`, essai conservé sans statut FINAL, aucune dépense au-delà du plafond ni relance. Refus des capacités à deux références lorsqu'il en faut trois ; contrôles produit/source/personnes et versions inchangés.

Les deux premiers passages de mise au point ont échoué : fixture de contrôle lisant le mauvais champ, puis fonction Playwright injectée non autonome. Corrigés dans le harnais, sans relâcher le contrôle applicatif ; anciens passages conservés et non présentés comme recette finale. La contradiction source/produit a produit un véritable test rouge avant correction. Un manque de place temporaire a concerné uniquement la préparation d'une autre copie de revue ; ses fichiers de travail propres ont été préservés. Les suites achevées et la recette finale n'ont ni erreur disque ni source modifiée.

## Passage acquis → Site → ZIP → annulation

**REPRODUIT cinq fois dans le navigateur final** : nouvelle demande explicite, proposition cognitive simulée, devis D2 à 0 % supplémentaire, confirmation, `use_media` natif seulement, image décodée dans le vrai aperçu, ZIP téléchargé contenant les mêmes octets et le champ de gabarit, puis annulation explicite. Spécification et image initiales entièrement restaurées, trois versions du thème conservées ; la retouche V2 reste dans la bibliothèque.

**Limite volontaire de cette preuve :** les sites sont les fixtures techniques D2 indépendantes « Capteurs de ruches » et « Atelier des cordes ». Leur texte n'est pas réécrit pour la linogravure ou les vitraux. Ce contrôle prouve la circulation et la restauration des médias, **pas la qualité d'un site client cohérent, son copywriting ou une composition professionnelle**. Les compositions de Claude ne sont pas modifiées.

Les cinq ZIP passent l'outil officiel Theme Check : **0 erreur / 35 avertissements chacun**, 498 fichiers pour les trois cas produit et 499 pour les deux services. Les avertissements ne sont pas masqués et le contrôle conserve le statut **PROVISIONAL, scope static**. Installation, fidélité des pages/sections, typographie, couleurs, responsive, navigation, boutons et e-commerce sont explicitement non mesurés. Aucun CMS installé/connecté, aucun produit synchronisé et aucune publication. [ZIP, statuts et empreintes](preuves-211-D9b/traces/fichiers-budgets-exports.json).

## Coûts et budgets

**0 appel fournisseur réel, 0 € de coût réel pour cette recette.** 59 échanges HTTP fictifs : 39 textes et 20 images ; 59 lignes d'appels, 57 usages connus, total **4 412 209 micro simulés**. Deux réservations incertaines, **523 083 micro** au total, restent retenues séparément ; leur montant enregistré ne constitue pas une facture vérifiée. Les compteurs de tokens sont eux aussi fictifs. Aucun gain financier, capacité photographique ni authentification fournisseur réelle n'est déduit de ces nombres.

Les seuils 40 % de l'abonnement HT et 50 % de recharge HT, droits de création, consentements et budget commun ne changent pas. Une retouche liée ne réinitialise ni compteur, ni budget, ni coût incertain. Un fichier de diagnostic ne devient pas un acquis réutilisable pour contourner les contrôles.

## Preuves consultables et portée visuelle

[Galerie et téléchargements](preuves-211-D9b/README.md) : **127 PNG originaux**, 22 planches de contact, cinq planches d'échantillons vidéo, cinq MP4 et leurs cinq WebM originaux, cinq ZIP, traces et journaux. Les vidéos n'ont ni coupe, accélération ni filtre ; durées/FPS/nombre de trames et comparaison RGB source/MP4 sont conservés. Le cadre vidéo garde la taille initiale : lors du passage mobile/ordinateur, l'autre taille est réduite dans ce cadre. Les PNG originaux sont la preuve lisible à pleine résolution.

Inspection visuelle : 22 planches de contact et les cinq planches vidéo ouvertes ; originaux finaux ouverts séparément pour l'essai refusé sur mobile, la référence produit et l'aperçu d'insertion multiproduit. Les captures nommées « proposition » peuvent montrer une zone d'historique avant défilement ; les captures devis/références/résultat documentent l'action. Toutes les images de recette sont des motifs fictifs : aucun photoréalisme, fidélité produit perceptuelle, personne, qualité stratégique ou marque n'est qualifié par cette inspection.

## Préservation et limites restantes

- Objets Git de `theme-base/`, `src/lib/theme/`, médias de démonstration/thèmes, CLAUDE.md, facturation et accès IA inchangés entre la base D9a et 12f. Pas d'accès ni modification des projets VANS/Contretemps, médias ou `.env` clients. Seules données synthétiques temporaires.
- Photos uniquement dans ce raccordement : références contenant une personne connue refusées ; aucune identité de personne fournie qualifiée. Un défaut de métadonnées n'est pas une preuve d'absence de personne : contrôle fournisseur réel encore nécessaire.
- Retouche d'affiches composées et de logos non raccordée. Trois propositions de logos : D9c séparé encore en développement. D10 vidéo/audio, D11 publications/publicités et D12/E/F restent ouverts.
- Pas de migration silencieuse des anciens projets. Le verrou produit reste conservateur : une évolution de sa version, même commerciale, impose de revoir le devis.
- Réutilisation native et idempotence couvertes ; la réutilisation d'une retouche à budget nul est testée en code, pas qualifiée comme scénario navigateur autonome dans ce lot. Pas d'« annulation de retouche photo » automatique : anciennes versions conservées et sélectionnables ; annulation du remplacement de Site vérifiée.
- CI du nouveau code/livraison à consulter sur le SHA exact ; aucun feu vert n'est déduit de la CI D9a. Aucun fournisseur réel ni CMS testé. Mise en service chez le client non effectuée et non autorisée par ce lot.

Prochaine étape autorisée : finir D9c avec les trois directions du moteur natif et leurs devis/reçus, puis D10 et D11, en conservant les mêmes protections. Aucune fusion demandée ou exécutée par cette livraison.
