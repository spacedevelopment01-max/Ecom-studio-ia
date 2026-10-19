# Exports et catalogues multi-CMS — résultats du 18 octobre 2026

Mission : [commentaire 6249656076 de #134](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/134#issuecomment-6249656076). Correctif isolé dans la [PR #136 en brouillon](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/136), vers `codex/lot-2a-themes-reference`.

## Version et périmètre

- Base distante vérifiée : `9f8b6c437580490acc52fd165986a1c3a79b394a` ; livraison visuelle conservée.
- **Code des archives installées et testées : `3ecdcef4e21d8f3912910a6a50c04c4cfbcde973`**, génération sur arbre propre. Les douze ZIP sont issus du moteur, sans retouche manuelle.
- **Harnais des captures finales : `66b0fa70a04b33645d3942cd462be33be9cd8aa2`**. Ce commit ne change que l'attente des animations et le défilement des captures ; aucun changement du runtime livré.
- Modifications : moteur/adaptateurs `src/lib/cms-v2/**`, `src/lib/theme/catalog-export.ts`, runtimes `assets/cms/**`, route d'export pour les erreurs de catalogue, tests/scripts et documentation. Aucun changement à `theme-base/**`, aux démos, aux styles du studio ou aux fichiers communs réservés à Claude.
- Aucun merge, déploiement, connexion CMS externe, paiement ni appel IA payant. Les images utilisées ici sont des mires synthétiques, pas les photos ORBE/Rive ni des médias clients.

## Défauts établis et corrections

| Défaut et conséquence | Preuve | Correction / fichiers principaux |
|---|---|---|
| CSV limités à un axe ; variantes écrasées ou incomplètes et SKU générés en collision | **REPRODUIT** : quatre tests échouaient sur la base ; le CSV Woo contenait deux SKU `serum-eclat--t-` | `theme/catalog-export.ts` : axes complets, tuples et SKU stables, relations parent–variation, stock connu, SEO et images de variantes ; contrôles de collisions |
| Grille Woo demandant une reconstruction manuelle | **REPRODUIT**, puis **VÉRIFIÉ EN CMS LOCAL** | `cms-v2/adapters/wordpress.ts`, `wordpress/es-woo.php`, `es-editor.js` : bloc natif `es/catalog`, collection et ordre sélectionnés, liens vers les bons produits |
| Cible Presta absente remplacée par le produit principal | **REPRODUIT** | `adaptFeaturedProduct` : section invalidée avec erreur explicite ; aucune substitution. Une section désactivée reste désactivée |
| Catalogue et images du ZIP sans import natif reproductible | **CONFIRMÉ DANS LE CODE**, puis **VÉRIFIÉ EN CMS LOCAL** | `cms-v2/catalog.ts`, `wordpress/es-catalog-import.php`, `prestashop/esstudio/catalog-import.php`, `php/es-catalog.php` : catalogue identifié par source, import explicite, médias locaux contrôlés, nouveaux produits non publiés |
| Changement de thème Presta conservant un ancien module compagnon | **REPRODUIT EN CMS LOCAL** pendant la vérification de galerie | ZIP installable séparé `import/module-esstudio.zip`, module 1.1.0 et mise à niveau sans désinstallation ; guide explicite. Données et pages lues dans le thème actif |
| Anciennes photos importées restant dans la galerie Presta après retrait | **CONFIRMÉ DANS LE CODE**, puis **VÉRIFIÉ EN CMS LOCAL** | Import : détachement des anciennes associations de la boutique courante, conservation des objets/fichiers et des photos non gérées par l'import. Assertion native de galerie exacte |
| Compteur Woo Blocks inchangé après changement de quantité | **REPRODUIT DANS LE NAVIGATEUR** | `wordpress/es-woo.js` : lecture du champ natif `itemsCount`, abonnement à l'état serveur ; test du runtime et contrôle navigateur du compteur à 2 |
| Présentation Presta affichant le prix parent plutôt que la variante initiale, description omise | **OBSERVÉ DANS LE NAVIGATEUR / CONFIRMÉ DANS LE CODE** | `adaptFeaturedProduct` : prix initial correct et texte complet de la section ou, à défaut, description HTML du produit ; régression avec texte long |
| Présentation Presta adaptée sans la feuille de style de son composant V2 | **OBSERVÉ DANS LES CAPTURES / CONFIRMÉ DANS LE CODE** | Adaptateur Presta : livraison de `theme-v2.css` et de ses variables lorsque la transformation introduit un composant V2 dans un ancien thème ; aucune retouche aux styles sources |
| Reprise incomplète des réglages et médias potentiellement étrangers/refusés | **VÉRIFIÉ PAR TESTS AUTOMATISÉS** | `cms-v2/export.ts` : exclusion avant chargement et association ; sauvegarde JSON des contenus/réglages ; fichiers effectivement livrés et empreintes dans le manifeste |
| Pages WordPress en brouillon/supprimées ou homonymes lors des réactivations | **CONFIRMÉ DANS LE CODE / VÉRIFIÉ PAR TESTS** | `wordpress/es-theme.php` : correspondances de source, conservation de l'état natif ; référence absente = 404, sans adoption d'une page étrangère |

Les protections d'accès, droits et budget restent en place. Les avantages commerciaux avancés restent désactivés sans adaptateur serveur vérifié ; leurs configurations sont conservées, sans prétendre valider remises ou cadeaux au paiement.

## Preuves par plateforme

### WordPress 6.6.2 / WooCommerce 9.3.3 — PHP 8.2.25

**VÉRIFIÉ EN CMS LOCAL ET NAVIGATEUR**, à partir des ZIP réellement générés : import CSV natif de contrôle à trois axes puis réimportation, import local de quatre produits et sept variantes, réimportations sans doublons ni nouvelles pièces jointes, modification prix/stock/SKU/image avec identifiants conservés et publication existante conservée. Les nouveaux produits étaient d'abord en brouillon ; leur publication a été une action explicite du banc jetable.

À 1440 et 390 px : grille limitée aux deux produits choisis, lien produit, trois sélecteurs, variante et image correctes, ajout au panier natif, quantité 2, total **66,70 €**, compteur d'en-tête à 2. Le produit supplémentaire à un axe `Été` / `Ete` sélectionne deux identifiants natifs différents. Les pièces jointes proviennent des fichiers du ZIP, sans URL publique du studio.

Service : activation du thème sans création de produits ; Woo désactivé sur ce seul banc ; aucun formulaire d'achat sur l'accueil ; contact soumis sur les deux tailles et reçus lus en base. Installation : téléverser le thème, puis Outils › Catalogue E-COM STUDIO ; suivre le [mode d'emploi](EXPORTS_CATALOGUE_MODE_EMPLOI.md).

### PrestaShop 8.1.7 / Classic — PHP 8.1.30

**VÉRIFIÉ EN CMS LOCAL ET NAVIGATEUR** : installation/activation via ThemeManager, mise à jour explicite du module livré, import de quatre produits et sept déclinaisons, réimportations stables, prix/stock/référence/image mis à jour et galerie retirée correctement. Les nouveaux produits étaient désactivés ; leur activation a été explicite dans le banc. Les deux valeurs accentuées proches gardent leurs identifiants distincts.

À 1440 et 390 px : grille choisie, page produit native, axes, image, ajout au panier, quantité 2 et total **66,70 €**. Service : pas de produit créé par l'activation, contact envoyé au traitement local et vérifié en base. Les produits déjà présents dans une boutique Presta ne sont pas supprimés par le thème service. Le contact local est validé ; l’agenda externe intégré et Google Maps ne le sont pas (requêtes externes bloquées dans le banc).

**Limites observées** : erreur `productCommentMandatoryMessage is not defined` du module d'avis natif pendant le parcours produit, non résolue dans cette passe ; requêtes non locales bloquées par le banc. L'achat testé fonctionne malgré cette erreur ; les avis ne sont pas déclarés vérifiés. L'accueil technique de contrôle Presta n'a pas de H1 ; ce test de catalogue ne certifie pas sa qualité SEO. Sur les captures finales, aucun débordement horizontal ni image de catalogue cassée détectés sur les accueils. La fiche, le panier et les textes standard de Classic diffèrent de l'aperçu ; fiscalité et réassurances restent à configurer.

Installation : importer le thème ; si `esstudio` existe déjà, téléverser `import/module-esstudio.zip` et mettre à niveau **sans désinstaller** ; activer le nouveau thème ; importer explicitement le catalogue depuis la configuration du module. Voir le guide pour la séquence complète.

### Shopify

**VÉRIFIÉ LOCALEMENT, PAS INSTALLÉ SUR SHOPIFY** : deux vrais ZIP, produit et service, extraits puis contrôlés par `@shopify/theme-check-node` : **0 erreur, 0 avertissement**. CSV avec trois axes, SKU, stocks connus, SEO et images de variante ; données et fichiers présents. Le helper de correspondance d'URL prépare le CSV hors ligne, sans téléversement réel.

Thème et catalogue sont deux imports distincts. Sans URL publique : téléverser les médias du ZIP dans les fichiers Shopify, puis préparer le CSV avec leurs URL HTTPS. Plus de trois axes ou associations ambiguës sont signalés, sans pertes silencieuses. Aucun import de catalogue, éditeur Shopify, panier ni checkout réel vérifié. Prix absents à compléter avant publication : le CSV ne les invente pas, mais le comportement par défaut de la plateforme peut être zéro. Stocks multi-entrepôts et affectation des gabarits/collections à valider en boutique.

### Wix / Squarespace

**KITS DE REPRISE CONTRÔLÉS**, pas des thèmes installables : pages, médias, polices, CSS/JS de référence, contenus complets, menus, catalogue JSON et CSV lorsqu'applicable. Les empreintes des fichiers médias sont contrôlées. Le projet service garde un catalogue vide et ne reçoit pas de CSV produits. Reconstruction et mappage vers les outils actuels de chaque plateforme restent manuels ; aucune installation ou interaction native vérifiée.

## Commandes et portée réelle des tests

Les journaux et JSON sans données sensibles sont dans [reports/exports-catalogue/2026-10-18](../../reports/exports-catalogue/2026-10-18). Les versions finales des archives et captures sont répertoriées par empreinte ; leurs fichiers restent dans la [Page privée autorisée](https://chatgpt.com/space/page_cc9895b347d88191ae5ab6a308f047b9).

- Suite générale, **une seule exécution** sur `31cd7adc80579ed381d8c916c0cf078d29d34a56` (arbre `320f9fb1e8101c3ab668298a1f8544fb4e95ad27`) : **2005 tests / 265 fichiers, 0 échec**, 829,86 s. Journal conservé ; elle n'est pas présentée comme une suite générale rejouée sur le descendant final.
- Derniers tests ciblés : **66 / 66**, quatre fichiers ; types valides ; build de production sur `3ecdcef` réussi. Aucun déploiement.
- `bash scripts/verify-theme.sh --rapide` : tous les cas produit/service FR/EN échantillonnés et le ZIP client passent. Exécution sur l'état `0e1885c` avec la seule assertion du harnais navigateur modifiée ; pas de changement ultérieur dans les gabarits partagés.

```sh
# PHP disponible pour les contrôles du runtime, données Vitest isolées par vitest.config.ts
PATH=/workspace/work/lot2a/php-native/bin:$PATH npx vitest run \
  tests/cms-catalogue-fiable.test.ts tests/cms-v2.test.ts \
  tests/lot2a-php-export.test.ts tests/lot1-produits-sections.test.ts --maxWorkers=2
npx tsc --noEmit
npm run build
bash scripts/verify-theme.sh --rapide

# Dossier privé effectivement utilisé ; tous les appels fournisseur sont interdits dans le générateur
npx tsx scripts/cms-v2/catalogue-fixtures.ts /workspace/work/exports-cms-private/final-3ecdcef
npx tsx scripts/cms-v2/catalogue-archives-proof.mts /workspace/work/exports-cms-private/final-3ecdcef
python scripts/cms-v2/catalogue-native-bench.py /workspace/work/exports-cms-private/final-3ecdcef products
npx tsx scripts/cms-v2/catalogue-browser-proof.ts /workspace/work/exports-cms-private/final-3ecdcef products
python scripts/cms-v2/catalogue-native-bench.py /workspace/work/exports-cms-private/final-3ecdcef services
npx tsx scripts/cms-v2/catalogue-browser-proof.ts /workspace/work/exports-cms-private/final-3ecdcef services
python scripts/cms-v2/catalogue-receipts.py /workspace/work/exports-cms-private/final-3ecdcef
```

La capture des animations a été corrigée dans le harnais. Les archives finales ont ensuite toutes été régénérées depuis le dernier code et réinstallées ; aucune retouche manuelle des ZIP ni suppression des reçus de contact. Le JSON des reçus indique le total réellement conservé, qui peut inclure les passages précédents. Les scripts de banc refusent les conteneurs non labellisés ; aucune réinitialisation d'un environnement partagé n'a été exécutée.

## Limites et reprise de la vérification

- Bancs jetables sur boucle locale, MariaDB 10.11 dédiée, e-mails neutralisés, navigateur limité à localhost, aucun paiement. Préparation et limites PHP/Docker/langues détaillées dans le guide ; aucun paquet de langue complet ni test bilingue repris ici. Les preuves historiques d'éditeur, de commande ou de bilinguisme du registre ne deviennent pas des vérifications de cette passe.
- Les imports natifs ont réellement été exécutés en CLI avec les API du CMS et les ZIP livrés ; le téléversement et les boutons d'import du back-office n'ont pas été cliqués par le navigateur. La mise à jour du module Presta a utilisé son ZIP livré et sa routine native, par dépôt/extraction de fichiers dans le banc.
- La génération part de deux projets isolés enregistrés puis rechargés ; le téléchargement HTTP depuis une session client réelle du studio n'a pas été rejoué. Aucune nouvelle connexion n'est nécessaire pour continuer les contrôles locaux.
- La sauvegarde JSON conserve les réglages/contenus qui n'ont pas d'équivalent natif ; elle ne signifie pas que tous les blocs d'une fiche du studio sont rendus par Woo/Classic. Les sections spécifiques, SEO produit, extensions tierces, remises/cadeaux au paiement, thèmes/plug-ins supplémentaires et hébergements réels exigent encore leur propre vérification.
- L'import est une mise à jour explicite des champs de la source, pas une fusion automatique avec toutes les retouches faites dans le CMS. Sauvegarder avant import et vérifier le guide ; les prix/photos inconnus et la publication existante sont préservés, mais les champs explicitement fournis sont réappliqués. Le retour complet de version après modifications manuelles concurrentes n'est pas certifié.
- Généralisation : aucune branche métier liée à ORBE, Rive ou à un nom de démonstration. La même chaîne traite plusieurs produits, accessoires, trois axes, un produit ajouté de contrôle à accents proches et une activité de service. Avant une validation plus large, rejouer avec des catalogues nouveaux (vêtements taille/couleur, meubles matière/dimension, prestations sans vente), puis retrait/ajout de variantes, stock inconnu et changements CMS concurrents. Ne pas confondre réussite technique et qualité artistique/commerciale.

Les deux démonstrations visuelles et les 28 autres thèmes restent hors de cette mission. La PR est proposée à vérification, sans fusion.
