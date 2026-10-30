# #211 — E9 : premier Site sans thème du catalogue

Le même SYNA peut proposer une première composition lorsqu’aucun thème n’est installé. Une base **virtuelle**, fonctionnelle, est construite avec les DTO, schémas et composants du moteur existant ; elle n’est pas enregistrée. Le plan doit réellement ajouter des sections à l’accueil. Réflexion IA avec son devis/accord, puis application exacte à **0 % supplémentaire**, avec un deuxième accord. Une simple base vide ou une réponse textuelle ne devient pas un site livré.

**Application et build propre contrôlés : `cf6e630e3f30dfe72fe2236cdb9067c1b3722714`. Harnais final : `e04e13f3196ef6844c5d26e43bc1ce2190843007`, aucune différence de `src/` ou `worker/` avec ce build.** Copie isolée ; aucune instance client mise à jour. Drapeau `STUDIO_CONVERSATION_ORIGINAL` fermé par défaut, en plus des drapeaux existants. CI complète exigée sur la tête finale de cette PR, encore en attente à la publication.

## Changements et protections

- `theme/composition/original.ts` : base technique commune, sans composition ni contenu commercial d’une démonstration. Palette/polices du projet, tokens natifs communs, en-tête, pied, panier, fiche/variantes et contact. Données Catalogue actives par `withStudioProducts`, pas de second catalogue. Aucun choix de thème, média acheté ou texte rédigé en local à la place de l’IA.
- `composition/server.ts`, `assemble.ts`, `contract.ts` : contexte original seulement si disponible ; sources entières, provenance et dimensions des images. Sources client et acquises distinctes. Composants sûrs, sans code arbitraire ; fonctions et verrous conservés. Les sources SEO natives E5 restent réutilisables.
- `theme-tool-execution.ts` : mêmes devis, worker et reçus que la composition existante ; première sauvegarde avec parent attendu **null**. Droits, étapes approuvées et fraîcheur natifs contrôlés ; version concurrente, annulation ou droit retiré : arrêt sans écrasement. Reprise d’une version enregistrée sans duplication. La première création n’offre pas une annulation destructive vers « aucun site » ; les retouches suivantes conservent leur restauration native.
- `conversation-theme-tools.tsx`, contexte et registre : explication du premier plan et disponibilité honnête. Aucun résultat qualifié par le seul statut `done`. Contrôle du bail avant l’écriture. Les thèmes déjà installés ne sont pas convertis silencieusement en mode original.
- `engine/shop.ts` réduit seulement le type d’entrée de son mapper produit aux deux champs réellement lus ; `directions.ts` expose son calcul de contraste existant. Aucune composition de Claude, section Liquid, CSS ou démonstration modifiée.

## Contrôles réellement exécutés

**89 tests ciblés distincts / 7 fichiers réussis**, puis types réussis. Le fichier historique Lot 1 corrigé côté E8 a aussi **17 tests réussis** : refus 409 d’une prestation absente, aucun nouvel appel et deux documents conservés. Pas de seconde suite complète locale : une CI complète finale est demandée, conformément à la méthode du complément 6517581742.

Commandes et états détaillés : [checks.json](preuves-211-E9/checks.json). Principales commandes :

```bash
node node_modules/vitest/vitest.mjs run tests/composition211-original.test.ts tests/composition211-plan.test.ts tests/composition211-server.test.ts tests/composition211-syna.test.ts tests/composition211-acquired-copy.test.ts tests/conversation211-theme-tools.test.ts tests/conversation211-studio-knowledge.test.ts
node node_modules/typescript/bin/tsc --noEmit
npm run build
bash scripts/verify-theme.sh --rapide
node --import tsx scripts/verify-agent211-build.ts DOSSIER_NEUF --original-ui
node --import tsx scripts/verify-agent211-build.ts AUTRE_DOSSIER_NEUF --original-holdout-ui
```

Exécution avec stockage temporaire, garde réseau et Chromium local, jamais les données du Studio client. Premier build `0035ba3a` puis build `cf6e630e` uniquement après correction des défauts visuels observés. Les 25 cas rapides Theme Check ont réussi ; `theme-base/` et le compilateur sont inchangés entre ces builds, ce contrôle commun est réutilisé.

**Parcours SDK/HTTP local simulé + vraies routes compilées, vrai worker et Chromium** : devis → accord → première version → rechargement sans appel → aperçu → export. Mono-produit (filtre céramique), vrai catalogue de deux outils de reliure, entretien de pianos, puis **numérisation de partitions anciennes**, choisi après gel du code applicatif. Ce dernier cas n’a servi ni au développement du moteur E9 ni à ses tests unitaires. Il vérifie la généralisation du raccordement ; il ne prouve pas la compréhension d’une IA réelle.

À 1440/1024/390/360 px : pas de débordement, image cassée ni emplacement image fictif. Produit et catalogue : variante changée, quantité 2, panier 25 800 centimes. Services : formulaire présent et aucun envoi réel ; pas de panier dans leur navigation. [Preuve navigateur](preuves-211-E9/browser-proof.json).

La capture mobile complémentaire reprend **la version déjà acquise**, sans worker ni nouvel appel : compteurs appels/usages/tâches/versions/médias identiques avant/après. Aucune répétition de la génération simulée pour obtenir cette capture.

## Défauts trouvés pendant la vérification

1. Sans thème, le parcours était refusé avant toute proposition : sept tests rouges ont reproduit le manque. Erreur interne de préparation du validateur corrigée vers `assertSafeThemeContent`, sans retirer de protection.
2. Première recette : le harnais omettait le bouton d’ouverture facultative du dialogue. Clic ajouté, application et build réutilisés.
3. La recette passait techniquement, mais l’inspection montrait un emplacement d’image vide et un mot-symbole excessif en pied. Rouge minimal pour l’image manquante, garde du composant `image-with-text` en mode original, composant texte pour le passage sans image et pied natif compact ; nouveau build et parcours repassés. Le cadrage paysage conserve l’illustration de recette et son avertissement.
4. La première fixture « multi » n’avait pas encore deux lignes natives : fixture corrigée et **deux vrais produits actifs** contrôlés dans la dernière recette. Une incompatibilité de type du nouveau cas réservé a été corrigée dans le contrat du harnais ; aucune modification du moteur ni nouvelle compilation pour cela.

## Exports et avertissements

| Plateforme | Vérification dans cette passe | Limite conservée |
| --- | --- | --- |
| Shopify | ZIP natif, texte conservé, fichiers fonctionnels, **Theme Check réellement exécuté depuis le Studio compilé**, 0 erreur / 35 avertissements pour chaque cas | PROVISIONAL, contrôle statique ; aucune installation ni commande réelle |
| WooCommerce / PrestaShop | Exports mono-produit 200, ZIP lisibles et texte conservé | Pas d’installation ; import et limites du gabarit produit partagé à vérifier sur la plateforme |
| Wix / Squarespace | Kits mono-produit 200, texte conservé | Kits de reprise, pas des thèmes installables ni synchronisation automatique |

Les mesures natives de l’export sont conservées dans la preuve navigateur. Les avertissements ne sont pas masqués : **25 ExcessiveSettingsCount, 6 UnusedAssign, 1 RemoteAsset, 2 UnclosedHTMLElement, 1 LiquidComplexity**. [Détail des 35 avertissements](preuves-211-E9/shopify-warnings.json), inspecté sur le premier ZIP compilé conservé, mêmes fichiers Liquid que le ZIP final. Les deux balises signalées concernent `ap-form.liquid` non utilisé ici ; la complexité 121/120 concerne `main-product.liquid`, utilisé. Pas de correction des compositions de Claude dans ce lot.

## Preuves lisibles

- [Accord sur téléphone](preuves-211-E9/01-accord-mobile.png)
- [Rendu service sur ordinateur](preuves-211-E9/02-service-ordinateur.png)
- [Rendu produit sur téléphone](preuves-211-E9/03-produit-mobile.png)
- [Vidéo réelle des clics, 12,84 secondes](preuves-211-E9/original-native.mp4)

Images et vidéo montrent des données/illustrations **synthétiques explicitement annoncées**, pas une création commerciale approuvée. Les trois captures finales ont été ouvertes et inspectées.

## Partiel, dépendances et suite

**Zéro fournisseur IA réel, zéro euro réel.** Le raisonnement, le plan et les visuels professionnels ne sont pas qualifiés par ces fixtures. L’original commence ici par l’accueil et les fonctions natives communes ; création automatique de pages par prestation, réservation dans cette nouvelle base, composition de toute une boutique et critique visuelle IA restent à étendre. Aucun CMS installé, paiement, contact envoyé ou site publié. Le contrôle d’image manquante ajouté porte sur le composant réellement observé ; il n’est pas présenté comme un audit visuel exhaustif de toute la bibliothèque.

Dépendance #265 : correctif de recette `accda0ed` et documents `a5db29cb` conservés par contenu identique, sans merge, rebase ni duplication du correctif. Parents #264/#263 et autres dépendances restent soumis à leurs CI et revues. Main revérifié `70204a7f`, #208/#210 et Claude #245 toujours ouverts/non fusionnés. #245/#247/#248 demeurent des travaux distincts : leurs fonctions métier ne sont pas réinventées ici. **#211 reste partielle** ; aucune activation, fusion ou mise en service autorisée par cette livraison.
