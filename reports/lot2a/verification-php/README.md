# Vérification PHP — suite de la livraison Lot 2A

Le moteur PHP des exports WordPress a été corrigé pour les boucles Liquid `for/else`. Les deux archives ci-dessous ont été régénérées par le vrai adaptateur du studio à partir des données et médias de la passe précédente.

- [ZIP WordPress/WooCommerce — produits](products-woocommerce.zip?raw=1)
- [ZIP WordPress — services](services-woocommerce.zip?raw=1)
- [Preuve d’exécution des sections, limites et empreintes](exports-et-parite.json)
- [Rapport détaillé](../../../docs/coordination/LOT_2A_VERIFICATION_EXPORTS_PHP.md)
- [Captures originales et vidéos conservées](../passe-2/README.md)

**Ce qui est vérifié :** syntaxe de 52 fichiers PHP produit et 51 services ; rendu de 11 sections éditoriales produit et 13 services. La comparaison conserve les adaptations connues des formulaires, icônes de paiement et identifiants techniques.

**Ce qui reste dégradé :** la grille commerciale Liquid n’est pas alimentée par WooCommerce. L’écart figure dans le JSON et l’export comporte un avertissement. Remplacer cette grille par un bloc natif Collection de produits, puis vérifier le parcours dans WordPress. L’adaptateur n’effectue pas ce remplacement. Remises/cadeaux au paiement CMS désactivés faute d’adaptateur serveur ; fiches Woo/Presta partagées, affectation Shopify manuelle, Wix/Squarespace kits : limites inchangées. Aucune installation CMS ni commande réelle n’est certifiée ici.

## Rejouer

Avec Node/dépendances du dépôt et PHP CLI disponible :

```bash
npx vitest run tests/lot2a-php-export.test.ts
DATA_DIR=/tmp/lot2a-php-isole STOCK_OFFLINE=1 npx tsx reports/lot2a/verification-php/verifier-exports.mjs
```

Utiliser un répertoire DATA_DIR dédié et vide. Le script emploie exclusivement les médias déjà archivés, interdit `fetch`, régénère les ZIP par `cmsExport`, analyse tous les fichiers PHP et exécute le moteur extrait des nouvelles archives. Il conserve les différences de collection commerciale, sans les qualifier de parité réussie.

Un interpréteur Docker facultatif est fourni dans [php-docker.sh](php-docker.sh). Précharger l’image PHP publique au digest indiqué dans ce fichier, créer un lien nommé `php` vers ce lanceur dans un dossier temporaire puis placer ce dossier au début du PATH. Le conteneur s’exécute sans réseau, en lecture seule, avec seulement le dépôt et `/tmp` montés en lecture seule. Ce lanceur ne configure aucun CMS.

## Journaux

- [Régression finale ciblée : 9 tests PHP](regressions-php.txt)
- [Exécution des 3 anciens tests précédemment ignorés](trois-tests-php-anterieurs.txt) — les 30 autres sont exclus par le filtre de cette commande.
- [Reproduction initiale du défaut applicatif](reproduction-for-else.txt)
- [Premier essai du harnais](essai-harnais-initial.txt) — 7 échecs dus à un chemin du harnais, pas une validation ; remplacé par la recette finale.
- [Exécution des ZIP](execution-archives.txt)
- [Build de production](build.txt)
- [Empreintes des trois sources figées](sources-figees.sha256)

**Recette finale :** code `3bc50910ef4c950946813340b79196467e1d68f3`, [263 fichiers / 1 983 tests réussis, aucun ignoré](tests-complets.txt), [types réussis](types.txt), build réussi. Les empreintes des sources correspondent au commit testé. [CI de la base 0964f10](ci-0964f10.json) entièrement réussie ; ne pas confondre ce run avec la nouvelle CI du correctif.
