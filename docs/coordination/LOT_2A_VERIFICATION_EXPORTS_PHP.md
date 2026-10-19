# Lot 2A — vérification d’exécution PHP des exports, 18 octobre 2026

Complément de la passe déjà livrée sur #134, en réponse à la reprise du même [brief](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/134#issuecomment-6244332584). Brief relu intégralement, derniers commentaires #133/#134 vérifiés ; aucune consigne nouvelle ni modification concurrente trouvée. Branche conservée `codex/lot-2a-themes-reference`, base distante/local synchronisée `0964f10f8b48ac82317e242535b63ce080bc62ae`. L’accusé initial [6244410291](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/134#issuecomment-6244410291) et les reçus de livraison restent conservés.

Code de ce correctif testé : **3bc50910ef4c950946813340b79196467e1d68f3**. La recette a tourné sur l’arbre figé devenu ce commit ; `sourceBase` dans le JSON désigne le parent avant enregistrement du correctif. Les trois empreintes dans [la preuve PHP](../../reports/lot2a/verification-php/exports-et-parite.json) correspondent à cet arbre ; les sources applicatives sont restées inchangées pendant la recette finale. Les captures et vidéos continuent de montrer le moteur d’aperçu `f40ef52dca145344d9972cf14727eeba6c992588` : ce correctif modifie le runtime PHP des exports et leur avertissement, pas la composition, le CSS ou les interactions de l’aperçu. Aucune nouvelle capture présentée comme issue d’un autre code.

## Défaut reproduit et correction

**REPRODUIT** avec PHP 8.3.35 : le runtime Liquid exporté échouait avec `ParseException: for does not expect else tag` sur `featured-collection`, section réellement utilisée par l’accueil produit de référence. Les contrôles ZIP/Theme Check Shopify précédents ne vérifiaient pas l’exécution PHP. Le journal court d’échec reste livré.

**CONFIRMÉ DANS LE CODE / REPRODUIT après correction** : `EsLiquid\\TagFor` dans `assets/cms/php/es-liquid.php` étend la boucle existante pour reconnaître sa branche `else`. Il distingue une boucle sans itération d’un corps exécuté qui ne produit aucun texte. Imbrication, conditions, arrêt, tableau vide/rempli, intervalle numérique et offset au-delà du dernier article sont exercés. La bibliothèque MIT livrée avec le moteur reste inchangée ; son moteur d’itération est réutilisé.

`tests/lot2a-php-export.test.ts` exécute le moteur extrait d’un **vrai ZIP WooCommerce**, pas une réponse PHP simulée. Les régressions tournent avec un PHP réel ; sans PHP, elles sont explicitement ignorées. La nouvelle mise en garde commerciale est aussi testée sans dépendre de PHP.

**CONFIRMÉ DANS LE CODE / REPRODUIT, limite non corrigée** : les globales PHP WordPress ne fournissent pas `collections` aux grilles Liquid `featured-collection` et `ref-offers` en mode boutique. La grille de l’accueil produit n’est donc pas une collection WooCommerce fonctionnelle. `exportWordPress` ajoute maintenant `catalog_collection_requires_native_block`, avec instruction de remplacer la grille par un vrai bloc WooCommerce Collection de produits et de vérifier images/liens après import. Ce signalement ne réalise pas l’adaptation native et ne certifie pas le catalogue.

## Vérifications réelles

Environnement : Node 24.19.0, PHP CLI 8.3.35 provenant de l’image publique `php:8.3-cli-alpine`, digest `sha256:8dbeb51c352cf1f70d5d50f3642c9fbed311e914475ea2382f5bc1525bef7bb3`. Premiers contrôles dans un conteneur sans réseau, système en lecture seule et fichiers de test montés en lecture seule. Pour la suite entière, le même interpréteur et ses bibliothèques ont été extraits dans `/workspace/work/lot2a/php-native`, puis exécutés avec son chargeur dans ce dossier, sans installation système. Aucun CMS installé ni connecté. Un lanceur Docker reproductible est livré pour les contrôles ciblés.

| Commande réellement exécutée | Résultat |
|---|---|
| `PATH=/workspace/work/lot2a/php-bin:$PATH npx vitest run tests/cms-v2.test.ts tests/calendrier-reservation.test.ts --testNamePattern 'parité :\|le calendrier rendu\|salle, date, horaire'` | 3 tests exécutés et réussis ; 30 exclus par ce filtre, pas des réussites |
| `PATH=/workspace/work/lot2a/php-bin:$PATH npx vitest run tests/lot2a-php-export.test.ts` | 9 tests réussis, aucun ignoré ; moteur des ZIP et sections éditoriales |
| `PATH=/workspace/work/lot2a/php-native/bin:$PATH npx tsc --noEmit` | Réussi, code 0 |
| `PATH=/workspace/work/lot2a/php-native/bin:$PATH npx vitest run` | **263 fichiers et 1 983 tests réussis, aucun échec, aucun ignoré**, 648,75 s ; [journal](../../reports/lot2a/verification-php/tests-complets.txt) |
| `DATA_DIR=/workspace/work/lot2a/passe2/build-php-data STOCK_OFFLINE=1 NEXT_TELEMETRY_DISABLED=1 npm run build` | Réussi, code 0 |
| `PATH=/workspace/work/lot2a/php-native/bin:$PATH DATA_DIR=/workspace/work/lot2a/passe2/php-exports-isoles STOCK_OFFLINE=1 npx tsx reports/lot2a/verification-php/verifier-exports.mjs` | Deux ZIP régénérés par `cmsExport`, tous leurs fichiers PHP analysés et sections exécutées ; détail ci-dessous |
| `sha256sum --check /workspace/work/lot2a/passe2/sources-figees-php.sha256` | 3 fichiers sources conformes avant/après tests |
| `git diff --check` | Réussi avant envoi |

Les captures et vidéos, les 137 cas Theme Check locaux et les ZIP Shopify précédents sont conservés, sans nouveau succès inventé. Aucun fichier de thème Shopify, script d’aperçu ou CSS changé dans ce correctif PHP ; leur relecture visuelle n’est pas une nouvelle capture. L’état exact de la CI distante est ajouté aux reçus des PR, avec son commit ; un run en cours n’est pas compté comme réussi.

## Deux nouveaux ZIP WordPress vérifiés

[Archives, scripts et journaux](../../reports/lot2a/verification-php/README.md). Les fichiers de démonstration et médias autorisés proviennent du `ThemeSpec` et des médias déjà archivés à la passe précédente. Le chargeur de test réutilise ces octets via le vrai contrat `AssetLoader`, dans une autre base vide dédiée. Les archives sont régénérées par l’adaptateur ; elles ne sont pas corrigées à la main.

| Référence | Fichiers dans le ZIP | Syntaxe PHP | Parité éditoriale réellement exécutée |
|---|---:|---:|---|
| Produits | 131 | 52 fichiers, aucune erreur | 11 sections identiques hors adaptations déclarées ; **1 grille commerciale différente**, non certifiée |
| Services | 139 | 51 fichiers, aucune erreur | 13 sections identiques hors adaptations déclarées, dont le récit à chapitres |

La comparaison tolère uniquement les adaptations déjà documentées des formulaires, icônes de paiement et préfixes techniques de sections. La différence de grille commerciale est conservée dans le JSON avec son premier écart ; elle n’est pas transformée en succès. Les deux archives conservent leur moteur et les médias présents, avec leurs empreintes. Cette recette est une **exécution PHP de sections**, pas un WordPress installé, un navigateur WooCommerce ni un paiement.

## Ce qui reste partiel

- La grille commerciale Liquid de l’accueil produit doit être remplacée/configurée avec un bloc natif WooCommerce après import ; cette adaptation n’est pas livrée. La boutique Woo native et sa page catalogue restent celles de l’export existant.
- Aucun adaptateur serveur de remises/cadeaux au paiement CMS. Offres avancées désactivées à l’export, configuration conservée ; limite inchangée. Pas de nouvelle règle d’expédition ni achat accéléré certifié.
- Pas d’installation CMS, de commande réelle, de synchronisation de stock, d’e-mail envoyé, de connexion Google ni d’appel fournisseur IA.
- Shopify : affectation manuelle des modèles ; Woo/PrestaShop : fiches produit natives partagées ; Wix/Squarespace : kits de reconstruction. Aucun de ces écarts déclaré résolu par PHP.
- Aucun nouveau média généré : images existantes, pochette sans photo. CLS produit local maximal 0,149 et revue esthétique des références restent ouverts.
- Les deux thèmes sont soumis à Thomas avant les 28 autres. Aucun merge, déploiement, publication client ou service payant nouveau.

Les erreurs de préparation du harnais (chemin `inc/php`, dossier `snippets`, contrat du chargeur de médias) ont été corrigées avant la recette finale ; elles ne sont pas qualifiées de pannes applicatives. Le défaut réel `for/else` et la dégradation de la collection sont distingués ci-dessus. Aucun échec intermédiaire compté comme réussite.
